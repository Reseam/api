import { Elysia } from "elysia";

// Every response allows any origin and carries no Vary, so one edge-cached copy serves browsers and apps alike.
export const publicCors = new Elysia({ name: "public-cors" })
  .headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "ETag",
  })
  .options("*", ({ set }) => {
    set.status = 204;
    set.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS";
    set.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    set.headers["Access-Control-Max-Age"] = "300";
  });
