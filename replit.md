# Creator OS v2 — Intelligence Mode

## Overview
A full-stack content intelligence system for YouTube creators. Syncs channel data, analyzes thumbnails + hooks deterministically, classifies every video, generates per-video plans, and delivers plain-English action recommendations with explainable scores. No AI/OpenAI — all logic is deterministic/heuristic.

## Architecture
- **Frontend**: React + Vite + Tailwind v4, dark theme, wouter routing, TanStack Query
- **Backend**: Express (TypeScript), served from port 5000
- **Database**: PostgreSQL via Drizzle ORM
- **Image Analysis**: `sharp` for thumbnail metrics (brightness, contrast, entropy, edge density)

## Key Files
- `shared/schema.ts` — Drizzle schema: videos (with analysis fields), syncMetadata, executions, feedback, archetypeWeights
- `server/routes.ts` — All API endpoints + legacy format shim for dashboard compatibility
- `server/storage.ts` — DatabaseStorage class (IStorage interface)
- `server/engine.ts` — Explainable Opportunity Engine: winner model, 5-class classification, per-video plans, 7-signal scoring
- `server/youtube.ts` — YouTube Data API v3 integration
- `server/thumbnails.ts` — Thumbnail download + sharp analysis
- `server/hooks.ts` — Deterministic hook scoring (verb density, curiosity words, etc.)
- `server/db.ts` — Database connection pool

## Opportunity Engine (server/engine.ts)
### Classification System
Every video is classified into one of 5 classes:
- **Evergreen Winner**: Top 20% by views_ratio, >30 days old, not time-sensitive
- **Repost Candidate**: Above-average performance, >14 days old
- **Retry (Second Shot)**: Below-average, <60 days old, fixable issues identified
- **Restructure**: Below-average, structural mismatch vs winners (wrong theme/format/thumbnail)
- **Archive**: Time-sensitive content outside anniversary window

### Winner Model
- Computes top-20% threshold from views_ratio distribution
- Extracts common keywords, themes, formats from winners
- Uses winner features to inform Restructure recommendations

### Opportunity Score (0-100) — 7 signals:
| Signal | Max Points | What it measures |
|---|---|---|
| viewsRatioScore | 30 | views / channel_average |
| decayScore | 20 | Time bucket (0-7d=0.2, 8-30=0.5, 31-90=0.8, 90+=1.0) |
| noveltyScore | 10 | Uncommon theme/format combo |
| thumbnailQualityScore | 15 | Sharp pixel analysis (brightness/contrast/entropy/edges) |
| hookQualityScore | 10 | Description text analysis |
| repetitionPenalty | -15 | Same theme/recently actioned |
| timeSensitivePenalty | -10 | Event/holiday content flag |

### Per-Video Plans
Each class generates a tailored plan:
- **Repost**: schedule slots (7 days), 3 hook variants, caption starter, 3 CTA variants, hashtag pack
- **Retry**: specific changes (hook rewrite, thumbnail redesign, pacing), plus schedule
- **Evergreen Winner**: repost cadence, repurpose plan (clips/carousel/sequel), 2 sequel ideas
- **Restructure**: mismatch analysis vs winners, new framing suggestion, structural changes
- **Archive**: reason explanation, pattern extraction if high-performing

### Time-Sensitive Detection
Keywords in notes or title: memorial, holiday, event, news, vacation, died, anniversary, christmas, etc.
Anniversary window check prevents archiving content near its original publication month.

### Hook Templates (deterministic)
5 template types keyed to title keywords:
- result-first, mistake, contrarian, tool-reveal, curiosity

## Frontend Pages
- `/` — Brief (Action Feed) — main intelligence dashboard
- `/connect` — YouTube API setup wizard
- `/library` — Video library with filters, notes, scores
- `/playbooks` — Static best-practice templates
- `/settings` — System status and privacy info

## API Endpoints
- `GET /api/status?channelId=` — Connection/sync status
- `POST /api/connect/youtube` — Test + store API key
- `POST /api/sync/youtube` — Fetch latest 50 videos, trigger analysis
- `GET /api/content?channelId=` — Get all synced videos (with analysis fields)
- `POST /api/notes` — Update video context notes
- `POST /api/analyze` — Returns: opportunities[] for all videos, next_7_days plan, warnings, momentum, legacy items[]
- `POST /api/execute` — Record executed action + update lastRecommendedAt
- `POST /api/feedback` — Record better/same/worse feedback
- `GET /api/executions?channelId=` — Get execution history
- `GET /api/feedback?channelId=` — Get feedback history

## Persisted Analysis Fields (per video)
viewsRatio, freshnessDays, decayBucket, titleKeywords[], similarityGroup, timeSensitive, classLabel, confidence, reasons[], plan (JSON), opportunityScore, scoreBreakdown (JSON), lastRecommendedAt

## Learning Loop
Feedback (better/same/worse) adjusts archetype weights (repost/fix/newAngle) stored per channel.

## Dependencies
Key packages: express, drizzle-orm, pg, sharp, zod, zustand, wouter, tanstack/react-query, date-fns, lucide-react

## Data Flow
1. User provides YouTube API Key + Channel ID on Connect page
2. Backend stores API key, fetches videos via YouTube Data API v3
3. Thumbnails downloaded to `data/thumbnails/` and analyzed with sharp
4. Hook text extracted from descriptions, scored deterministically
5. Full analysis runs: winner model → classification → plan generation → score computation
6. Analysis results persisted per-video in database
7. Dashboard shows top opportunities with legacy-compatible card format
8. User marks actions done + provides feedback to train weights
