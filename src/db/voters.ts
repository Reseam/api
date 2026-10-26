import { and, eq, gt } from "drizzle-orm";
import type { DrizzleDb } from "./client";
import { countWhere } from "./counts";
import { requests, requestVotes, voters } from "./schema";

export type Voter = typeof voters.$inferSelect;

export function createVoter(db: DrizzleDb, tokenHash: string, ipHash: string) {
  db.insert(voters).values({ tokenHash, ipHash, createdAt: new Date().toISOString() }).run();
}

export function countVoters(db: DrizzleDb, ipHash: string, after: string) {
  return countWhere(db, voters, and(eq(voters.ipHash, ipHash), gt(voters.createdAt, after)));
}

export function findVoter(db: DrizzleDb, tokenHash: string): Voter | undefined {
  return db.select().from(voters).where(eq(voters.tokenHash, tokenHash)).get();
}

export function voterActivity(db: DrizzleDb, voterId: number) {
  return {
    requests: db.select({ id: requests.id }).from(requests).where(eq(requests.voterId, voterId)).all().map((row) => row.id),
    votes: db.select({ id: requestVotes.requestId }).from(requestVotes).where(eq(requestVotes.voterId, voterId)).all().map((row) => row.id),
  };
}

/** Deletes whoever wrote the request, and with them every request, vote and report they made. */
export function removeAuthor(db: DrizzleDb, id: number) {
  const row = db.select({ voterId: requests.voterId }).from(requests).where(eq(requests.id, id)).get();
  if (!row) return false;
  db.delete(voters).where(eq(voters.id, row.voterId)).run();
  return true;
}
