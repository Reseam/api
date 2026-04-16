import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { readConfig, type Config } from "./config";
import { openDatabase, type DrizzleDb } from "./db/client";
import { ApiError } from "./errors";
import { announcementsRoutes } from "./routes/announcements";
import { healthRoutes } from "./routes/health";
import { managerRoutes } from "./routes/manager";
import { patchesRoutes } from "./routes/patches";
import { createUpstream } from "./upstream";

type AppOptions = {
  config?: Config;
  db?: DrizzleDb;
  fetcher?: typeof fetch;
  version?: string;
};

export function createApp(options: AppOptions = {}) {
  const config = options.config ?? readConfig();
  const db = options.db ?? openDatabase(config.dbPath);
  const upstream = createUpstream(config, options.fetcher ?? fetch);
  const version = options.version ?? "0.0.0";

  return new Elysia()
    .use(
      cors({
        origin: config.allowedOrigins.length ? config.allowedOrigins : true,
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        exposeHeaders: ["ETag"],
        maxAge: 300,
      }),
    )
    .use(
      openapi({
        documentation: {
          info: {
            title: "Reseam API",
            version,
          },
          tags: [
            { name: "Patches", description: "Patch bundle release metadata" },
            { name: "Manager", description: "Manager binary release metadata" },
            { name: "Announcements", description: "Operational notices" },
            { name: "Health", description: "Service health" },
          ],
          components: {
            securitySchemes: {
              bearerAuth: { type: "http", scheme: "bearer" },
            },
          },
        },
      }),
    )
    .onError(({ code, error, status }) => {
      if (error instanceof ApiError) {
        return status(error.statusCode as 400, { error: error.message });
      }

      if (code === "VALIDATION") {
        return status(400, { error: error.message });
      }

      if (code === "NOT_FOUND") {
        return status(404, { error: "Not found" });
      }

      console.error(error);
      return status(500, { error: "Internal server error" });
    })
    .get("/", () => ({
      name: "Reseam API",
      version,
      docs: "/openapi",
      endpoints: {
        patches: "/v1/patches",
        manager: "/v1/manager",
        announcements: "/v1/announcements",
        health: "/v1/health",
      },
    }))
    .use(patchesRoutes(config, upstream))
    .use(managerRoutes(config, upstream))
    .use(announcementsRoutes(config, db))
    .use(healthRoutes(version));
}

export type App = ReturnType<typeof createApp>;
