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

## Community

| Route | Returns |
|---|---|
| `GET /v1/community` | every bundle in the community organization, most recently released first |
| `GET /v1/community/<slug>` | one listed bundle, with its `releases` and `readme` |

The list is the Forgejo organization `COMMUNITY_ORG`: each public repository whose latest release has a `patches.json` that names its signer and has a stable release. A mirror is read from the repository it mirrors. Repositories whose name starts with `.` are left out.

A bundle has `slug` (the repository's name), `name`, `author`, `description`, `homepage`, `public_key`, `repository`, `index_url` (the `patches.json` to add it from), `version` and `published_at` of the newest stable release, the `apps` it patches, `any_app` when a patch works on any app, the number of `patches`, and `listed`. Archiving a repository sets `listed` to `false`, so apps can warn people who added it; `/v1/community/<slug>` then returns `404`. `readme` is the repository's `README.md`, or `null`.

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

## Translate

| Route | |
|---|---|
| `POST /v1/translate` | translate texts; see [Translate](6_translate.md) |
| `GET /v1/translate/languages` | `{ pairs, pivot }`: the directions the engine has models for |

## Other

| Route | |
|---|---|
| `GET /` | the server's name, version, and main routes |
| `GET /v1/health` | `{ ok, version }` |
| `GET /openapi` | OpenAPI documentation |

## Errors

| Status | When |
|---|---|
| `400` | invalid parameters or body, or no translation model for the pair |
| `401` | missing or wrong admin token, or unknown voter token |
| `403` | failed Turnstile check, or deleting someone else's comment |
| `404` | no such release, announcement, request, comment, community bundle, or route |
| `409` | a new request looks like an open one; the body has it as `duplicate` |
| `413` | more than 20,000 bytes of text to translate |
| `429` | too many voters, requests, comments, votes, or translations from one voter or address |
| `502` | the upstream index or Forgejo returned an error or isn't valid and there is no cached copy, or the translation engine failed |
| `503` | writing announcements while `ADMIN_TOKEN` is not set, requests while `REQUESTS_SECRET` or `TURNSTILE_SECRET` is not set, or translations while `TRANSLATE_URL` is not set |
| `500` | anything else, including an unreachable upstream with no cached copy |
