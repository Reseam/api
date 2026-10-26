import { Elysia } from "elysia";
import { httpCache, sharedCache } from "../cache";
import type { Config } from "../config";
import { ApiError } from "../errors";
import { ErrorSchema, ReleaseResponseSchema } from "../schemas/releases";
import type { Upstream } from "../upstream";

// Reseam Manager before 0.32 finds its own updates here; newer clients read /manager.json.
export function managerRoutes(config: Config, upstream: Upstream) {
  return new Elysia({ prefix: "/v1/manager", tags: ["Manager"] })
    .use(httpCache(sharedCache(config.cacheTtl)))
    .get(
      "/",
      async () => {
        const file = await upstream.manager();
        const release = file.releases.find((r) => !r.prerelease);
        if (!release) throw new ApiError(404, "No stable release found");
        return { bundle: file.bundle, release };
      },
      { response: { 200: ReleaseResponseSchema, 404: ErrorSchema } },
    );
}
