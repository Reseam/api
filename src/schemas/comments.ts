import { t } from "elysia";

export const CommentSchema = t.Object({
  id: t.Number(),
  request_id: t.Number(),
  body: t.String(),
  team: t.Boolean(),
  hidden: t.Boolean(),
  created_at: t.String(),
});

export const CommentListSchema = t.Array(CommentSchema);

export const CreateCommentSchema = t.Object({ body: t.String({ minLength: 1, maxLength: 1000 }) });

export const UpdateCommentSchema = t.Object({ hidden: t.Boolean() });

export type Comment = typeof CommentSchema.static;
