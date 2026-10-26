import { bearer } from "@elysiajs/bearer";
import { Elysia } from "elysia";
import { isAdmin } from "../auth";
import { httpCache } from "../cache";
import type { Config } from "../config";
import type { DrizzleDb } from "../db/client";
import { countComments, createComment, getComment, listComments, removeComment, reportComment } from "../db/comments";
import { since } from "../db/counts";
import { getRequest } from "../db/requests";
import { ApiError } from "../errors";
import type { Relay } from "../relay";
import { DeleteResponseSchema } from "../schemas/announcements";
import { CommentListSchema, CommentSchema, CreateCommentSchema } from "../schemas/comments";
import { ErrorSchema } from "../schemas/releases";
import type { Screener } from "../screening";
import { IdParams, requestAccess } from "./request-access";

const COMMENTS_PER_VOTER_PER_DAY = 30;
const COMMENTS_PER_ADDRESS_PER_DAY = 100;

type Services = { screen?: Screener; relay: Relay };

export function commentsRoutes(config: Config, db: DrizzleDb, { screen, relay }: Services) {
  const { address, voter } = requestAccess(config, db);
  const target = (id: number, admin: boolean) => {
    const found = getRequest(db, id);
    if (!found || (found.status === "hidden" && !admin)) throw new ApiError(404, "Request not found");
    return found;
  };
  const existing = (id: number) => {
    const found = getComment(db, id);
    if (!found) throw new ApiError(404, "Comment not found");
    return found;
  };

  const listing = new Elysia({ tags: ["Requests"] })
    .use(bearer())
    .use(httpCache("no-cache"))
    .get(
      "/requests/:id/comments",
      ({ params, bearer }) => {
        const admin = isAdmin(config, bearer);
        target(params.id, admin);
        return listComments(db, params.id, admin);
      },
      { params: IdParams, response: { 200: CommentListSchema, 404: ErrorSchema } },
    );

  return new Elysia({ prefix: "/v1", tags: ["Requests"] })
    .use(bearer())
    .use(listing)
    .post(
      "/requests/:id/comments",
      async ({ params, body, bearer, request, status }) => {
        if (isAdmin(config, bearer)) return status(201, createComment(db, target(params.id, true).id, body.body, "team", false));

        const author = voter(bearer);
        const hash = address(request);
        const on = target(params.id, false);
        if (countComments(db, { voterId: author.id }, since(24)) >= COMMENTS_PER_VOTER_PER_DAY ||
          countComments(db, { ipHash: hash }, since(24)) >= COMMENTS_PER_ADDRESS_PER_DAY)
          throw new ApiError(429, "Too many comments today");

        const spam = screen &&
          (await screen.spamComment(body.body, on).catch((error: Error) => {
            console.error(`screening: ${error.message}`);
            return false;
          }));
        const created = createComment(db, on.id, body.body, { voter: author, ipHash: hash }, !!spam);
        relay({ type: "comment", comment: created, request: on });
        return status(201, created);
      },
      {
        params: IdParams,
        body: CreateCommentSchema,
        response: { 201: CommentSchema, 401: ErrorSchema, 404: ErrorSchema, 429: ErrorSchema, 503: ErrorSchema },
      },
    )
    .post(
      "/comments/:id/report",
      ({ params, bearer, request }) => {
        const by = voter(bearer);
        const found = existing(params.id);
        if (found.hidden) throw new ApiError(404, "Comment not found");
        reportComment(db, found.id, by, address(request));
        return { ok: true };
      },
      { params: IdParams, response: { 200: DeleteResponseSchema, 401: ErrorSchema, 404: ErrorSchema, 503: ErrorSchema } },
    )
    .delete(
      "/comments/:id",
      ({ params, bearer }) => {
        const found = existing(params.id);
        if (!isAdmin(config, bearer) && found.voterId !== voter(bearer).id) throw new ApiError(403, "Only its author can delete a comment");
        removeComment(db, found.id);
        return { ok: true };
      },
      {
        params: IdParams,
        response: { 200: DeleteResponseSchema, 401: ErrorSchema, 403: ErrorSchema, 404: ErrorSchema, 503: ErrorSchema },
      },
    );
}
