# Creator OS v2 — Intelligence Mode

## Overview
A full-stack content intelligence system for YouTube creators (with TikTok/Instagram CSV import). Syncs channel data, analyzes thumbnails + hooks deterministically, classifies every video into 6 classes, generates per-video plans with nextAction + diagnosis, and delivers plain-English action recommendations with explainable scores and adaptive scoring weights. No AI/OpenAI — all logic is deterministic/heuristic.

## Architecture
- **Frontend**: React + Vite + Tailwind v4, dark theme, wouter routing, TanStack Query
- **Backend**: Express (TypeScript), served from port 5000
- **Database**: PostgreSQL via Drizzle ORM
- **Image Analysis**: `sharp` for thumbnail metrics (brightness, contrast, entropy, edge density)

## Key Files
- `shared/schema.ts` — Drizzle schema: videos (with analysis fields + platform + transcript + userTags + nextAction), syncMetadata (with scoringWeights), executions (with actualViews/Likes/Comments/Shares + predictedLift + performanceRecordedAt), feedback, archetypeWeights
- `server/routes.ts` — All API endpoints (clean AnalysisResult, CSV import, transcript stats, performance recording)
- `server/storage.ts` — DatabaseStorage class (IStorage interface) with updateExecutionPerformance
- `server/engine.ts` — Explainable Opportunity Engine: winner model, 6-class classification, per-video plans with nextAction + diagnosis, 7-signal scoring with adaptive weights, posting time inference, seasonality detection
- `server/youtube.ts` — YouTube Data API v3 integration
- `server/thumbnails.ts` — Thumbnail download + sharp analysis
- `server/hooks.ts` — Deterministic hook scoring (verb density, curiosity words, etc.)
- `server/transcripts.ts` — YouTube auto-caption transcript fetching
- `server/db.ts` — Database connection pool

## Opportunity Engine (server/engine.ts)
### 6-Class Classification System
Every video is classified into one of 6 classes:
- **Evergreen**: Top 20% by views_ratio, >30 days old, not time-sensitive — proven content for repost/repurpose
- **Retry-Hook**: Below-average views but fixable hook issues, <60 days old — rewrite hook and retry
- **Retry-Timing**: Above-average potential, posted at wrong time — repost at peak time
- **Seasonal**: Time-sensitive content currently out of season — archived until season returns
- **Event-Based**: Tied to specific events that have passed — archived until anniversary window
- **Archive**: Consistently underperformed or too old for retry — extract lessons and move on

### Per-Video nextAction + diagnosis
Each classified video gets:
- `nextAction`: Plain-language instruction (e.g., "Repost this with fresh packaging")
- `diagnosis`: Plain-language explanation of why it got this classification

### Adaptive Scoring Weights (ScoringWeights)
- Interface: `{ hook_weight, timing_weight, thumbnail_weight, novelty_weight, views_weight }`
- Stored in `syncMetadata.scoringWeights`
- `computeAdaptiveScoringWeights()` adjusts based on actual performance deltas from executions
- Weights auto-tune when users record actual performance after posting

### Winner Model
- Computes top-20% threshold from views_ratio distribution
- Extracts common keywords, themes, formats from winners
- Uses winner features to inform Retry/Archive recommendations

### Posting Time Inference
- Analyzes publishedAt timestamps of top performers
- If 5+ winners, uses their publish hour distribution (top 3 hours)
- Otherwise falls back to heuristic defaults (1PM, 9PM, 11PM)

### Seasonality Detection
- Groups winners by publication month
- Flags seasonal peaks (3+ winners in same month)
- Detects anniversary replay opportunities (winners published in current month ±1)
- Returns `seasonalInsights` array in AnalysisResult

### Transcript-Aware Hook Scoring
- If transcript available (transcriptStatus='ready'), uses first 40 words for hook scoring
- Falls back to description text otherwise
- Produces more accurate hook quality scores

### Opportunity Score (0-100) — 7 signals:
| Signal | Max Points | What it measures |
|---|---|---|
| viewsRatioScore | 30 | views / channel_average |
| decayScore | 20 | Time bucket (0-7d=0.2, 8-30=0.5, 31-90=0.8, 90+=1.0) |
| noveltyScore | 10 | Uncommon theme/format combo |
| thumbnailQualityScore | 15 | Sharp pixel analysis (brightness/contrast/entropy/edges) |
| hookQualityScore | 10 | Description/transcript text analysis |
| repetitionPenalty | -15 | Same theme/recently actioned |
| timeSensitivePenalty | -10 | Event/holiday content flag |

