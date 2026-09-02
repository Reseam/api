# Reseam API

Distribution metadata server for [Reseam](reseam.app) — a Rust APK patching engine.

Authors publish signed `.reseam` bundles and host a `patches.json` at a stable URL. This API reads that file (and a `manager.json` for manager binaries), caches it, and exposes it back out at `/patches.json` + `/manager.json` plus structured `/v1` JSON endpoints. `/patches/<tag>/<name>` and `/manager/<tag>/<name>` 302-redirect to the upstream asset so clients only ever see `*.reseam.app` URLs. The manager and website are the consumers.

One instance fronts one bundle. Run multiple instances for multiple bundles. Signature verification happens in consumers — the API serves the public key but doesn't check signatures itself. The API holds a single secret: the admin token for announcement writes. Everything else is cached reads of upstream JSON.

Announcements are stored in SQLite behind bearer-authed write endpoints.

## Running

```bash
bun install
bun run dev          # dev server with watch
bun test             # run tests
bun run typecheck    # tsc --noEmit
bun run db:generate  # generate migration from schema changes
bun run start        # production server
```

### Docker

```bash
docker compose up -d
```

## Config

| Var                        | Default                                                                    |
| -------------------------- | -------------------------------------------------------------------------- |
| `PORT`                     | `4000`                                                                     |
| `PATCHES_URL`              | `https://git.reseam.app/reseam/patches/releases/download/latest/patches.json` |
| `MANAGER_URL`              | `https://git.reseam.app/reseam/manager/releases/download/latest/manager.json` |
| `PATCHES_BUNDLE_BASE_URL`  | `https://git.reseam.app/reseam/patches/releases/download`                  |
| `MANAGER_BINARY_BASE_URL`  | `https://git.reseam.app/reseam/manager/releases/download`                  |
| `ADMIN_TOKEN`              | empty — announcement writes return 503                                     |
| `DB_PATH`                  | `./data/reseam.db`                                                         |
| `CACHE_TTL`                | `300`                                                                      |
| `ALLOWED_ORIGINS`          | `https://reseam.app,https://manager.reseam.app`                            |

`PATCHES_URL` / `MANAGER_URL` are the upstream release-asset URLs the API fetches from. `PATCHES_BUNDLE_BASE_URL` / `MANAGER_BINARY_BASE_URL` are where `/patches/<tag>/<name>` and `/manager/<tag>/<name>` redirect to — bundles in `patches.json` should point at the API's redirect routes so end-clients only see `*.reseam.app`.

Announcement writes require `Authorization: Bearer <ADMIN_TOKEN>`.

All GET responses include `Cache-Control` and `ETag` headers. OpenAPI docs at `/openapi`.

## Stack

Bun, Elysia, drizzle-orm on SQLite.
