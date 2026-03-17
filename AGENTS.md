# AGENTS.md

## Project Overview

**spielerplus-calendar** scrapes events from SpielerPlus (a German sports team management platform) and serves them as iCal feeds.

## Tech Stack

- **Runtime**: Bun (TypeScript)
- **HTML Parsing**: Cheerio
- **iCal Generation**: ical-generator
- **Scheduling**: cron
- **Testing**: bun:test

## Architecture

```text
index.ts              → Entry point: loads config, starts server + scheduler
src/config.ts         → Configuration loading (.env + JSON)
src/scraper.ts        → HTTP-based scraper (login, parse events, fetch addresses)
src/ical.ts           → iCal feed generation from CalendarEvent[]
src/cache.ts          → Persistent event cache with disk-backed change detection
src/scheduler.ts      → Cron-based scrape scheduling
src/server.ts         → Bun.serve HTTP server with iCal endpoints
src/types.ts          → CalendarEvent type definition
tests/                → Unit tests with mocked/obfuscated data
```

## Key Patterns

- **No browser automation at runtime** — uses HTTP requests with cookie management for scraping
- **CSRF-aware login** — fetches CSRF token from login page before POST
- **Pagination** — loads all events via `/events/ajaxgetevents` AJAX endpoint
- **Address fetching** — visits each event's detail page to extract address
- **Persistent cache file** — loads/saves cache from a configurable JSON file path
- **Year rollover** — handles events spanning year boundaries (month 12 → 1)

## Configuration

Dual config: environment variables (`.env`) take precedence over `config.json`.

Required: `SPIELERPLUS_EMAIL`, `SPIELERPLUS_PASSWORD`, `SPIELERPLUS_TEAM_ID`

Optional: `CACHE_FILE` for persisted cache storage (defaults to `./cache/events.json`)

## Testing

```bash
bun test
```

All test data uses fictional/obfuscated names and addresses. No real team data in tests.

## Building

```bash
docker build -t spielerplus-calendar .
docker compose up --build -d
```

CI publishes the Docker image to `ghcr.io/<owner>/<repo>` via `.github/workflows/publish-docker.yml` on pushes to `main`/`master`, `v*` tags, and manual dispatch.

## Conventions

- All credentials via environment variables or config file — never hardcoded
- Tests use mocked HTTP responses, no real network calls
- Event parsing is separated from HTTP fetching for testability
