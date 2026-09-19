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

const CompatiblePackageSchema = t.Object({
  package: t.String(),
  versions: t.Array(t.String()),
});

const CompatibilitySchema = t.Union([
  t.Object({ kind: t.Literal("universal") }),
  t.Object({
    kind: t.Literal("packages"),
    packages: t.Array(CompatiblePackageSchema),
  }),
]);

const OptionValueSchema = t.Union([
  t.Object({ type: t.Literal("string"), value: t.String() }),
  t.Object({ type: t.Literal("bool"), value: t.Boolean() }),
  t.Object({ type: t.Literal("int"), value: t.Integer() }),
  t.Object({ type: t.Literal("float"), value: t.Number() }),
  t.Object({ type: t.Literal("string_list"), value: t.Array(t.String()) }),
  t.Object({ type: t.Literal("path"), value: t.String() }),
]);

const PatchOptionSchema = t.Object({
  key: t.String(),
  title: t.String(),
  description: t.String(),
  option_type: t.Union([
    t.Literal("string"),
    t.Literal("bool"),
    t.Literal("int"),
    t.Literal("float"),
    t.Literal("string_list"),
    t.Literal("path"),
  ]),
  default_value: t.Union([OptionValueSchema, t.Null()]),
  valid_values: t.Union([t.Array(t.String()), t.Null()]),
  required: t.Boolean(),
});

export const PatchSchema = t.Object({
  bundle: t.String(),
  id: t.String(),
  name: t.String(),
  hidden: t.Boolean(),
  description: t.String(),
  enabled_by_default: t.Boolean(),
  dependencies: t.Array(t.String()),
  compatibility: CompatibilitySchema,
  options: t.Array(PatchOptionSchema),
});

export const ReleaseSchema = t.Object({
  version: t.String(),
  created_at: t.String(),
  description: t.String(),
  download_url: t.String(),
  prerelease: t.Boolean(),
  patches: t.Optional(t.Array(PatchSchema)),
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
