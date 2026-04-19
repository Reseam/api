# Infrastructure

Everything Reseam runs in production. Single source of truth.

## Host

One VPS running [Dokploy](https://dokploy.com/) as the deployment platform. Dokploy clones each service repo, builds its Dockerfile, and runs the container. Auto-deploy is wired through a Forgejo webhook on push to `main`.

- **VPS:** _TODO: provider, region, hostname_
- **Dokploy UI:** _TODO: URL_

## DNS

All records point at the Dokploy host. TLS and reverse proxying go through [Pangolin](https://github.com/fosrl/pangolin) on the shared `pangolin` Docker network.

| Host | Serves |
|------|--------|
| `reseam.app` | Website |
| `api.reseam.app` | API |
| `git.reseam.app` | Forgejo (git, registry, actions) |
| `analytics.reseam.app` | Umami |

## Services

### Website — `reseam/website`

- Dokploy type: **Application** (builds Dockerfile from repo)
- Port: `3000`
- Network: `pangolin`
- Memory: `64M`, CPU: `0.25`
- Build arg: `FORGEJO_TOKEN` (used by `scripts/fetch-docs.ts` to pull doc content from Forgejo at build time)

### API — `reseam/api`

- Dokploy type: **Application** (builds Dockerfile from repo)
- Port: `4000`
- Network: `pangolin`
- Volume: persistent mount at `/data` (SQLite database; lose it and announcements are gone)
- Build arg: `VERSION` (commit SHA; reported by `/v1/health`)
- Env vars:
  - `ADMIN_TOKEN` (secret) — bearer token for announcement writes
  - `DB_PATH=/data/reseam.db`
  - `PATCHES_URL=https://git.reseam.app/reseam/patches/releases/download/latest/patches.json`
  - `MANAGER_URL=https://git.reseam.app/reseam/manager/releases/download/latest/manager.json`
  - `PATCHES_BUNDLE_BASE_URL=https://git.reseam.app/reseam/patches/releases/download`
  - `MANAGER_BINARY_BASE_URL=https://git.reseam.app/reseam/manager/releases/download`
  - `ALLOWED_ORIGINS=https://reseam.app,https://manager.reseam.app`
  - `CACHE_TTL=300`
  - `NODE_ENV=production`

See [`docs/2_config.md`](docs/2_config.md) for what each variable does.

### Forgejo — `git.reseam.app`

Self-hosted Forgejo instance. Hosts every Reseam repo plus the container registry (`git.reseam.app/reseam/*`). Actions runner is available for workflows, though current services (website, API) build on Dokploy instead of pushing images.

- _TODO: where it runs, storage path, backup strategy_

### Umami — `analytics.reseam.app`

Self-hosted [Umami](https://umami.is/) for privacy-respecting analytics. Tag is embedded in the website's `app.html`.

- Website ID: `de564d2b-dcff-4625-9628-07576d09a2c3`
- _TODO: where it runs, database location, backup strategy_

## Secrets

| Name | Where it lives | Used by |
|------|----------------|---------|
| `ADMIN_TOKEN` | Dokploy env on API service | API announcement writes |
| `FORGEJO_TOKEN` | Dokploy build arg on website | Website build-time doc fetcher |

Rotate by updating the value in Dokploy and redeploying. Nothing else on the stack is authenticated.

## Data

- **API SQLite** (`/data/reseam.db`): announcements. Only persistent state on the stack.
- Everything else is either built from the repo or fetched from upstream URLs at runtime and cached in memory.

Back up `/data` from the API container on whatever cadence matches your tolerance for losing announcements. _TODO: backup job._

## Deploy flow

1. Push to `main` on a service repo at `git.reseam.app`.
2. Forgejo fires the Dokploy webhook for that service.
3. Dokploy pulls the latest commit, builds the Dockerfile, and replaces the running container.
4. Pangolin keeps serving traffic on the shared network; downtime is whatever Dokploy's replace takes.

No separate CI step builds or pushes images. The Dockerfile is the deploy artifact.
