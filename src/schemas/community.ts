import { t } from "elysia";
import { ReleaseSchema } from "./releases";

export const ForgejoRepoSchema = t.Object({
  name: t.String(),
  html_url: t.String(),
  original_url: t.String(),
  mirror: t.Boolean(),
  archived: t.Boolean(),
  private: t.Boolean(),
});

export const ForgejoReposSchema = t.Array(ForgejoRepoSchema);

export const CommunityBundleSchema = t.Object({
  slug: t.String(),
  name: t.String(),
  author: t.String(),
  description: t.String(),
  homepage: t.Optional(t.String()),
  public_key: t.String({ pattern: "^[0-9a-fA-F]{64}$" }),
  repository: t.String(),
  index_url: t.String(),
  version: t.String(),
  published_at: t.String(),
  apps: t.Array(t.String()),
  any_app: t.Boolean(),
  patches: t.Integer(),
  listed: t.Boolean(),
});

export const CommunityDetailSchema = t.Composite([
  CommunityBundleSchema,
  t.Object({
    releases: t.Array(ReleaseSchema),
    readme: t.Union([t.String(), t.Null()]),
  }),
]);

export type ForgejoRepo = typeof ForgejoRepoSchema.static;
export type CommunityBundle = typeof CommunityBundleSchema.static;
export type CommunityDetail = typeof CommunityDetailSchema.static;
