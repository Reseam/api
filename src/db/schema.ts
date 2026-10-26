import { sqliteTable, text, integer, index, primaryKey, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import type { RequestStatus } from "../schemas/requests";

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

export const voters = sqliteTable(
  "voters",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tokenHash: text("token_hash").notNull().unique(),
    ipHash: text("ip_hash").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("voters_ip_hash_created_at_idx").on(table.ipHash, table.createdAt)],
);

export const requests = sqliteTable(
  "requests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    app: text("app"),
    title: text("title").notNull(),
    body: text("body"),
    status: text("status").notNull().$type<RequestStatus>().default("open"),
    shippedIn: text("shipped_in"),
    duplicateOf: integer("duplicate_of").references((): AnySQLiteColumn => requests.id, { onDelete: "set null" }),
    voterId: integer("voter_id")
      .notNull()
      .references(() => voters.id, { onDelete: "cascade" }),
    ipHash: text("ip_hash").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("requests_status_idx").on(table.status),
    index("requests_voter_id_created_at_idx").on(table.voterId, table.createdAt),
    index("requests_ip_hash_created_at_idx").on(table.ipHash, table.createdAt),
  ],
);

export const requestVotes = sqliteTable(
  "request_votes",
  {
    requestId: integer("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    voterId: integer("voter_id")
      .notNull()
      .references(() => voters.id, { onDelete: "cascade" }),
    ipHash: text("ip_hash").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.requestId, table.voterId] }),
    index("request_votes_voter_id_idx").on(table.voterId),
    index("request_votes_request_ip_idx").on(table.requestId, table.ipHash, table.createdAt),
  ],
);

export const requestReports = sqliteTable(
  "request_reports",
  {
    requestId: integer("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    voterId: integer("voter_id")
      .notNull()
      .references(() => voters.id, { onDelete: "cascade" }),
    ipHash: text("ip_hash").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.requestId, table.voterId] })],
);
