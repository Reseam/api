import { Elysia } from "elysia";
import type { Config } from "../config";
import { ApiError } from "../errors";
import {
  ErrorSchema,
  ReleaseHistoryResponseSchema,
  ReleaseResponseSchema,
  VersionResponseSchema,
  type ReleaseFile,
} from "../schemas/releases";
import { setCacheHeaders } from "../utils";

type ReleaseLoader = () => Promise<ReleaseFile>;

function findRelease(releases: ReleaseFile["releases"], prerelease: boolean) {
  return releases.find((r) => r.prerelease === prerelease);
}

export function createReleaseRoutes(
  prefix: string,
  tag: string,
  config: Config,
  load: ReleaseLoader,
) {
  return new Elysia({ prefix, tags: [tag] })
    .get(
      "/",
      async ({ set }) => {
        const file = await load();
        const release = findRelease(file.releases, false);
        if (!release) throw new ApiError(404, "No stable release found");
        const body = { bundle: file.bundle, release };
        setCacheHeaders(set, config.cacheTtl, body);
        return body;
      },
      { response: { 200: ReleaseResponseSchema, 404: ErrorSchema } },
    )
    .get(
      "/prerelease",
      async ({ set }) => {
        const file = await load();
        const release = findRelease(file.releases, true);
        if (!release) throw new ApiError(404, "No prerelease found");
        const body = { bundle: file.bundle, release };
        setCacheHeaders(set, config.cacheTtl, body);
        return body;
      },
      { response: { 200: ReleaseResponseSchema, 404: ErrorSchema } },
    )
    .get(
      "/version",
      async ({ set }) => {
        const file = await load();
        const release = findRelease(file.releases, false);
        if (!release) throw new ApiError(404, "No stable release found");
        const body = { version: release.version };
        setCacheHeaders(set, config.cacheTtl, body);
        return body;
      },
      { response: { 200: VersionResponseSchema, 404: ErrorSchema } },
    )
    .get(
      "/history",
      async ({ set }) => {
        const file = await load();
        const body = { bundle: file.bundle, releases: file.releases.filter((r) => !r.prerelease) };
        setCacheHeaders(set, config.cacheTtl, body);
        return body;
      },
      { response: { 200: ReleaseHistoryResponseSchema } },
    );
}
