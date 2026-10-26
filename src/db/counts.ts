import { count, type SQL } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import type { DrizzleDb } from "./client";

export function countWhere(db: DrizzleDb, table: SQLiteTable, where: SQL | undefined) {
  return db.select({ n: count() }).from(table).where(where).get()!.n;
}

export function since(hours: number) {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}
