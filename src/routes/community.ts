import { Elysia, t } from "elysia";
import { httpCache, sharedCache } from "../cache";
import type { Community } from "../community";
import type { Config } from "../config";
import { CommunityBundleSchema, CommunityDetailSchema } from "../schemas/community";
import { ErrorSchema } from "../schemas/releases";

export function communityRoutes(config: Config, community: Community) {
  return new Elysia({ prefix: "/v1/community", tags: ["Community"] })
    .use(httpCache(sharedCache(config.cacheTtl)))
    .get("/", () => community.list(), {
      response: { 200: t.Array(CommunityBundleSchema), 502: ErrorSchema },
    })
    .get("/:slug", ({ params }) => community.detail(params.slug), {
      params: t.Object({ slug: t.String() }),
      response: { 200: CommunityDetailSchema, 404: ErrorSchema, 502: ErrorSchema },
    });
}
