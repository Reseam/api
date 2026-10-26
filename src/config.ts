export type Config = {
  port: number;
  patchesUrl: string;
  managerUrl: string;
  patchesBundleBaseUrl: string;
  managerBinaryBaseUrl: string;
  adminToken: string;
  dbPath: string;
  cacheTtl: number;
  clientIpHeader: string;
  requestsSecret: string;
  turnstileSecret: string;
  openRouterApiKey: string;
  screeningModel: string;
  relayUrl: string;
  relaySecret: string;
};

const DEFAULT_PATCHES_URL =
  "https://cdn.reseam.app/patches/patches.json";
const DEFAULT_MANAGER_URL =
  "https://cdn.reseam.app/manager/manager.json";
const DEFAULT_PATCHES_BUNDLE_BASE_URL =
  "https://cdn.reseam.app/patches";
const DEFAULT_MANAGER_BINARY_BASE_URL =
  "https://cdn.reseam.app/manager";

export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: readInt(env.PORT, 4000),
    patchesUrl: env.PATCHES_URL || DEFAULT_PATCHES_URL,
    managerUrl: env.MANAGER_URL || DEFAULT_MANAGER_URL,
    patchesBundleBaseUrl: stripTrailingSlash(
      env.PATCHES_BUNDLE_BASE_URL || DEFAULT_PATCHES_BUNDLE_BASE_URL,
    ),
    managerBinaryBaseUrl: stripTrailingSlash(
      env.MANAGER_BINARY_BASE_URL || DEFAULT_MANAGER_BINARY_BASE_URL,
    ),
    adminToken: env.ADMIN_TOKEN || "",
    dbPath: env.DB_PATH || "./data/reseam.db",
    cacheTtl: readInt(env.CACHE_TTL, 60),
    clientIpHeader: (env.CLIENT_IP_HEADER || "cf-connecting-ip").toLowerCase(),
    requestsSecret: env.REQUESTS_SECRET || "",
    turnstileSecret: env.TURNSTILE_SECRET || "",
    openRouterApiKey: env.OPENROUTER_API_KEY || "",
    screeningModel: env.SCREENING_MODEL || "nace-ai/drex-max",
    relayUrl: stripTrailingSlash(env.RELAY_URL || ""),
    relaySecret: env.RELAY_SECRET || "",
  };
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function readInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
