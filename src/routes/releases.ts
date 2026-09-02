import { Elysia } from "elysia";
import { httpCache } from "../cache";
import type { Config } from "../config";
import { ApiError } from "../errors";
import {
  ErrorSchema,
  ReleaseHistoryResponseSchema,
  ReleaseResponseSchema,
  VersionResponseSchema,
  type ReleaseFile,
} from "../schemas/releases";

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
    .use(httpCache(config.cacheTtl))
    .get(
      "/",
      async () => {
        const file = await load();
        const release = findRelease(file.releases, false);
        if (!release) throw new ApiError(404, "No stable release found");
        return { bundle: file.bundle, release };
      },
      { response: { 200: ReleaseResponseSchema, 404: ErrorSchema } },
    )
    .get(
      "/prerelease",
      async () => {
        const file = await load();
        const release = findRelease(file.releases, true);
        if (!release) throw new ApiError(404, "No prerelease found");
        return { bundle: file.bundle, release };
      },
      { response: { 200: ReleaseResponseSchema, 404: ErrorSchema } },
    )
    .get(
      "/version",
      async () => {
        const file = await load();
        const release = findRelease(file.releases, false);
        if (!release) throw new ApiError(404, "No stable release found");
        return { version: release.version };
      },
      { response: { 200: VersionResponseSchema, 404: ErrorSchema } },
    )
    .get(
      "/history",
      async () => {
        const file = await load();
        return { bundle: file.bundle, releases: file.releases.filter((r) => !r.prerelease) };
      },
      { response: { 200: ReleaseHistoryResponseSchema } },
    );
}
