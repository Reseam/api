---
title: Announcements
description: Post, edit, archive, and delete announcements.
---

# Announcements

Announcements are short notices: a new release, an outage, a warning. The website shows the newest one at the top of every page and all of them under Announcements. Anyone can read them; writing needs the admin token.

## Post one

```bash
curl -X POST https://api.reseam.app/v1/announcements \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Patch downloads are slow",
    "content": "Our mirror is catching up after a release.",
    "level": 1,
    "tags": ["status"]
  }'
```

| Field | |
|---|---|
| `title` | required |
| `content` | plain text; line breaks are kept |
| `level` | `0` news (default), `1` notice, `2` warning, `3` critical |
| `tags` | list of tags; stored lowercase, duplicates dropped |
| `author` | optional display name |

The server answers `201` with the full record, including its `id` and `created_at`.

## Edit or archive

```bash
curl -X PATCH https://api.reseam.app/v1/announcements/42 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "archived_at": "2026-10-03T12:00:00Z" }'
```

Only the fields you send change; `tags` replaces the whole list. Archiving hides an announcement from the default list; set `archived_at` back to `null` to show it again.

## Delete

```bash
curl -X DELETE https://api.reseam.app/v1/announcements/42 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Deleting is permanent. Prefer archiving.
