---
title: Configuration
description: The environment variables the API reads.
---

# Configuration

All settings are environment variables, read at startup.

| Variable | Default | |
|---|---|---|
| `PORT` | `4000` | port to listen on |
| `PATCHES_URL` | `https://cdn.reseam.app/patches/patches.json` | the patch index to serve |
| `MANAGER_URL` | `https://cdn.reseam.app/manager/manager.json` | the Reseam Manager index to serve |
| `PATCHES_BUNDLE_BASE_URL` | `https://cdn.reseam.app/patches` | where `/patches/<tag>/<file>` redirects |
| `MANAGER_BINARY_BASE_URL` | `https://cdn.reseam.app/manager` | where `/manager/<tag>/<file>` redirects |
| `ADMIN_TOKEN` | empty | token for writing announcements; empty turns writing off |
| `DB_PATH` | `./data/reseam.db` | SQLite database file |
| `CACHE_TTL` | `60` | seconds to cache the indexes |
| `VERSION` | `dev` | version shown by `/` and `/v1/health` |
| `CLIENT_IP_HEADER` | `cf-connecting-ip` | header carrying the client address from the proxy, for request and vote limits |
| `REQUESTS_SECRET` | empty | key for hashing client addresses; with `TURNSTILE_SECRET`, turns requests on |
| `TURNSTILE_SECRET` | empty | Cloudflare Turnstile secret, checked before a voter token is issued |
| `OPENROUTER_API_KEY` | empty | screens new requests with a decision model; empty posts them unchecked |
| `SCREENING_MODEL` | `~typesafe/jev-latest` | the OpenRouter decision model that screens requests |
| `RELAY_URL` | empty | Reseam Relay to tell about new announcements and requests |
| `RELAY_SECRET` | empty | shared secret that signs those notifications |

## Caching

The server keeps each index in memory for `CACHE_TTL` seconds. Requests arriving while it refreshes share one fetch. If a refresh fails, it keeps serving the last good copy.

Release endpoints send `Cache-Control: public, s-maxage=<CACHE_TTL>, stale-while-revalidate=60`, so a CDN in front can cache them too. Announcements and the request list send `no-cache`, so they are checked on every request. All of them send an `ETag` and answer `304` when nothing changed.

The origin must accept traffic only from the proxy that sets `CLIENT_IP_HEADER`; otherwise a client can forge the header and dodge the limits.

Next: [Endpoints](3_endpoints.md).
