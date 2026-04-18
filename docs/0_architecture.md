---
title: Architecture
description: Where the API sits between the official bundle and clients.
---

# Architecture

![Architecture diagram: the Reseam API fetches and caches one configured patches.json from reseam/patches, serves /v1/patches and /patches/:tag/:file to Reseam Manager and the website, and stores announcements in SQLite. Third-party bundles bypass the API; Reseam Manager reads their patches.json URLs directly.](architecture.svg)

One API instance fronts one bundle, the official one configured via `PATCHES_URL`. It fetches `patches.json` and `manager.json` from their upstream URLs, caches them in memory, and serves them back under `*.reseam.app` with stable paths. Release assets load through redirect routes. Announcements live in a local SQLite database.

Third-party bundles are not proxied. Reseam Manager reads their `patches.json` URLs directly.
