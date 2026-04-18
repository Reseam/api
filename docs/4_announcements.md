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
	"body": "Our mirror is catching up after the 1.0.50 release.",
	"tag": "status",
	"level": "warning"
}
```

- `title`: one line. Shown in lists.
- `body`: longer text. Markdown is allowed; clients render it.
- `tag`: optional grouping key. Clients filter by tag.
- `level`: one of `info`, `warning`, `critical`. Defaults to `info`. Clients style accordingly.

## Create

```bash
curl -X POST https://api.reseam.app/v1/announcements \
	-H "Authorization: Bearer $ADMIN_TOKEN" \
	-H "Content-Type: application/json" \
	-d '{
		"title": "Patch downloads are slow",
		"body": "Our mirror is catching up after the 1.0.50 release.",
		"tag": "status",
		"level": "warning"
	}'
```

Returns `201` with the full record including `id`, `createdAt`, and `archived: false`.

## Update

```bash
curl -X PATCH https://api.reseam.app/v1/announcements/42 \
	-H "Authorization: Bearer $ADMIN_TOKEN" \
	-H "Content-Type: application/json" \
	-d '{ "archived": true }'
```

Only the fields you send are changed. Set `archived: true` to hide from the default list without deleting.

## List

```bash
curl https://api.reseam.app/v1/announcements
curl "https://api.reseam.app/v1/announcements?tag=status"
curl "https://api.reseam.app/v1/announcements?archived=true"
```

`GET /v1/announcements` hides archived entries by default. Pass `?archived=true` to include them.

## Delete

```bash
curl -X DELETE https://api.reseam.app/v1/announcements/42 \
	-H "Authorization: Bearer $ADMIN_TOKEN"
```

Returns `{ ok: true }`. Prefer archiving; deletes are permanent.

## Errors

| Status | When |
|--------|------|
| `401` | Missing or wrong bearer token. |
| `404` | No announcement with that id. |
| `503` | `ADMIN_TOKEN` not set on the server. Happens on read-only deploys. |
