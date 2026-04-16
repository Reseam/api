import { t } from "elysia";

export const AnnouncementLevelSchema = t.Union([
  t.Literal(0),
  t.Literal(1),
  t.Literal(2),
  t.Literal(3),
]);

export const AnnouncementSchema = t.Object({
  id: t.Number(),
  author: t.Union([t.String(), t.Null()]),
  title: t.String(),
  content: t.Union([t.String(), t.Null()]),
  level: AnnouncementLevelSchema,
  created_at: t.String(),
  archived_at: t.Union([t.String(), t.Null()]),
  tags: t.Array(t.String()),
});

export const AnnouncementListSchema = t.Array(AnnouncementSchema);

export const AnnouncementQuerySchema = t.Object({
  tag: t.Optional(t.String()),
  archived: t.Optional(t.Boolean()),
});

export const CreateAnnouncementSchema = t.Object({
  author: t.Optional(t.String()),
  title: t.String({ minLength: 1 }),
  content: t.Optional(t.String()),
  level: t.Optional(AnnouncementLevelSchema),
  tags: t.Optional(t.Array(t.String())),
});

export const UpdateAnnouncementSchema = t.Object({
  author: t.Optional(t.Union([t.String(), t.Null()])),
  title: t.Optional(t.String({ minLength: 1 })),
  content: t.Optional(t.Union([t.String(), t.Null()])),
  level: t.Optional(AnnouncementLevelSchema),
  archived_at: t.Optional(t.Union([t.String(), t.Null()])),
  tags: t.Optional(t.Array(t.String())),
});

export const DeleteResponseSchema = t.Object({
  ok: t.Boolean(),
});

export type Announcement = typeof AnnouncementSchema.static;
export type AnnouncementLevel = typeof AnnouncementLevelSchema.static;
export type CreateAnnouncement = typeof CreateAnnouncementSchema.static;
export type UpdateAnnouncement = typeof UpdateAnnouncementSchema.static;
