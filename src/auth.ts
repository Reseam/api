import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Config } from "./config";

export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBuf = enc.encode(a);
  const bBuf = enc.encode(b);
  if (aBuf.byteLength !== bBuf.byteLength) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function isAdmin(config: Config, bearer: string | undefined) {
  return !!config.adminToken && safeEqual(bearer ?? "", config.adminToken);
}

export function adminRefusal(config: Config, bearer: string | undefined) {
  if (!config.adminToken) return { code: 503, error: "ADMIN_TOKEN is not configured" } as const;
  if (!isAdmin(config, bearer)) return { code: 401, error: "Unauthorized" } as const;
}

export function newVoterToken() {
  return randomBytes(32).toString("base64url");
}

export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Keyed so a leaked database does not give the addresses back by hashing every IPv4 address.
export function addressHash(config: Config, address: string) {
  return createHmac("sha256", config.requestsSecret).update(address).digest("hex").slice(0, 32);
}
