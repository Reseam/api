---
title: Configuration
description: Environment variables the API reads at startup.
---

# Configuration

Every setting is an environment variable. Defaults assume the official Reseam deployment.

## Upstream

| Variable | Default | Purpose |
|----------|---------|---------|
| `PATCHES_URL` | `https://git.reseam.app/reseam/patches/releases/download/latest/patches.json` | Where the API fetches the patches index from. |
| `MANAGER_URL` | `https://git.reseam.app/reseam/manager/releases/download/latest/manager.json` | Where the API fetches the manager index from. |
| `PATCHES_BUNDLE_BASE_URL` | `https://git.reseam.app/reseam/patches/releases/download` | Base URL the `/patches/:tag/:name` route redirects to. |
| `MANAGER_BINARY_BASE_URL` | `https://git.reseam.app/reseam/manager/releases/download` | Base URL the `/manager/:tag/:name` route redirects to. |

Point `PATCHES_URL` at a `patches.json` you host. The URLs in that file's `bundle.assets` should reference the API's redirect routes (`https://api.reseam.app/patches/<tag>/<name>`) so end-clients only ever see `*.reseam.app`.

## Server

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `4000` | HTTP port. |
| `ALLOWED_ORIGINS` | `https://reseam.app,https://manager.reseam.app` | Comma-separated CORS allowlist. Set to `*` for public read-only deployments. |
| `CACHE_TTL` | `300` | Seconds to cache upstream responses. Also sent as `Cache-Control: max-age`. |

## Storage

| Variable | Default | Purpose |
|----------|---------|---------|
| `DB_PATH` | `./data/reseam.db` | SQLite database for announcements. |
| `ADMIN_TOKEN` | _(empty)_ | Bearer token for announcement writes. Empty → writes return `503`. |

`ADMIN_TOKEN` is the only secret the API holds. Treat it like a root password. Read-only deploys can leave it empty.

## CACHE_TTL tuning

- **Low (60–120s):** announcements feel live, upstream gets hit more often.
- **Default (300s):** good for the official bundle; new releases show up within 5 minutes.
- **High (3600s):** use when upstream is slow or rate-limited. Clients still see `ETag` so 304s work.

The cache is in-memory and per-process. Restarting the server clears it. If a refresh fails after the TTL expires, the last good copy is served and the next request retries upstream.
