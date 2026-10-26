---
title: Endpoints
description: Every route the API serves.
---

# Endpoints

Every route allows requests from any origin. Errors are JSON: `{ "error": "message" }`.

## Releases

| Route | Returns |
|---|---|
| `GET /patches.json` | the patch index |
| `GET /manager.json` | the Reseam Manager index |
| `GET /v1/manager` | `{ bundle, release }`: the latest stable Reseam Manager, for Manager before 0.32 |

An index has `bundle` and `releases`, newest first, as `reseam release` writes them. A `release` has `version`, `created_at`, `description` (its release notes), `download_url`, `prerelease`, and, for the newest stable release and the newest prerelease, `patches`: every patch's name, description, apps, dependencies, and options. `bundle` has `name`, `author`, `description`, `homepage`, and `public_key`.

## Downloads

| Route | |
|---|---|
| `GET /patches/<tag>/<file>` | `302` to `PATCHES_BUNDLE_BASE_URL/<tag>/<file>` |
| `GET /manager/<tag>/<file>` | `302` to `MANAGER_BINARY_BASE_URL/<tag>/<file>` |

`<tag>` and `<file>` may contain letters, digits, `.`, `_`, `-`, and `+` (not first). Anything else returns `400`.

## Announcements

| Route | |
|---|---|
| `GET /v1/announcements` | live announcements, newest first; `?archived=true` includes archived ones |
| `POST`, `PATCH`, `DELETE` | see [Announcements](4_announcements.md) |

## Requests

| Route | |
|---|---|
| `GET /v1/requests` | requests, most votes first; see [Requests](5_requests.md) for filters |
| `POST /v1/voters` | a voter token, after a Turnstile check |
| `GET /v1/voters/me` | the requests a voter posted and voted on, and the comments it wrote |
| `POST /v1/requests` | post a request |
| `PUT`, `DELETE /v1/requests/<id>/vote` | vote, or take the vote back |
| `POST /v1/requests/<id>/report` | report a request |
| `PATCH`, `DELETE /v1/requests/<id>` | admin: edit or delete |
| `GET`, `POST /v1/requests/<id>/comments` | a request's comments, or comment on it |
| `POST /v1/comments/<id>/report` | report a comment |
| `DELETE /v1/comments/<id>` | delete a comment: its author or an admin |
| `PATCH /v1/comments/<id>` | admin: hide or show |

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
| `401` | missing or wrong admin token, or unknown voter token |
| `403` | failed Turnstile check, or deleting someone else's comment |
| `404` | no such release, announcement, request, comment, or route |
| `409` | a new request looks like an open one; the body has it as `duplicate` |
| `429` | too many voters, requests, comments, or votes from one voter or address |
| `502` | the upstream index returned an error or isn't valid, and there is no cached copy |
| `503` | writing announcements while `ADMIN_TOKEN` is not set, or requests while `REQUESTS_SECRET` or `TURNSTILE_SECRET` is not set |
| `500` | anything else, including an unreachable upstream with no cached copy |
