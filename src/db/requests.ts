import { and, desc, eq, gt, inArray, like, ne, or, sql, type SQL } from "drizzle-orm";
import type { DrizzleDb } from "./client";
import { countWhere } from "./counts";
import { requests, requestVotes } from "./schema";
import type { Voter } from "./voters";
import type { CreateRequest, Request, RequestQuery, RequestStatus, UpdateRequest } from "../schemas/requests";

const voteCount = sql<number>`(SELECT COUNT(*) FROM ${requestVotes} WHERE ${requestVotes.requestId} = ${requests.id})`;

function requestQuery(db: DrizzleDb) {
  return db
    .select({
      id: requests.id,
      app: requests.app,
      title: requests.title,
      body: requests.body,
      status: requests.status,
      shipped_in: requests.shippedIn,
      duplicate_of: requests.duplicateOf,
      votes: voteCount,
      created_at: requests.createdAt,
    })
    .from(requests);
}

export function listRequests(db: DrizzleDb, query: RequestQuery, includeHidden: boolean): Request[] {
  const conditions: SQL[] = [];
  if (!includeHidden) conditions.push(ne(requests.status, "hidden"));
  if (query.status) conditions.push(eq(requests.status, query.status));
  if (query.app) conditions.push(eq(requests.app, query.app));
  for (const word of (query.q ?? "").split(/\s+/).filter(Boolean)) {
    const pattern = `%${word.replace(/[%_\\]/g, "\\$&")}%`;
    conditions.push(or(like(requests.title, pattern), like(requests.body, pattern))!);
  }
  const order = query.sort === "new" ? [desc(requests.createdAt)] : [desc(voteCount), desc(requests.createdAt)];
  return requestQuery(db).where(and(...conditions)).orderBy(...order).all();
}

export function getRequest(db: DrizzleDb, id: number): Request | undefined {
  return requestQuery(db).where(eq(requests.id, id)).get();
}

export function openRequests(db: DrizzleDb, app: string | undefined, limit: number) {
  return db
    .select({ id: requests.id, title: requests.title })
    .from(requests)
    .where(and(inArray(requests.status, ["open", "planned"]), app ? eq(requests.app, app) : undefined))
    .orderBy(desc(voteCount), desc(requests.createdAt))
    .limit(limit)
    .all();
}

export function countRequests(db: DrizzleDb, by: { voterId: number } | { ipHash: string }, after: string) {
  const owner = "voterId" in by ? eq(requests.voterId, by.voterId) : eq(requests.ipHash, by.ipHash);
  return countWhere(db, requests, and(owner, gt(requests.createdAt, after)));
}

export function createRequest(
  db: DrizzleDb,
  input: Omit<CreateRequest, "force"> & { status: RequestStatus },
  voter: Voter,
  ipHash: string,
) {
  const { id } = db
    .insert(requests)
    .values({
      app: input.app ?? null,
      title: input.title.trim(),
      body: input.body?.trim() || null,
      status: input.status,
      voterId: voter.id,
      ipHash,
      createdAt: new Date().toISOString(),
    })
    .returning({ id: requests.id })
    .get();
  return getRequest(db, id)!;
}

export function updateRequest(db: DrizzleDb, id: number, input: UpdateRequest) {
  const patch: Partial<typeof requests.$inferInsert> = {};
  if (input.app !== undefined) patch.app = input.app;
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.status !== undefined) patch.status = input.status;
  if (input.shipped_in !== undefined) patch.shippedIn = input.shipped_in;
  if (input.duplicate_of !== undefined) patch.duplicateOf = input.duplicate_of;
  if (Object.keys(patch).length > 0) db.update(requests).set(patch).where(eq(requests.id, id)).run();
  return getRequest(db, id);
}

export function removeRequest(db: DrizzleDb, id: number) {
  return db.delete(requests).where(eq(requests.id, id)).returning({ id: requests.id }).get() !== undefined;
}
