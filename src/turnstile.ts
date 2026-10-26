import { Value } from "@sinclair/typebox/value";
import { t } from "elysia";
import type { Config } from "./config";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const ResultSchema = t.Object({ success: t.Boolean() });

export async function verifyTurnstile(config: Config, fetcher: typeof fetch, token: string, ip: string) {
  const response = await fetcher(VERIFY_URL, {
    method: "POST",
    body: new URLSearchParams({ secret: config.turnstileSecret, response: token, remoteip: ip }),
  });
  if (!response.ok) throw new Error(`Turnstile returned ${response.status}`);
  return Value.Parse(ResultSchema, await response.json()).success;
}
