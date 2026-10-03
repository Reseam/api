---
title: Configuration
description: The environment variables the API reads.
---

# Configuration

All settings are environment variables, read at startup.

| Variable | Default | |
|---|---|---|
| `PORT` | `4000` | port to listen on |
| `PATCHES_URL` | official `patches.json` on git.reseam.app | the patch index to serve |
| `MANAGER_URL` | official `manager.json` on git.reseam.app | the Reseam Manager index to serve |
| `PATCHES_BUNDLE_BASE_URL` | `https://git.reseam.app/reseam/patches/releases/download` | where `/patches/<tag>/<file>` redirects |
| `MANAGER_BINARY_BASE_URL` | `https://git.reseam.app/reseam/manager/releases/download` | where `/manager/<tag>/<file>` redirects |
| `ADMIN_TOKEN` | empty | token for writing announcements; empty turns writing off |
| `DB_PATH` | `./data/reseam.db` | SQLite database file |
| `CACHE_TTL` | `300` | seconds to cache the indexes |
| `VERSION` | `dev` | version shown by `/` and `/v1/health` |

## Caching

The server keeps each index in memory for `CACHE_TTL` seconds. Requests arriving while it refreshes share one fetch. If a refresh fails, it keeps serving the last good copy.

Release endpoints send `Cache-Control: public, s-maxage=<CACHE_TTL>`, so a CDN in front can cache them too. Announcements send `no-cache`, so they are checked on every request. Both send an `ETag` and answer `304` when nothing changed.

Next: [Endpoints](3_endpoints.md).
