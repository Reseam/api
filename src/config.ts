export type Config = {
  port: number;
  patchesUrl: string;
  managerUrl: string;
  adminToken: string;
  dbPath: string;
  cacheTtl: number;
  allowedOrigins: string[];
  nodeEnv: string;
};

const DEFAULT_PATCHES_URL = "https://reseam.app/patches.json";
const DEFAULT_MANAGER_URL = "https://reseam.app/manager.json";
const DEFAULT_ALLOWED_ORIGINS = "https://reseam.app,https://manager.reseam.app";

export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: readInt(env.PORT, 4000),
    patchesUrl: env.PATCHES_URL || DEFAULT_PATCHES_URL,
    managerUrl: env.MANAGER_URL || DEFAULT_MANAGER_URL,
    adminToken: env.ADMIN_TOKEN || "",
    dbPath: env.DB_PATH || "./data/reseam.db",
    cacheTtl: readInt(env.CACHE_TTL, 300),
    allowedOrigins: splitList(env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS),
    nodeEnv: env.NODE_ENV || "development",
  };
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
