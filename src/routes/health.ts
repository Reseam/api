import { Elysia, t } from "elysia";

export function healthRoutes(version: string) {
  return new Elysia({ prefix: "/v1", tags: ["Health"] }).get(
    "/health",
    () => ({ ok: true, version }),
    {
      response: {
        200: t.Object({
          ok: t.Boolean(),
          version: t.String(),
        }),
      },
    },
  );
}
