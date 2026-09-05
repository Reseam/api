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

The file is passed through unchanged, so what a client fetches here is exactly what the author published.

## Structured release metadata

`/v1/patches` and `/v1/manager` share the same shape, served by the same handler. The path in the table below uses `<source>` as a placeholder; substitute `patches` or `manager`.

| Method | Path | Returns |
|--------|------|---------|
| `GET` | `/v1/<source>` | `{ bundle, release }` for the latest stable release. `404` if there is no stable release. |
| `GET` | `/v1/<source>/prerelease` | `{ bundle, release }` for the latest prerelease. `404` if none. |
| `GET` | `/v1/<source>/version` | `{ version }` for the latest stable release. `404` if none. |
| `GET` | `/v1/<source>/history` | `{ bundle, releases }` filtered to stable releases only. |

Patches-only endpoints, layered on top:

| Method | Path | Returns |
|--------|------|---------|
| `GET` | `/v1/patches/version/prerelease` | `{ version }` for the latest prerelease. `404` if none. |
| `GET` | `/v1/patches/history/prerelease` | `{ bundle, releases }` for the full release list (stable and prerelease). |
| `GET` | `/v1/patches/keys` | `{ public_key }` for the bundle. `404` if the index does not include a public key. |

`bundle` is the upstream `bundle` block. `release` is one entry from the upstream `releases` array. Use the structured endpoints when you want typed data; use the raw indexes when you need the signed bytes.

## Asset redirects

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/patches/:tag/:name` | `302` to `${PATCHES_BUNDLE_BASE_URL}/:tag/:name`. |
| `GET` | `/manager/:tag/:name` | `302` to `${MANAGER_BINARY_BASE_URL}/:tag/:name`. |

`:tag` and `:name` accept `[A-Za-z0-9._+-]` only; anything else returns `400`. Reseam Manager only ever downloads from `api.reseam.app` URLs, so the redirect is where the API hands the client off to the upstream host.

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

## OpenAPI

`GET /openapi` serves a live OpenAPI document.

## Error envelope

All non-`2xx` responses return `{ "error": "<message>" }`. Common codes:

| Status | Cause |
|--------|-------|
| `400` | Validation failure on a path parameter, query, or request body. The message names the field. |
| `401` | Announcement write without a valid bearer token. |
| `404` | Resource missing (no stable release, no prerelease, no announcement, no public key). |
| `502` | Upstream `patches.json` or `manager.json` failed to fetch or did not match the schema, and no earlier copy is cached. |
| `503` | Announcement write attempted with `ADMIN_TOKEN` empty. |
