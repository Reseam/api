import { t } from "elysia";

export const ErrorSchema = t.Object({
  error: t.String(),
});

export const BundleSchema = t.Object({
  name: t.String(),
  author: t.String(),
  description: t.String(),
  homepage: t.Optional(t.String()),
  public_key: t.Optional(t.String({ pattern: "^[0-9a-fA-F]{64}$" })),
});

export const ReleaseSchema = t.Object({
  version: t.String(),
  created_at: t.String(),
  description: t.String(),
  download_url: t.String(),
  prerelease: t.Boolean(),
});

export const ReleaseFileSchema = t.Object({
  format_version: t.Optional(t.Number()),
  bundle: BundleSchema,
  releases: t.Array(ReleaseSchema),
});

export const ReleaseResponseSchema = t.Object({
  bundle: BundleSchema,
  release: ReleaseSchema,
});

export const ReleaseHistoryResponseSchema = t.Object({
  bundle: BundleSchema,
  releases: t.Array(ReleaseSchema),
});

export const VersionResponseSchema = t.Object({
  version: t.String(),
});

export const KeyResponseSchema = t.Object({
  public_key: t.String({ pattern: "^[0-9a-fA-F]{64}$" }),
});

export type ReleaseFile = typeof ReleaseFileSchema.static;
export type Release = typeof ReleaseSchema.static;
export type ReleaseResponse = typeof ReleaseResponseSchema.static;
export type ReleaseHistoryResponse = typeof ReleaseHistoryResponseSchema.static;
