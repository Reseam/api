import { createHash, timingSafeEqual } from "node:crypto";

export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBuf = enc.encode(a);
  const bBuf = enc.encode(b);
  if (aBuf.byteLength !== bBuf.byteLength) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function setCacheHeaders(
  set: { headers: Record<string, string | number | string[]> },
  ttl: number,
  body: unknown,
): void {
  set.headers["Cache-Control"] = `public, s-maxage=${ttl}, stale-while-revalidate=60`;
  set.headers.ETag = `"${createHash("sha256").update(JSON.stringify(body)).digest("hex")}"`;
}
