import { createHash } from "node:crypto";
import { Elysia } from "elysia";

export function httpCache(ttl: number) {
  const cacheControl = `public, s-maxage=${ttl}, stale-while-revalidate=60`;

  return new Elysia().onAfterHandle(
    { as: "scoped" },
    ({ request, set, response }) => {
      if (request.method !== "GET" || response instanceof Response) return;

      const etag = `"${createHash("sha256").update(JSON.stringify(response)).digest("hex")}"`;
      set.headers["Cache-Control"] = cacheControl;
      set.headers.ETag = etag;

      if (request.headers.get("if-none-match") === etag)
        return new Response(null, {
          status: 304,
          headers: { "Cache-Control": cacheControl, ETag: etag },
        });
    },
  );
}
