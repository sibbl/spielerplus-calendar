# spielerplus-calendar

Scrapes calendar events from [SpielerPlus](https://www.spielerplus.de) and serves them as iCal feeds for subscribing with Google Calendar, Apple Calendar, etc.

## Features

- **Automated scraping** of training sessions, games, and other events from SpielerPlus
- **iCal feed** compatible with Google Calendar, Apple Calendar, Outlook, etc.
- **Filtered endpoints** using regex on title, name, or address
- **Combined filter feeds** by joining filter names with `+` in the URL
- **Synthetic `other` feed** for events unmatched by all configured filters
- **Cron-based scheduling** for periodic data refresh
- **Persistent caching** — stores cache on disk and only updates when data changes
- **Reverse proxy awareness** for public feed URLs behind forwarded host/proto/prefix headers
- **Dual configuration** via `.env` or `config.json`
- **Docker support** with multi-stage Alpine build and Compose setup

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0

### Setup

```bash
bun install
cp .env.example .env
# Edit .env with your SpielerPlus credentials and team ID
```

### Run

```bash
bun run start
```

The server starts on port 3000 (configurable). Subscribe to `http://localhost:3000/calendar.ics` in your calendar app.

### Run Tests

```bash
bun test
```

## Configuration

Configuration can be provided via environment variables (`.env`) or a JSON config file.

### Environment Variables

| Variable               | Required | Default               | Description                             |
| ---------------------- | -------- | --------------------- | --------------------------------------- |
| `SPIELERPLUS_EMAIL`    | Yes      | —                     | SpielerPlus login email                 |
| `SPIELERPLUS_PASSWORD` | Yes      | —                     | SpielerPlus login password              |
| `SPIELERPLUS_TEAM_ID`  | Yes      | —                     | Team/user ID for team selection         |
| `PORT`                 | No       | `3000`                | HTTP server port                        |
| `SCHEDULE_CRON`        | No       | `0 */15 * * * *`      | Cron expression (6-field, with seconds) |
| `CACHE_FILE`           | No       | `./cache/events.json` | File path for persisted cache data      |
| `FILTERS`              | No       | `[]`                  | JSON array of filtered endpoints        |
| `CONFIG_FILE`          | No       | `./config.json`       | Path to JSON config file                |

### JSON Config File

See [config.example.json](config.example.json) for the full schema. Supports all the same options plus filter definitions.

The JSON config also supports:

- `cache.file` — file path for the persisted cache

### Filtered Endpoints

Define additional iCal endpoints that filter events by regex. Each filter can match on:

- `titleRegex` — matches event title
- `nameRegex` — matches title + subtitle combined
- `addressRegex` — matches event address

Example in `.env`:

```bash
FILTERS='[{"path":"/training.ics","titleRegex":"Training"},{"path":"/games.ics","titleRegex":"(?!Training)"}]'
```

Example in `config.json`:

```json
{
  "filters": [
    { "path": "/training.ics", "titleRegex": "Training" },
    { "path": "/games.ics", "titleRegex": "spiel|Volley" }
  ]
}
```

You can combine configured filters directly in the feed URL. For example, if you have `/training.ics` and `/games.ics`, then `/training+games.ics` returns the union of both filters and removes duplicate events that match both.

When at least one custom filter is configured, the server also exposes `/other.ics`. This synthetic feed contains every event that does not match any configured filter. It also appears on the landing page and can be combined with other filters like `/training+other.ics`.

## API Endpoints

| Endpoint                       | Description                                        |
| ------------------------------ | -------------------------------------------------- |
| `GET /`                        | Landing page for composing feed URLs               |
| `GET /health`                  | Health check with last update time and event count |
| `GET /calendar.ics`            | Full iCal calendar feed                            |
| `GET /<filter>.ics`            | Filtered iCal feed (as configured)                 |
| `GET /other.ics`               | Events unmatched by all configured filters         |
| `GET /<filterA>+<filterB>.ics` | Combined iCal feed with duplicate events removed   |

## Reverse Proxy Support

When deployed behind a reverse proxy such as Traefik, the server uses forwarded request headers to generate the public feed URL inside the ICS output and on the landing page.

Supported headers:

- `X-Forwarded-Proto`
- `X-Forwarded-Host`
- `X-Forwarded-Prefix`
- `X-Forwarded-Uri`
- standard `Forwarded`

This allows deployments under a subpath such as `/calendar` while still advertising public URLs like `https://example.com/calendar/training+games.ics`.

## Docker

```bash
docker build -t spielerplus-calendar .
docker run -p 3000:3000 --env-file .env spielerplus-calendar
```

Or with a config file:

```bash
docker run -p 3000:3000 -v ./config.json:/app/config.json spielerplus-calendar
```

## Docker Compose

The repository includes `docker-compose.yml` with:

- `build: .`
- `env_file: .env`
- a named `cache` volume mounted at `/app/cache`

Run it with:

```bash
docker compose up --build -d
```

The cache file defaults to `./cache/events.json` inside the container, which resolves to `/app/cache/events.json` and is persisted through the named volume.

## GitHub Container Registry

The repository includes a GitHub Actions workflow at `.github/workflows/publish-docker.yml`.

It will:

- run `bun test`
- build the Docker image from the repo `Dockerfile`
- publish the image to `ghcr.io/<owner>/<repo>`

It runs on:

- pushes to `main`
- pushes to `master`
- tags starting with `v`
- manual runs via `workflow_dispatch`

Example image names after you push the repository:

- `ghcr.io/<owner>/<repo>:main`
- `ghcr.io/<owner>/<repo>:latest` (default branch only)
- `ghcr.io/<owner>/<repo>:sha-<commit>`
- `ghcr.io/<owner>/<repo>:v1.0.0` (for matching tags)

No extra secret is required for the default setup — the workflow uses GitHub's built-in `GITHUB_TOKEN` with `packages: write` permission.

## How It Works

1. Logs into SpielerPlus with provided credentials
2. Selects the configured team
3. Scrapes the events list page, including pagination (load more)
4. Fetches each event's detail page for address information
5. Persists cache data to disk and serves events as iCal feeds
6. Repeats on a configurable cron schedule

## Finding Your Team ID

After logging in to SpielerPlus, navigate to the team selection page. The team ID is the number in the URL: `https://www.spielerplus.de/site/switch-user?id=YOUR_TEAM_ID`
