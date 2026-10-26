import { and, eq, gt, sql } from "drizzle-orm";
import type { DrizzleDb } from "./client";
import { countWhere } from "./counts";
import { requestReports, requests, requestVotes } from "./schema";
import type { Voter } from "./voters";

export const HIDE_AFTER_REPORTERS = 3;
export const HIDE_AFTER_REPORTER_ADDRESSES = 2;

export function countVotes(db: DrizzleDb, requestId: number, ipHash: string, after: string) {
  return countWhere(
    db,
    requestVotes,
    and(eq(requestVotes.requestId, requestId), eq(requestVotes.ipHash, ipHash), gt(requestVotes.createdAt, after)),
  );
}

export function addVote(db: DrizzleDb, requestId: number, voter: Voter, ipHash: string) {
  db.insert(requestVotes)
    .values({ requestId, voterId: voter.id, ipHash, createdAt: new Date().toISOString() })
    .onConflictDoNothing()
    .run();
}

export function removeVote(db: DrizzleDb, requestId: number, voter: Voter) {
  db.delete(requestVotes).where(and(eq(requestVotes.requestId, requestId), eq(requestVotes.voterId, voter.id))).run();
}

export function report(db: DrizzleDb, requestId: number, voter: Voter, ipHash: string) {
  db.transaction((tx) => {
    tx.insert(requestReports)
      .values({ requestId, voterId: voter.id, ipHash, createdAt: new Date().toISOString() })
      .onConflictDoNothing()
      .run();
    const { reporters, addresses } = tx
      .select({
        reporters: sql<number>`COUNT(*)`,
        addresses: sql<number>`COUNT(DISTINCT ${requestReports.ipHash})`,
      })
      .from(requestReports)
      .where(eq(requestReports.requestId, requestId))
      .get()!;
    if (reporters >= HIDE_AFTER_REPORTERS && addresses >= HIDE_AFTER_REPORTER_ADDRESSES)
      tx.update(requests).set({ status: "hidden" }).where(eq(requests.id, requestId)).run();
  });
}

