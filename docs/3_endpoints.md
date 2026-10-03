---
title: Endpoints
description: Every route the API serves.
---

# Endpoints

Every route allows requests from any origin. Errors are JSON: `{ "error": "message" }`.

## Releases

`<index>` is `patches` or `manager`.

| Route | Returns |
|---|---|
| `GET /<index>.json` | the whole index |
| `GET /v1/<index>` | `{ bundle, release }`: the latest stable release |
| `GET /v1/<index>/prerelease` | `{ bundle, release }`: the latest prerelease |
| `GET /v1/<index>/version` | `{ version }` of the latest stable release |
| `GET /v1/<index>/history` | `{ bundle, releases }`: every stable release |
| `GET /v1/patches/version/prerelease` | `{ version }` of the latest prerelease |
| `GET /v1/patches/history/prerelease` | `{ bundle, releases }`: every release, prereleases included |
| `GET /v1/patches/keys` | `{ public_key }` of the bundle signer |

"Latest" means the first matching entry in the index's `releases` list; `reseam publish` writes the newest first. These return `404` when no release matches.

A `release` has `version`, `created_at`, `description`, `download_url`, `prerelease`, and, for patches, `patches`: every patch's name, description, apps, dependencies, and options. `bundle` has `name`, `author`, `description`, `homepage`, and `public_key`.

## Downloads

| Route | |
|---|---|
| `GET /patches/<tag>/<file>` | `302` to `PATCHES_BUNDLE_BASE_URL/<tag>/<file>` |
| `GET /manager/<tag>/<file>` | `302` to `MANAGER_BINARY_BASE_URL/<tag>/<file>` |

`<tag>` and `<file>` may contain letters, digits, `.`, `_`, `-`, and `+` (not first). Anything else returns `400`.

## Announcements

| Route | |
|---|---|
| `GET /v1/announcements` | live announcements, newest first; `?archived=true` includes archived ones, `?tag=<tag>` filters |
| `GET /v1/announcements/<id>` | one announcement |
| `POST`, `PATCH`, `DELETE` | see [Announcements](4_announcements.md) |

## Other

| Route | |
|---|---|
| `GET /` | the server's name, version, and main routes |
| `GET /v1/health` | `{ ok, version }` |
| `GET /openapi` | OpenAPI documentation |

## Errors

| Status | When |
|---|---|
| `400` | invalid parameters or body |
| `401` | missing or wrong admin token |
| `404` | no such release, announcement, or route |
| `502` | the upstream index returned an error or isn't valid, and there is no cached copy |
| `503` | writing announcements while `ADMIN_TOKEN` is not set |
| `500` | anything else, including an unreachable upstream with no cached copy |
