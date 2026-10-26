import { t } from "elysia";

export const RequestStatusSchema = t.Union([
  t.Literal("open"),
  t.Literal("planned"),
  t.Literal("shipped"),
  t.Literal("declined"),
  t.Literal("duplicate"),
  t.Literal("hidden"),
]);

const PackageSchema = t.String({ pattern: "^[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z][A-Za-z0-9_]*)+$", maxLength: 255 });

export const RequestSchema = t.Object({
  id: t.Number(),
  app: t.Union([t.String(), t.Null()]),
  title: t.String(),
  body: t.Union([t.String(), t.Null()]),
  status: RequestStatusSchema,
  shipped_in: t.Union([t.String(), t.Null()]),
  duplicate_of: t.Union([t.Number(), t.Null()]),
  votes: t.Number(),
  comments: t.Number(),
  created_at: t.String(),
});

export const RequestListSchema = t.Array(RequestSchema);

export const RequestQuerySchema = t.Object({
  app: t.Optional(t.String()),
  status: t.Optional(RequestStatusSchema),
  sort: t.Optional(t.Union([t.Literal("top"), t.Literal("new")])),
  q: t.Optional(t.String({ maxLength: 100 })),
});

export const CreateRequestSchema = t.Object({
  app: t.Optional(PackageSchema),
  title: t.String({ minLength: 10, maxLength: 100 }),
  body: t.Optional(t.String({ maxLength: 1000 })),
  force: t.Optional(t.Boolean()),
});

export const UpdateRequestSchema = t.Object({
  app: t.Optional(t.Union([PackageSchema, t.Null()])),
  title: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  status: t.Optional(RequestStatusSchema),
  shipped_in: t.Optional(t.Union([t.String(), t.Null()])),
  duplicate_of: t.Optional(t.Union([t.Number({ minimum: 1 }), t.Null()])),
});

export const DuplicateSchema = t.Object({
  error: t.String(),
  duplicate: RequestSchema,
});

export const VoterSchema = t.Object({ token: t.String() });

export const VoterActivitySchema = t.Object({
  requests: t.Array(t.Number()),
  votes: t.Array(t.Number()),
  comments: t.Array(t.Number()),
});

export const VotesSchema = t.Object({ votes: t.Number() });

export type Request = typeof RequestSchema.static;
export type RequestStatus = typeof RequestStatusSchema.static;
export type CreateRequest = typeof CreateRequestSchema.static;
export type UpdateRequest = typeof UpdateRequestSchema.static;
export type RequestQuery = typeof RequestQuerySchema.static;
