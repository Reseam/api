---
title: Requests
description: Patch requests, votes, reports, and screening.
---

# Requests

Anyone can ask for a patch and vote on what others asked for. There are no accounts: a browser gets an anonymous voter token once, after a Cloudflare Turnstile check, and keeps it. Requests go live when posted.

Requests need `REQUESTS_SECRET` and `TURNSTILE_SECRET`; see [Configuration](2_config.md).

## Voter tokens

```bash
curl -X POST https://api.reseam.app/v1/voters \
  -H "Content-Type: application/json" \
  -d '{ "turnstile": "<token from the Turnstile widget>" }'
```

The answer is `201` with `{ "token": "..." }`. Send it as `Authorization: Bearer <token>` to post, vote, and report. The server stores only its hash. One address gets at most 20 tokens an hour.

`GET /v1/voters/me` returns `{ requests, votes }`: the ids of the requests this token posted and voted on.

## List

`GET /v1/requests` returns every request that isn't hidden.

| Query | |
|---|---|
| `app` | package name |
| `status` | `open`, `planned`, `shipped`, `declined`, `duplicate`, or `hidden` (admins) |
| `sort` | `top` (default, most votes first) or `new` |
| `q` | words that must all appear in the title or body |

A request has `id`, `app` (package name or `null`), `title`, `body`, `status`, `shipped_in` (for example `patches@0.48.0`), `duplicate_of`, `votes`, and `created_at`. With the admin token, the list includes hidden requests.

## Post

```bash
curl -X POST https://api.reseam.app/v1/requests \
  -H "Authorization: Bearer $VOTER" \
  -H "Content-Type: application/json" \
  -d '{ "app": "com.example.app", "title": "Add a dark theme", "body": "The settings screen stays white at night." }'
```

| Field | |
|---|---|
| `title` | 10 to 100 characters |
| `body` | up to 1000 characters |
| `app` | package name, optional |
| `force` | post even though it looks like an open request |

One token posts at most 3 requests a day, one address at most 10.

## Screening

With `OPENROUTER_API_KEY` set, each new request is checked by a decision model on OpenRouter (`SCREENING_MODEL`, Jev by default) before it is stored:

- **Spam.** Spam, ads, abuse, and anything that isn't a request are stored as `hidden`.
- **Duplicates.** If it asks for the same thing as an open request, the answer is `409` with that request as `duplicate`. Vote on it, or send the request again with `force: true`.
- **App.** A request without `app` gets the package of the app it is about, when the model is confident.

The model sees only the title and body, and the titles of open requests. If it can't be reached, the request is posted without screening.

## Votes and reports

`PUT /v1/requests/<id>/vote` votes and `DELETE` takes the vote back. Both return `{ votes }`. One token votes once per request; one address casts at most 3 votes per request a day.

`POST /v1/requests/<id>/report` reports a request. Once 3 voters from at least 2 addresses reported it, it becomes `hidden`.

## Moderate

With the admin token:

```bash
curl -X PATCH https://api.reseam.app/v1/requests/12 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "status": "shipped", "shipped_in": "patches@0.48.0" }'
```

`PATCH` takes `status`, `shipped_in`, `duplicate_of`, `title`, and `app`. Setting `status` back to `open` restores a hidden request.

`DELETE /v1/requests/<id>` deletes one request. `DELETE /v1/requests/<id>?author=true` deletes its author's token and everything that token posted, voted, and reported.
