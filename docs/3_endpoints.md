---
title: Endpoints
description: The HTTP surface the API exposes.
---

# Endpoints

All `GET` responses send `ETag` and `Cache-Control`. Browsers and clients that send `If-None-Match` get a `304`.

## Raw indexes

| Method | Path | Returns |
|--------|------|---------|
| `GET` | `/patches.json` | Verbatim upstream `patches.json`. |
| `GET` | `/manager.json` | Verbatim upstream `manager.json`. |

The byte-for-byte response is important: the bundle signature is computed over the file, so any reformatting would break verification.

## Structured release metadata

| Method | Path | Returns |
|--------|------|---------|
| `GET` | `/v1/patches` | Parsed `patches.json` with typed fields. |
| `GET` | `/v1/manager` | Parsed `manager.json` with typed fields. |

Use these when you want to consume the data; use the raw indexes when you need the signed bytes.

## Asset redirects

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/patches/:tag/:file` | `302` to `PATCHES_BUNDLE_BASE_URL/:tag/:file`. |
| `GET` | `/manager/:tag/:file` | `302` to `MANAGER_BINARY_BASE_URL/:tag/:file`. |

Reseam Manager only ever downloads from `api.reseam.app` URLs. The redirect is where the API hands the client off to the upstream host.

## Announcements

| Method | Path | Auth | Body |
|--------|------|------|------|
| `GET` | `/v1/announcements` | none | List. Filter with `?tag=…&archived=true`. |
| `GET` | `/v1/announcements/:id` | none | One. |
| `POST` | `/v1/announcements` | Bearer | `{ title, content?, tags?, level?, author? }` |
| `PATCH` | `/v1/announcements/:id` | Bearer | Partial update. |
| `DELETE` | `/v1/announcements/:id` | Bearer | Remove. |

See [Announcements](/docs/api/announcements/) for write flows and payload shapes.

## Health

| Method | Path | Returns |
|--------|------|---------|
| `GET` | `/v1/health` | `{ ok: true, version }` |

Does not touch the upstream or the database. Safe for high-frequency polling.

## OpenAPI

`GET /openapi` serves a live OpenAPI document. Disabled in production (`NODE_ENV=production`).
