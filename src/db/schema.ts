import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const announcements = sqliteTable(
  "announcements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    author: text("author"),
    title: text("title").notNull(),
    content: text("content"),
    level: integer("level", { mode: "number" })
      .notNull()
      .$type<0 | 1 | 2 | 3>()
      .default(0),
    createdAt: text("created_at").notNull(),
    archivedAt: text("archived_at"),
  },
  (table) => [
    index("announcements_created_at_idx").on(table.createdAt),
    index("announcements_archived_at_idx").on(table.archivedAt),
  ],
);

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const announcementTags = sqliteTable(
  "announcement_tags",
  {
    announcementId: integer("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("announcement_tags_announcement_id_idx").on(table.announcementId),
    index("announcement_tags_tag_id_idx").on(table.tagId),
  ],
);
