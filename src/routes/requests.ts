import { bearer } from "@elysiajs/bearer";
import { Elysia } from "elysia";
import { isAdmin } from "../auth";
import { httpCache } from "../cache";
import type { Config } from "../config";
import type { DrizzleDb } from "../db/client";
import { since } from "../db/counts";
import { countRequests, createRequest, getRequest, listRequests, openRequests } from "../db/requests";
import { addVote, countVotes, removeVote, report } from "../db/votes";
import { ApiError } from "../errors";
import type { Relay } from "../relay";
import { DeleteResponseSchema } from "../schemas/announcements";
import { ErrorSchema } from "../schemas/releases";
import {
  CreateRequestSchema,
  DuplicateSchema,
  RequestListSchema,
  RequestQuerySchema,
  RequestSchema,
  VotesSchema,
} from "../schemas/requests";
import type { Screener } from "../screening";
import type { Upstream } from "../upstream";
import { IdParams, requestAccess } from "./request-access";

const REQUESTS_PER_VOTER_PER_DAY = 3;
const REQUESTS_PER_ADDRESS_PER_DAY = 10;
const VOTES_PER_REQUEST_PER_ADDRESS_PER_DAY = 3;
const SCREENED_CANDIDATES = 100;

type Services = { upstream: Upstream; screen?: Screener; relay: Relay };

export function requestsRoutes(config: Config, db: DrizzleDb, { upstream, screen, relay }: Services) {
  const { address, voter } = requestAccess(config, db);
  const visible = (id: number) => {
    const found = getRequest(db, id);
    if (!found || found.status === "hidden") throw new ApiError(404, "Request not found");
    return found;
  };
  const packages = async () => {
    const latest = (await upstream.patches()).releases.find((release) => release.patches);
    return [...new Set((latest?.patches ?? []).flatMap((patch) =>
      patch.compatibility.kind === "packages" ? patch.compatibility.packages.map((target) => target.package) : []))];
  };

  const listing = new Elysia({ tags: ["Requests"] })
    .use(bearer())
    .use(httpCache("no-cache"))
    .get("/requests", ({ query, bearer }) => listRequests(db, query, isAdmin(config, bearer)), {
      query: RequestQuerySchema,
      response: { 200: RequestListSchema },
    });

  return new Elysia({ prefix: "/v1", tags: ["Requests"] })
    .use(bearer())
    .use(listing)
    .post(
      "/requests",
      async ({ body, bearer, request, status }) => {
        const author = voter(bearer);
        const hash = address(request);
        if (countRequests(db, { voterId: author.id }, since(24)) >= REQUESTS_PER_VOTER_PER_DAY ||
          countRequests(db, { ipHash: hash }, since(24)) >= REQUESTS_PER_ADDRESS_PER_DAY)
          throw new ApiError(429, "Too many requests today");

        const screening = screen &&
          (await screen.request(body, openRequests(db, body.app, SCREENED_CANDIDATES), await packages()).catch((error: Error) => {
            console.error(`screening: ${error.message}`);
            return undefined;
          }));
        const duplicate = screening?.duplicateOf ? getRequest(db, screening.duplicateOf) : undefined;
        if (duplicate && !body.force) return status(409, { error: "This looks like an existing request", duplicate });

        const created = createRequest(
          db,
          { title: body.title, body: body.body, app: body.app ?? screening?.app ?? undefined, status: screening?.spam ? "hidden" : "open" },
          author,
          hash,
        );
        relay({ type: "request", request: created });
        return status(201, created);
      },
      {
        body: CreateRequestSchema,
        response: { 201: RequestSchema, 401: ErrorSchema, 409: DuplicateSchema, 429: ErrorSchema, 503: ErrorSchema },
      },
    )
    .put(
      "/requests/:id/vote",
      ({ params, bearer, request }) => {
        const by = voter(bearer);
        const hash = address(request);
        visible(params.id);
        if (countVotes(db, params.id, hash, since(24)) >= VOTES_PER_REQUEST_PER_ADDRESS_PER_DAY)
          throw new ApiError(429, "Too many votes on this request from this address");
        addVote(db, params.id, by, hash);
        return { votes: visible(params.id).votes };
      },
      { params: IdParams, response: { 200: VotesSchema, 401: ErrorSchema, 404: ErrorSchema, 429: ErrorSchema, 503: ErrorSchema } },
    )
    .delete(
      "/requests/:id/vote",
      ({ params, bearer }) => {
        const by = voter(bearer);
        visible(params.id);
        removeVote(db, params.id, by);
        return { votes: visible(params.id).votes };
      },
      { params: IdParams, response: { 200: VotesSchema, 401: ErrorSchema, 404: ErrorSchema, 503: ErrorSchema } },
    )
    .post(
      "/requests/:id/report",
      ({ params, bearer, request }) => {
        const by = voter(bearer);
        visible(params.id);
        report(db, params.id, by, address(request));
        return { ok: true };
      },
      { params: IdParams, response: { 200: DeleteResponseSchema, 401: ErrorSchema, 404: ErrorSchema, 503: ErrorSchema } },
    );
}
