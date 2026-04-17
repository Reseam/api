export type Config = {
  port: number;
  patchesUrl: string;
  managerUrl: string;
  patchesBundleBaseUrl: string;
  managerBinaryBaseUrl: string;
  adminToken: string;
  dbPath: string;
  cacheTtl: number;
  allowedOrigins: string[];
  nodeEnv: string;
};

const DEFAULT_PATCHES_URL =
  "https://git.reseam.app/reseam/patches/releases/latest/download/patches.json";
const DEFAULT_MANAGER_URL =
  "https://git.reseam.app/reseam/manager/releases/latest/download/manager.json";
const DEFAULT_PATCHES_BUNDLE_BASE_URL =
  "https://git.reseam.app/reseam/patches/releases/download";
const DEFAULT_MANAGER_BINARY_BASE_URL =
  "https://git.reseam.app/reseam/manager/releases/download";
const DEFAULT_ALLOWED_ORIGINS = "https://reseam.app,https://manager.reseam.app";

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
    cacheTtl: readInt(env.CACHE_TTL, 300),
    allowedOrigins: splitList(env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS),
    nodeEnv: env.NODE_ENV || "development",
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

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
