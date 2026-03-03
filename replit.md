# Creator OS v2 — Intelligence Mode

## Overview
A full-stack content intelligence system for YouTube creators. Syncs channel data, analyzes thumbnails + hooks deterministically, and delivers plain-English action recommendations. No AI/OpenAI — all logic is heuristic-based.

## Architecture
- **Frontend**: React + Vite + Tailwind v4, dark theme, wouter routing, TanStack Query
- **Backend**: Express (TypeScript), served from port 5000
- **Database**: PostgreSQL via Drizzle ORM
- **Image Analysis**: `sharp` for thumbnail metrics (brightness, contrast, entropy, edge density)

## Key Files
- `shared/schema.ts` — Drizzle schema: videos, syncMetadata, executions, feedback, archetypeWeights
- `server/routes.ts` — All API endpoints
- `server/storage.ts` — DatabaseStorage class (IStorage interface)
- `server/engine.ts` — Multi-signal Opportunity Engine (ActionFeed generation)
- `server/youtube.ts` — YouTube Data API v3 integration
- `server/thumbnails.ts` — Thumbnail download + sharp analysis
- `server/hooks.ts` — Deterministic hook scoring (verb density, curiosity words, etc.)
- `server/db.ts` — Database connection pool

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
- `GET /api/content?channelId=` — Get all synced videos
- `POST /api/notes` — Update video context notes
- `POST /api/analyze` — Generate Action Feed
- `POST /api/execute` — Record executed action
- `POST /api/feedback` — Record better/same/worse feedback
- `GET /api/executions?channelId=` — Get execution history
- `GET /api/feedback?channelId=` — Get feedback history

## Intelligence Signals
Per video: performance_ratio, freshness_days, decay_multiplier, repetition/fatigue, novelty, hook_score, thumbnail_score, context flags from notes.

## Learning Loop
Feedback (better/same/worse) adjusts archetype weights (repost/fix/newAngle) stored per channel.

## Dependencies
Key packages: express, drizzle-orm, pg, sharp, zod, zustand, wouter, tanstack/react-query, date-fns, lucide-react

## Data Flow
1. User provides YouTube API Key + Channel ID on Connect page
2. Backend stores API key, fetches videos via YouTube Data API v3
3. Thumbnails downloaded to `data/thumbnails/` and analyzed with sharp
4. Hook text extracted from descriptions, scored deterministically
5. Action Feed generated from multi-signal engine
6. User marks actions done + provides feedback to train weights
