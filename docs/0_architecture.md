---
title: Architecture
description: Where the API sits between bundle authors and clients.
---

# Architecture

```
┌────────────┐    patches.json     ┌─────────────┐     /patches.json      ┌──────────┐
│   Author   │ ──────────────────▶ │  Reseam API │ ─────────────────────▶ │ Manager  │
│ (any host) │                     │  (cache +   │     /v1/patches        │ Website  │
└────────────┘                     │   SQLite)   │     /patches/:tag/:f   └──────────┘
                                   └─────────────┘
                                          │
                                          ▼ SQLite
                                   announcements
```

## Three actors

1. **Author** builds a `.reseam` bundle, signs it, and publishes it to a release host. Publishes a `patches.json` alongside. No server required on the author side.
2. **API** reads that `patches.json` on a schedule, caches it, and serves it back out under `*.reseam.app`. Also serves `manager.json` and stores announcements.
3. **Consumer** — Reseam Manager or the website — reads from the API. For third-party bundles, clients can also read a `patches.json` directly from any URL; the API is an optional convenience for the official bundle.

## Why a proxy at all

Three reasons:

- **Stable URLs.** Bundles move — release hosts change tags, authors rehost, servers go down. The API gives clients a single place to look. If the upstream moves, only the API's config changes.
- **Caching.** The upstream is usually a release asset on a git forge. A thousand phones hitting that at the same minute is rude. The API caches for `CACHE_TTL` seconds (default 5 minutes) and sends proper `ETag` / `Cache-Control` headers.
- **One origin for CORS.** Clients only need to trust `*.reseam.app`.

## Non-goals

- Not a bundle builder. The `reseam` CLI builds bundles.
- Not a patch host. The redirect routes hand off to whoever hosts the release.
- Not a user system. There are no user accounts and no per-client data.
