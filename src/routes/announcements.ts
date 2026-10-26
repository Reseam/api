import { bearer } from "@elysiajs/bearer";
import { Elysia, t } from "elysia";
import { adminRefusal } from "../auth";
import { httpCache } from "../cache";
import type { Config } from "../config";
import type { DrizzleDb } from "../db/client";
import {
  createAnnouncement,
  listAnnouncements,
  removeAnnouncement,
  updateAnnouncement,
} from "../db/announcements";
import { ApiError } from "../errors";
import type { Relay } from "../relay";
import {
  AnnouncementListSchema,
  AnnouncementQuerySchema,
  AnnouncementSchema,
  CreateAnnouncementSchema,
  DeleteResponseSchema,
  UpdateAnnouncementSchema,
} from "../schemas/announcements";
import { ErrorSchema } from "../schemas/releases";

export function announcementsRoutes(config: Config, db: DrizzleDb, relay: Relay) {
  return new Elysia({ prefix: "/v1/announcements", tags: ["Announcements"] })
    .use(bearer())
    .use(httpCache("no-cache"))
    .get(
      "/",
      ({ query }) => listAnnouncements(db, { includeArchived: query.archived === true }),
      {
        query: AnnouncementQuerySchema,
        response: { 200: AnnouncementListSchema },
      },
    )
    .guard({
      beforeHandle({ bearer, set, status }) {
        const refusal = adminRefusal(config, bearer);
        if (refusal?.code === 401) set.headers["WWW-Authenticate"] = 'Bearer realm="reseam-admin"';
        if (refusal) return status(refusal.code, { error: refusal.error });
      },
    })
    .post(
      "/",
      ({ body, set }) => {
        const created = createAnnouncement(db, body)!;
        relay({ type: "announcement", announcement: created });
        set.status = 201;
        return created;
      },
      {
        body: CreateAnnouncementSchema,
        response: {
          201: AnnouncementSchema,
          401: ErrorSchema,
          503: ErrorSchema,
        },
      },
    )
    .patch(
      "/:id",
      ({ params, body }) => {
        const announcement = updateAnnouncement(db, params.id, body);
        if (!announcement) throw new ApiError(404, "Announcement not found");
        return announcement;
      },
      {
        params: t.Object({ id: t.Number({ minimum: 1 }) }),
        body: UpdateAnnouncementSchema,
        response: {
          200: AnnouncementSchema,
          401: ErrorSchema,
          404: ErrorSchema,
          503: ErrorSchema,
        },
      },
    )
    .delete(
      "/:id",
      ({ params }) => {
        const deleted = removeAnnouncement(db, params.id);
        if (!deleted) throw new ApiError(404, "Announcement not found");
        return { ok: true };
      },
      {
        params: t.Object({ id: t.Number({ minimum: 1 }) }),
        response: {
          200: DeleteResponseSchema,
          401: ErrorSchema,
          404: ErrorSchema,
          503: ErrorSchema,
        },
      },
    );
}
