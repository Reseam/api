---
title: Architecture
description: Where the API sits between the official bundle and clients.
---

# Architecture

![Architecture diagram: the Reseam API fetches and caches one configured patches.json from reseam/patches, serves /v1/patches and /patches/:tag/:file to Manager and Website, and stores announcements in SQLite. Third-party bundles bypass the API; the manager reads their patches.json URLs directly.](architecture.svg)

## Scope

The Reseam API is a single-bundle proxy. One instance fronts one bundle, the official one configured via `PATCHES_URL`. Third-party bundles do not go through it. The manager reads their `patches.json` URLs directly.

## Three actors

1. **Upstream.** The `reseam/patches` repo publishes a signed `.reseam` archive and a `patches.json` alongside it. This is the one source the API is pointed at.
2. **API.** Fetches that `patches.json` on demand, caches it, and serves stable endpoints under `*.reseam.app`. Also serves `manager.json` and stores announcements.
3. **Consumers.** The website reads from the API for the official bundle. Reseam Manager does the same, and also reads third-party `patches.json` URLs directly.

## What the API adds

- **Stable URLs.** Bundles move. Release hosts change tags, authors rehost, servers go down. The API gives clients a single place to look. If the upstream moves, only the API's config changes.
- **Caching.** The upstream is usually a release asset on a git forge. A thousand phones hitting that at the same minute is rude. The API caches for `CACHE_TTL` seconds (default 5 minutes) and sends proper `ETag` and `Cache-Control` headers.
- **One origin for CORS.** Clients only need to trust `*.reseam.app`.

## Non-goals

- Not a bundle builder. The `reseam` CLI builds bundles.
- Not a patch host. The redirect routes hand off to whoever hosts the release.
- Not a user system. There are no user accounts and no per-client data.
