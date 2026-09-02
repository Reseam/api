---
title: Install
description: Run the API locally or with Docker.
---

# Install

## Docker

The shipped `docker-compose.yml` runs the API on port 4000 with a `reseam-data` volume for the SQLite database.

```bash
ADMIN_TOKEN=$(openssl rand -hex 32) docker compose up -d
```

Put `ADMIN_TOKEN` in an `.env` file or pass it inline. Without it, announcement write endpoints return `503`.

Check it's up:

```bash
curl http://localhost:4000/v1/health
```

## Bare bun

For development or deployment without Docker:

```bash
bun install
bun run dev     # watch mode
bun run start   # production
```

The database lives at `./data/reseam.db` by default. Override with `DB_PATH`.

## Migrations

Schema changes go through drizzle-kit:

```bash
bun run db:generate   # regenerate migrations from src/db/schema.ts
bun run db:migrate    # apply pending migrations
```

The server runs pending migrations on boot, so you rarely need `db:migrate` manually.

## Health check

`GET /v1/health` returns `{ ok: true, version }`. Use it for Docker healthchecks and uptime monitors.
