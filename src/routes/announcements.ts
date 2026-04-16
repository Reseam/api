import { bearer } from "@elysiajs/bearer";
import { Elysia, t } from "elysia";
import type { Config } from "../config";
import type { DrizzleDb } from "../db/client";
import {
  createAnnouncement,
  getAnnouncement,
  listAnnouncements,
  removeAnnouncement,
  updateAnnouncement,
} from "../db/announcements";
import { ApiError } from "../errors";
import {
  AnnouncementListSchema,
  AnnouncementQuerySchema,
  AnnouncementSchema,
  CreateAnnouncementSchema,
  DeleteResponseSchema,
  UpdateAnnouncementSchema,
} from "../schemas/announcements";
import { ErrorSchema } from "../schemas/releases";
import { safeEqual, setCacheHeaders } from "../utils";

export function announcementsRoutes(config: Config, db: DrizzleDb) {
  return new Elysia({ prefix: "/v1/announcements", tags: ["Announcements"] })
    .use(bearer())
    .get(
      "/",
      ({ query, set }) => {
        const body = listAnnouncements(db, {
          tag: query.tag,
          includeArchived: query.archived === true,
        });
        setCacheHeaders(set, config.cacheTtl, body);
        return body;
      },
      {
        query: AnnouncementQuerySchema,
        response: { 200: AnnouncementListSchema },
      },
    )
    .get(
      "/:id",
      ({ params, set }) => {
        const body = getAnnouncement(db, params.id);
        if (!body) throw new ApiError(404, "Announcement not found");
        setCacheHeaders(set, config.cacheTtl, body);
        return body;
      },
      {
        params: t.Object({ id: t.Number({ minimum: 1 }) }),
        response: { 200: AnnouncementSchema, 404: ErrorSchema },
      },
    )
    .guard({
      beforeHandle({ bearer, set, status }) {
        if (!config.adminToken)
          return status(503, { error: "ADMIN_TOKEN is not configured" });
        if (!safeEqual(bearer ?? "", config.adminToken)) {
          set.headers["WWW-Authenticate"] = 'Bearer realm="reseam-admin"';
          return status(401, { error: "Unauthorized" });
        }
      },
    })
    .post(
      "/",
      ({ body, set }) => {
        set.status = 201;
        return createAnnouncement(db, body);
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
