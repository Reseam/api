import { and, asc, eq, gt, sql } from "drizzle-orm";
import type { DrizzleDb } from "./client";
import { countWhere } from "./counts";
import { commentReports, requestComments, requests } from "./schema";
import { HIDE_AFTER_REPORTER_ADDRESSES, HIDE_AFTER_REPORTERS } from "./votes";
import type { Voter } from "./voters";
import type { Comment } from "../schemas/comments";

export type CommentAuthor = { voter: Voter; ipHash: string } | "team";

// Qualified by hand: Drizzle leaves columns unqualified, and inside the subquery they would bind to requests.
const commentRequestId = sql`${requestComments}.${sql.identifier(requestComments.requestId.name)}`;
const commentVoterId = sql`${requestComments}.${sql.identifier(requestComments.voterId.name)}`;
const byRequester = sql<boolean>`${commentVoterId} = (SELECT ${requests.voterId} FROM ${requests} WHERE ${requests.id} = ${commentRequestId})`;

function commentQuery(db: DrizzleDb) {
  return db
    .select({
      id: requestComments.id,
      request_id: requestComments.requestId,
      body: requestComments.body,
      team: sql<boolean>`${requestComments.voterId} IS NULL`.mapWith(Boolean),
      requester: sql<boolean>`COALESCE(${byRequester}, 0)`.mapWith(Boolean),
      hidden: requestComments.hidden,
      created_at: requestComments.createdAt,
    })
    .from(requestComments);
}

export function listComments(db: DrizzleDb, requestId: number, includeHidden: boolean): Comment[] {
  return commentQuery(db)
    .where(and(eq(requestComments.requestId, requestId), includeHidden ? undefined : eq(requestComments.hidden, false)))
    .orderBy(asc(requestComments.createdAt))
    .all();
}

export function getComment(db: DrizzleDb, id: number) {
  return db.select().from(requestComments).where(eq(requestComments.id, id)).get();
}

export function countComments(db: DrizzleDb, by: { voterId: number } | { ipHash: string }, after: string) {
  const owner = "voterId" in by ? eq(requestComments.voterId, by.voterId) : eq(requestComments.ipHash, by.ipHash);
  return countWhere(db, requestComments, and(owner, gt(requestComments.createdAt, after)));
}

export function createComment(db: DrizzleDb, requestId: number, body: string, author: CommentAuthor, hidden: boolean) {
  const { id } = db
    .insert(requestComments)
    .values({
      requestId,
      body: body.trim(),
      hidden,
      voterId: author === "team" ? null : author.voter.id,
      ipHash: author === "team" ? null : author.ipHash,
      createdAt: new Date().toISOString(),
    })
    .returning({ id: requestComments.id })
    .get();
  return commentQuery(db).where(eq(requestComments.id, id)).get()!;
}

export function setCommentHidden(db: DrizzleDb, id: number, hidden: boolean) {
  db.update(requestComments).set({ hidden }).where(eq(requestComments.id, id)).run();
  return commentQuery(db).where(eq(requestComments.id, id)).get();
}

export function removeComment(db: DrizzleDb, id: number) {
  db.delete(requestComments).where(eq(requestComments.id, id)).run();
}

export function reportComment(db: DrizzleDb, commentId: number, voter: Voter, ipHash: string) {
  db.transaction((tx) => {
    tx.insert(commentReports)
      .values({ commentId, voterId: voter.id, ipHash, createdAt: new Date().toISOString() })
      .onConflictDoNothing()
      .run();
    const { reporters, addresses } = tx
      .select({
        reporters: sql<number>`COUNT(*)`,
        addresses: sql<number>`COUNT(DISTINCT ${commentReports.ipHash})`,
      })
      .from(commentReports)
      .where(eq(commentReports.commentId, commentId))
      .get()!;
    if (reporters >= HIDE_AFTER_REPORTERS && addresses >= HIDE_AFTER_REPORTER_ADDRESSES)
      tx.update(requestComments).set({ hidden: true }).where(eq(requestComments.id, commentId)).run();
  });
}
