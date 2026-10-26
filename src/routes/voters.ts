import { bearer } from "@elysiajs/bearer";
import { Elysia, t } from "elysia";
import { newVoterToken, tokenHash } from "../auth";
import { httpCache } from "../cache";
import type { Config } from "../config";
import type { DrizzleDb } from "../db/client";
import { since } from "../db/counts";
import { countVoters, createVoter, voterActivity } from "../db/voters";
import { ApiError } from "../errors";
import { ErrorSchema } from "../schemas/releases";
import { VoterActivitySchema, VoterSchema } from "../schemas/requests";
import { verifyTurnstile } from "../turnstile";
import { requestAccess } from "./request-access";

const VOTERS_PER_ADDRESS_PER_HOUR = 20;

export function votersRoutes(config: Config, db: DrizzleDb, fetcher: typeof fetch) {
  const access = requestAccess(config, db);

  const activity = new Elysia({ tags: ["Requests"] })
    .use(bearer())
    .use(httpCache("private, no-store"))
    .get("/me", ({ bearer }) => voterActivity(db, access.voter(bearer).id), {
      response: { 200: VoterActivitySchema, 401: ErrorSchema, 503: ErrorSchema },
    });

  return new Elysia({ prefix: "/v1/voters", tags: ["Requests"] })
    .use(activity)
    .post(
      "/",
      async ({ body, request, set }) => {
        access.requireEnabled();
        const hash = access.address(request);
        if (countVoters(db, hash, since(1)) >= VOTERS_PER_ADDRESS_PER_HOUR) throw new ApiError(429, "Too many voters from this address");
        if (!(await verifyTurnstile(config, fetcher, body.turnstile, access.clientAddress(request))))
          throw new ApiError(403, "Turnstile check failed");
        const token = newVoterToken();
        createVoter(db, tokenHash(token), hash);
        set.status = 201;
        return { token };
      },
      {
        body: t.Object({ turnstile: t.String({ minLength: 1, maxLength: 2048 }) }),
        response: { 201: VoterSchema, 403: ErrorSchema, 429: ErrorSchema, 503: ErrorSchema },
      },
    );
}
