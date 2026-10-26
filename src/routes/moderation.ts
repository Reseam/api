import { bearer } from "@elysiajs/bearer";
import { Elysia, t } from "elysia";
import { adminRefusal } from "../auth";
import type { Config } from "../config";
import type { DrizzleDb } from "../db/client";
import { removeRequest, updateRequest } from "../db/requests";
import { removeAuthor } from "../db/voters";
import { ApiError } from "../errors";
import { DeleteResponseSchema } from "../schemas/announcements";
import { ErrorSchema } from "../schemas/releases";
import { RequestSchema, UpdateRequestSchema } from "../schemas/requests";
import { IdParams } from "./request-access";

export function moderationRoutes(config: Config, db: DrizzleDb) {
  return new Elysia({ prefix: "/v1/requests", tags: ["Requests"] })
    .use(bearer())
    .guard({
      beforeHandle({ bearer, set, status }) {
        const refusal = adminRefusal(config, bearer);
        if (refusal?.code === 401) set.headers["WWW-Authenticate"] = 'Bearer realm="reseam-admin"';
        if (refusal) return status(refusal.code, { error: refusal.error });
      },
    })
    .patch(
      "/:id",
      ({ params, body }) => {
        const updated = updateRequest(db, params.id, body);
        if (!updated) throw new ApiError(404, "Request not found");
        return updated;
      },
      {
        params: IdParams,
        body: UpdateRequestSchema,
        response: { 200: RequestSchema, 401: ErrorSchema, 404: ErrorSchema, 503: ErrorSchema },
      },
    )
    .delete(
      "/:id",
      ({ params, query }) => {
        const removed = query.author ? removeAuthor(db, params.id) : removeRequest(db, params.id);
        if (!removed) throw new ApiError(404, "Request not found");
        return { ok: true };
      },
      {
        params: IdParams,
        query: t.Object({ author: t.Optional(t.Boolean()) }),
        response: { 200: DeleteResponseSchema, 401: ErrorSchema, 404: ErrorSchema, 503: ErrorSchema },
      },
    );
}
