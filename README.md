# HardScope Analytics

A lightweight creator campaign analytics tool that pulls real data from YouTube and Twitch, stores it intelligently, and surfaces it through a clean REST API and dashboard built for brand partnerships teams.

---

## Quick Start (< 5 minutes)

### Prerequisites
- Node.js 22+ and npm (requires `node:sqlite`, built-in since Node 22)
- A free YouTube Data API v3 key ([get one here](https://console.cloud.google.com) — enable "YouTube Data API v3", create an API Key credential)
- Free Twitch app credentials ([get them here](https://dev.twitch.tv/console) — register an app, copy Client ID + Secret)

### 1. Clone and configure

```bash
git clone <your-repo-url>
cd hardscope-analytics

cp .env.example .env
# Edit .env and fill in your three API keys
```

### 2. Start the backend

```bash
cd backend
npm install
npm run dev
# API running at http://localhost:3001
# First ingest starts automatically after 2 seconds
```

### 3. Start the frontend

```bash
# In a new terminal
cd frontend
npm install
npm run dev
# Dashboard at http://localhost:5173
```

That's it. The backend will pull real YouTube + Twitch data on startup and every 6 hours.

---

## Docker (one-command start)

```bash
# Copy and fill in your keys
cp .env.example .env

# Build and run both services
docker compose up --build

# Dashboard: http://localhost
# API:       http://localhost:3001
```

---

## Data Sources

### YouTube Data API v3 (Primary)
- **URL**: `https://www.googleapis.com/youtube/v3/channels`
- **Why**: Free (10,000 units/day), no OAuth required for public channel data, returns subscribers, total views, video count, thumbnails, and custom URLs in a single request. Can batch up to 50 channel IDs per call.
- **What we pull**: Subscriber count, view count, video count, channel description, thumbnails, country.

### Twitch Helix API (Secondary)
- **URL**: `https://api.twitch.tv/helix/`
- **Why**: Free with app credentials (no user auth), provides follower counts, total view history, live status, and current game category. App tokens refresh automatically.
- **What we pull**: Follower count (via `/channels/followers`), total views, profile image, live status + game name.

Both sources are **normalized into a single schema** — one `creators` table and one `creator_snapshots` time-series table — so the API and dashboard are platform-agnostic.

---

## Tech Stack & Why

| Layer | Choice | Reason |
|---|---|---|
| Backend | Node.js + TypeScript + Express | Single language across stack, TypeScript catches schema mismatches at compile time, Express is minimal and well-understood |
| Database | SQLite (node:sqlite, built-in) | Zero setup, file-based, synchronous driver = simple transaction model, WAL mode handles concurrent reads fine at this scale. Uses Node 22's built-in `node:sqlite` — no native compilation, no gyp, works anywhere Node 22+ runs. |
| Scheduler | node-cron | Lightweight, no external queue needed, schedule configurable via env var |
| Frontend | React + TypeScript + Vite | Vite's dev proxy eliminates CORS issues locally, TypeScript ensures API contract is respected in UI components |
| Charts | Recharts | React-native, composable, works without a canvas polyfill |
| Container | Docker + docker-compose | Teammate can run the entire stack with one command regardless of local Node version |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend (Vite)                │
│  React + TypeScript + Recharts                  │
│  Proxy: /api/* → localhost:3001                 │
└─────────────────────┬───────────────────────────┘
                      │ REST
┌─────────────────────▼───────────────────────────┐
│              Backend (Express + TS)              │
│                                                  │
│  Routes:                                         │
│  GET /api/creators          ← filtered list      │
│  GET /api/analytics/summary ← KPI cards          │
│  GET /api/analytics/top-performers               │
│  GET /api/analytics/platform-breakdown           │
│  GET /api/analytics/trends  ← line chart data   │
│  GET /api/campaigns                              │
│  GET /api/alerts            ← unresolved flags   │
│  PATCH /api/alerts/:id/resolve                   │
│  POST /api/ingest/trigger   ← manual pull        │
│                                                  │
│  Scheduler (node-cron every 6h):                 │
│    YouTube ingest → normalize → upsert           │
│    Twitch ingest  → normalize → upsert           │
│    Alert generation (SQL-based)                  │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│              SQLite (node:sqlite built-in)        │
│                                                  │
│  creators           — normalized across platforms│
│  creator_snapshots  — time-series (every 6h)    │
│  campaigns          — brand context             │
│  campaign_creators  — spend/impressions/conv    │
│  alerts             — auto-generated flags      │
└─────────────────────────────────────────────────┘
```

### Key design decisions

**SQLite over Postgres**: For a single-server analytics tool tracking ~50 creators at 6-hour intervals, SQLite is the right fit. Using Node 22's built-in `node:sqlite` module eliminates native compilation entirely (no gyp, no platform-specific binaries). WAL journal mode handles concurrent API reads cleanly, and the file can be trivially backed up or exported. If this scaled to 50,000 creators or multi-server deployment, I'd migrate to Postgres — the schema is designed for that transition (no SQLite-specific types).

**Snapshot table for time-series**: Rather than mutating a single row per creator, each ingest appends a `creator_snapshots` row. This enables trend charts and engagement drop detection via SQL aggregation without a separate time-series store.

**Engagement rate as a proxy**: YouTube doesn't expose per-video likes/comments in the free channels endpoint without costly quota. So I compute `avg_views_per_video / followers` as a proxy. It's a view-to-follower ratio — not true engagement — but it's a directionally meaningful signal for brand partnerships use and is clearly labeled in the UI.

**Both sources in parallel**: `runIngest()` fires `fetchYouTubeCreators()` and `fetchTwitchCreators()` with `Promise.all`. If one source is down, the other still completes; errors are caught per-source, logged, and never crash the scheduler.

**Alert deduplication**: Alerts are not re-inserted if an identical unresolved alert for the same creator/campaign was created in the last 24 hours. This prevents spam from the 6-hour scheduler.

---

## API Reference

### `GET /api/creators`
Returns paginated creator list with latest snapshot data.

**Query params:**
| Param | Type | Description |
|---|---|---|
| `platform` | `youtube\|twitch` | Filter by platform |
| `minFollowers` | number | Minimum follower count |
| `maxFollowers` | number | Maximum follower count |
| `minEngagement` | number | Min engagement rate (0–1) |
| `sortBy` | `followers\|engagement_rate\|total_views\|display_name` | Sort field |
| `order` | `asc\|desc` | Sort direction |
| `limit` | number | Results per page (max 200, default 50) |
| `offset` | number | Pagination offset |

### `GET /api/analytics/summary`
Overall KPIs: total creators, avg engagement rate, platform breakdown, campaign stats, live count.

### `GET /api/analytics/top-performers`
Top N creators by a given metric.

**Query params:** `platform`, `metric` (`followers|engagement_rate|total_views`), `limit`

### `GET /api/analytics/trends`
Daily aggregated engagement rate and follower counts for trend charts.

**Query params:** `days` (default 30, max 365), `platform`

### `GET /api/campaigns`
All campaigns with aggregated performance metrics (spend, impressions, clicks, conversions).

### `GET /api/alerts`
Unresolved alerts. Alert types: `engagement_drop`, `zero_conversions`, `high_spend_low_roi`.

### `POST /api/ingest/trigger`
Manually trigger a data pull. Returns `{ success, result: { youtube, twitch, errors } }`.

### `PATCH /api/alerts/:id/resolve`
Mark an alert as resolved.

---

## Running Tests

```bash
cd backend
npm test
```

Tests cover:
- `computeEngagementRate` — edge cases (zero followers, zero videos, null, cap at 1.0)
- `safeInt` — null, undefined, non-numeric, float truncation
- All API endpoints — 200 responses, filter behavior, 404 handling, pagination limits

---

## What I'd Build With Another Week

1. **Real campaign ingestion** — connect to a media buying platform (e.g., AspireIQ, Grin) or let brand managers upload CSVs with actual spend/conversion data rather than seeded samples.

2. **Creator search by topic** — use YouTube's `search.list` endpoint (more quota-intensive) to discover creators in a given category, not just a hardcoded list.

3. **Email/Slack alerting** — when an engagement drop alert fires, send a Slack webhook or SendGrid email to the partnerships team instead of just flagging in the UI.

4. **Historical export** — CSV/JSON export endpoint for any filtered creator set, so brand managers can pull data into their existing reporting tools.

5. **Postgres + Redis** — migrate to Postgres for multi-server scale and add a Redis cache in front of the analytics endpoints (summary/top-performers) to reduce DB load.

6. **Auth layer** — JWT-based auth so this can be safely deployed as a shared team tool rather than a local dev server.
