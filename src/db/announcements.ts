import { eq, and, desc, sql, inArray } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { announcements, tags, announcementTags } from "./schema";
import type {
  Announcement,
  CreateAnnouncement,
  UpdateAnnouncement,
} from "../schemas/announcements";

type Db = BunSQLiteDatabase<typeof import("./schema")>;

const tagAggregate = sql<string>`COALESCE(json_group_array(${tags.name}) FILTER (WHERE ${tags.name} IS NOT NULL), '[]')`;

function mapRow(row: {
  id: number;
  author: string | null;
  title: string;
  content: string | null;
  level: 0 | 1 | 2 | 3;
  createdAt: string;
  archivedAt: string | null;
  tagNames: string;
}): Announcement {
  return {
    id: row.id,
    author: row.author,
    title: row.title,
    content: row.content,
    level: row.level,
    created_at: row.createdAt,
    archived_at: row.archivedAt,
    tags: (JSON.parse(row.tagNames) as string[]).sort(),
  };
}

function announcementQuery(db: Db) {
  return db
    .select({
      id: announcements.id,
      author: announcements.author,
      title: announcements.title,
      content: announcements.content,
      level: announcements.level,
      createdAt: announcements.createdAt,
      archivedAt: announcements.archivedAt,
      tagNames: tagAggregate,
    })
    .from(announcements)
    .leftJoin(announcementTags, eq(announcementTags.announcementId, announcements.id))
    .leftJoin(tags, eq(tags.id, announcementTags.tagId))
    .groupBy(announcements.id);
}

export function listAnnouncements(
  db: Db,
  options: { tag?: string; includeArchived: boolean },
) {
  const normalizedTag = options.tag?.trim().toLowerCase() || null;

  const conditions = [
    options.includeArchived ? undefined : sql`${announcements.archivedAt} IS NULL`,
  ];

  if (normalizedTag) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${announcementTags}
        JOIN ${tags} ON ${tags.id} = ${announcementTags.tagId}
        WHERE ${announcementTags.announcementId} = ${announcements.id}
          AND ${tags.name} = ${normalizedTag}
      )`,
    );
  }

  const rows = announcementQuery(db)
    .where(and(...conditions.filter(Boolean)))
    .orderBy(desc(announcements.createdAt), desc(announcements.id))
    .all();

  return rows.map(mapRow);
}

export function getAnnouncement(db: Db, id: number) {
  const row = announcementQuery(db)
    .where(eq(announcements.id, id))
    .get();

  return row ? mapRow(row) : null;
}

export function createAnnouncement(db: Db, input: CreateAnnouncement) {
  return db.transaction((tx) => {
    const now = new Date().toISOString();
    const [{ id }] = tx
      .insert(announcements)
      .values({
        author: input.author ?? null,
        title: input.title,
        content: input.content ?? null,
        level: input.level ?? 0,
        createdAt: now,
      })
      .returning({ id: announcements.id })
      .all();

    setTags(tx, id, input.tags ?? []);
    return getAnnouncement(tx, id);
  });
}

export function updateAnnouncement(
  db: Db,
  id: number,
  input: UpdateAnnouncement,
) {
  return db.transaction((tx) => {
    const current = getAnnouncement(tx, id);
    if (!current) return null;

    const patch: Partial<typeof announcements.$inferInsert> = {};
    if (input.author !== undefined) patch.author = input.author;
    if (input.title !== undefined) patch.title = input.title;
    if (input.content !== undefined) patch.content = input.content;
    if (input.level !== undefined) patch.level = input.level;
    if (input.archived_at !== undefined) patch.archivedAt = input.archived_at;

    tx.update(announcements)
      .set(patch)
      .where(eq(announcements.id, id))
      .run();

    if (input.tags) setTags(tx, id, input.tags);
    return getAnnouncement(tx, id);
  });
}

export function removeAnnouncement(db: Db, id: number) {
  const result = db
    .delete(announcements)
    .where(eq(announcements.id, id))
    .returning({ id: announcements.id })
    .get();
  return result !== undefined;
}

function setTags(db: Db, announcementId: number, raw: string[]) {
  db.delete(announcementTags)
    .where(eq(announcementTags.announcementId, announcementId))
    .run();

  const unique = [
    ...new Set(raw.map((t) => t.trim().toLowerCase()).filter(Boolean)),
  ];
  if (unique.length === 0) return;

  db.insert(tags)
    .values(unique.map((name) => ({ name })))
    .onConflictDoNothing()
    .run();

  const tagRows = db
    .select({ id: tags.id })
    .from(tags)
    .where(inArray(tags.name, unique))
    .all();

  db.insert(announcementTags)
    .values(tagRows.map((tag) => ({ announcementId, tagId: tag.id })))
    .onConflictDoNothing()
    .run();
}