### Per-Video Plans
Each class generates a tailored plan:
- **Evergreen**: repost cadence, repurpose plan (clips/carousel/sequel), 2 sequel ideas
- **Retry-Hook**: specific hook changes, new variants, plus schedule
- **Retry-Timing**: optimal time slots, same content with better timing
- **Seasonal**: flagged for resurface when season approaches
- **Event-Based**: held until anniversary window or next event cycle
- **Archive**: reason explanation, pattern extraction if high-performing

### Time-Sensitive Detection
Keywords in notes or title: memorial, holiday, event, news, vacation, died, anniversary, christmas, etc.
Anniversary window check prevents archiving content near its original publication month.

### Hook Templates (deterministic)
5 template types keyed to title keywords:
- result-first, mistake, contrarian, tool-reveal, curiosity

## Frontend Pages
- `/` — Today (execution coach: "Today's Moves" full-width priority blocks + "This Week's Plan" vertical stacked calendar + "Evergreen Money Makers" section)
- `/connect` — YouTube API setup (with connected/not-connected status) + TikTok/Instagram CSV import (with platform clarity labels) + Transcript Intelligence banner
- `/library` — Video inventory with 6-class filter chips, platform filter, sorting, nextAction card, user tags editor, transcript status, analysis drawer
- `/playbooks` — Static best-practice templates
- `/settings` — System status and privacy info

## API Endpoints
- `GET /api/status?channelId=` — Connection/sync status
- `POST /api/connect/youtube` — Test + store API key
- `POST /api/sync/youtube` — Fetch latest 50 videos, trigger analysis + transcripts
- `GET /api/content?channelId=` — Get all synced videos (with analysis fields)
- `POST /api/notes` — Update video context notes
- `POST /api/analyze` — Returns clean AnalysisResult: opportunities[], next7DaysPlan, warnings, channelHealth, seasonalInsights, evergreenCount
- `POST /api/execute` — Record executed action + update lastRecommendedAt + store predictedLift
- `POST /api/feedback` — Record better/same/worse feedback
- `GET /api/executions?channelId=` — Get execution history
- `GET /api/feedback?channelId=` — Get feedback history
- `POST /api/import/csv` — Import TikTok/Instagram CSV (multipart form: file + platform + channelId)
- `GET /api/transcript-stats?channelId=` — Transcript processing status counts
- `POST /api/execution/performance` — Record actual views/likes/comments/shares for an execution
- `POST /api/video/tags` — Set user-defined tags for a video

## Performance Feedback Loop
1. User marks action as Done → `predictedLift` stored (viewCount × opportunityScore/50)
2. User records actual metrics via performance dialog → POST /api/execution/performance
3. On next analysis, `computeAdaptiveScoringWeights()` compares predicted vs actual
4. Scoring weights auto-adjust to improve future recommendations

## Persisted Analysis Fields (per video)
viewsRatio, freshnessDays, decayBucket, titleKeywords[], similarityGroup, timeSensitive, classLabel, confidence, reasons[], plan (JSON), opportunityScore, scoreBreakdown (JSON), lastRecommendedAt, platform, transcript, transcriptStatus, userTags[], nextAction

## Multi-Platform Support
- `platform` field: 'youtube' (default), 'tiktok', 'instagram'
- YouTube: synced via API, transcripts fetched automatically
- TikTok/Instagram: imported via CSV upload on Connect page
- Synthetic IDs: `tk_<hash>` for TikTok, `ig_<hash>` for Instagram

## Channel Health (replaces Momentum)
- `channelHealth`: { score, trend, label, details }
- Compares recent 5 videos average vs historical average
- Labels: "Strong", "Growing", "Stable", "Needs Attention"

## Learning Loop
- Feedback (better/same/worse) adjusts archetype weights (repost/fix/newAngle) stored per channel
- Performance recording adjusts adaptive scoring weights per channel

## Dependencies
Key packages: express, drizzle-orm, pg, sharp, zod, zustand, wouter, tanstack/react-query, date-fns, lucide-react, csv-parse, multer, @radix-ui/react-collapsible

## Data Flow
1. User provides YouTube API Key + Channel ID on Connect page (or imports TikTok/IG CSV)
2. Backend stores API key, fetches videos via YouTube Data API v3
3. Thumbnails downloaded to `data/thumbnails/` and analyzed with sharp
4. Transcripts fetched in background for YouTube videos (auto-captions)
5. Hook text extracted from transcripts (preferred) or descriptions, scored deterministically
6. Full analysis runs: winner model → 6-class classification → plan generation → score computation → seasonality
7. Analysis results persisted per-video in database (including nextAction, diagnosis)
8. Today page shows "Today's Moves" (full-width priority blocks) + "This Week's Plan" (vertical calendar) + "Evergreen Money Makers"
9. Library shows full inventory with 6-class filter chips, sorting, user tags, and analysis drawer
10. User marks actions done + provides feedback + records actual performance to train weights
