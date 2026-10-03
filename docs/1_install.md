---
title: Install
description: Run your own instance with Docker or Bun.
---

# Install

## Docker

The repository's `docker-compose.yml` builds the image and runs it on port 4000, with the database in a `reseam-data` volume:

```bash
ADMIN_TOKEN=$(openssl rand -hex 32) docker compose up -d --build
curl http://localhost:4000/v1/health
```

Keep the `ADMIN_TOKEN` value: you need it to post announcements. Set the other [configuration](2_config.md) in the compose file or an `.env` file.

## Bun

```bash
bun install
bun run dev     # restarts on changes
bun run start   # production
```

The database is created at `./data/reseam.db`, and its migrations run on startup.

## Health

`GET /v1/health` returns `{ "ok": true, "version": "..." }`. It shows the server is up; it doesn't check the database or the upstream files.

Next: [Configuration](2_config.md).
