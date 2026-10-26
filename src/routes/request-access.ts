import { t } from "elysia";
import { addressHash, tokenHash } from "../auth";
import type { Config } from "../config";
import type { DrizzleDb } from "../db/client";
import { findVoter } from "../db/voters";
import { ApiError } from "../errors";

export const IdParams = t.Object({ id: t.Number({ minimum: 1 }) });

export function requestAccess(config: Config, db: DrizzleDb) {
  const requireEnabled = () => {
    if (!config.turnstileSecret || !config.requestsSecret)
      throw new ApiError(503, "Requests need TURNSTILE_SECRET and REQUESTS_SECRET");
  };
  const clientAddress = (request: Request) => request.headers.get(config.clientIpHeader) ?? "unknown";
  return {
    requireEnabled,
    clientAddress,
    address: (request: Request) => addressHash(config, clientAddress(request)),
    voter(token: string | undefined) {
      requireEnabled();
      const found = token ? findVoter(db, tokenHash(token)) : undefined;
      if (!found) throw new ApiError(401, "Unknown voter token");
      return found;
    },
  };
}
