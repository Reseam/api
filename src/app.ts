import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { createCommunity } from "./community";
import { readConfig, type Config } from "./config";
import { publicCors } from "./cors";
import { openDatabase, type DrizzleDb } from "./db/client";
import { ApiError } from "./errors";
import { createRelay } from "./relay";
import { announcementsRoutes } from "./routes/announcements";
import { healthRoutes } from "./routes/health";
import { managerRoutes } from "./routes/manager";
import { commentsRoutes } from "./routes/comments";
import { communityRoutes } from "./routes/community";
import { moderationRoutes } from "./routes/moderation";
import { proxyRoutes } from "./routes/proxy";
import { requestsRoutes } from "./routes/requests";
import { translateRoutes } from "./routes/translate";
import { votersRoutes } from "./routes/voters";
import { createScreener } from "./screening";
import { createTranslator } from "./translate";
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
  const fetcher = options.fetcher ?? fetch;
  const upstream = createUpstream(config, fetcher);
  const community = createCommunity(config, fetcher);
  const relay = createRelay(config, fetcher);
  const screen = createScreener(config, fetcher);
  const translator = createTranslator(config, fetcher);
  const version = options.version ?? "0.0.0";

  return new Elysia()
    .use(publicCors)
    .use(
      openapi({
        documentation: {
          info: {
            title: "Reseam API",
            version,
          },
          tags: [
            { name: "Proxy", description: "Release index files and download redirects" },
            { name: "Manager", description: "Latest stable Reseam Manager for clients before 0.32" },
            { name: "Community", description: "Patch bundles listed by the community organization" },
            { name: "Announcements", description: "Operational notices" },
            { name: "Requests", description: "Patch requests, votes, comments and reports" },
            { name: "Translate", description: "Translation" },
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
        return status(error.statusCode, { error: error.message });
      }

      if (code === "VALIDATION") {
        const details = error.all.map((e) => `${e.path} ${e.message}`).join("; ");
        return status(400, { error: `Invalid ${error.type}: ${details}` });
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
        patchesIndex: "/patches.json",
        managerIndex: "/manager.json",
        community: "/v1/community",
        announcements: "/v1/announcements",
        requests: "/v1/requests",
        translate: "/v1/translate",
        health: "/v1/health",
      },
    }))
    .use(proxyRoutes(config, upstream))
    .use(managerRoutes(config, upstream))
    .use(communityRoutes(config, community))
    .use(announcementsRoutes(config, db, relay))
    .use(votersRoutes(config, db, fetcher))
    .use(requestsRoutes(config, db, { upstream, screen, relay }))
    .use(commentsRoutes(config, db, { screen, relay }))
    .use(moderationRoutes(config, db))
    .use(translateRoutes(config, translator))
    .use(healthRoutes(version));
}

export type App = ReturnType<typeof createApp>;
