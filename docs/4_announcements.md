---
title: Announcements
description: Write operational notices clients can surface.
---

# Announcements

Announcements are short messages Reseam Manager and the website can show their users: incident notices, release notes, deprecation warnings. They live in SQLite on the API host. Reads are public and cached; writes require the admin token.

## Payload

```json
{
	"title": "Patch downloads are slow",
	"content": "Our mirror is catching up after the 1.0.50 release.",
	"tags": ["status"],
	"level": 1,
	"author": "reseam"
}
```

- `title`: one line. Shown in lists. Required, non-empty.
- `content`: longer text. Optional. Markdown is allowed; clients render it.
- `tags`: array of strings. Optional. Tags are lowercased and trimmed server-side; duplicates are dropped.
- `level`: integer `0`, `1`, `2`, or `3`. Optional, defaults to `0`. Clients style higher levels more prominently.
- `author`: display name for the writer. Optional.

## Response shape

Every read and every successful write returns the full record:

```json
{
	"id": 42,
	"author": "reseam",
	"title": "Patch downloads are slow",
	"content": "Our mirror is catching up after the 1.0.50 release.",
	"level": 1,
	"created_at": "2026-04-19T08:22:00.033Z",
	"archived_at": null,
	"tags": ["status"]
}
```

`archived_at` is `null` while the announcement is live and an ISO-8601 UTC timestamp once archived.

## Create

```bash
curl -X POST https://api.reseam.app/v1/announcements \
	-H "Authorization: Bearer $ADMIN_TOKEN" \
	-H "Content-Type: application/json" \
	-d '{
		"title": "Patch downloads are slow",
		"content": "Our mirror is catching up after the 1.0.50 release.",
		"tags": ["status"],
		"level": 1
	}'
```

Returns `201` with the full record. `id`, `created_at`, and `archived_at: null` are filled in by the server.

## Update

```bash
curl -X PATCH https://api.reseam.app/v1/announcements/42 \
	-H "Authorization: Bearer $ADMIN_TOKEN" \
	-H "Content-Type: application/json" \
	-d '{ "archived_at": "2026-04-19T12:00:00Z" }'
```

Only the fields you send are changed. Archive with `archived_at` set to an ISO timestamp; unarchive by setting it back to `null`. `tags` replaces the full tag set.

## List

```bash
curl https://api.reseam.app/v1/announcements
curl "https://api.reseam.app/v1/announcements?tag=status"
curl "https://api.reseam.app/v1/announcements?archived=true"
```

`GET /v1/announcements` hides archived entries by default. Pass `?archived=true` to include them. The `tag` query parameter is singular and matches on a single tag name (case-insensitive).

## Delete

```bash
curl -X DELETE https://api.reseam.app/v1/announcements/42 \
	-H "Authorization: Bearer $ADMIN_TOKEN"
```

Returns `{ "ok": true }`. Prefer archiving; deletes are permanent.

## Errors

| Status | When |
|--------|------|
| `401` | Missing or wrong bearer token. |
| `404` | No announcement with that id. |
| `503` | `ADMIN_TOKEN` not set on the server. Happens on read-only deploys. |
