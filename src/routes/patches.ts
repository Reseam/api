import type { Config } from "../config";
import { ApiError } from "../errors";
import {
  ErrorSchema,
  KeyResponseSchema,
  ReleaseHistoryResponseSchema,
  VersionResponseSchema,
} from "../schemas/releases";
import type { Upstream } from "../upstream";
import { setCacheHeaders } from "../utils";
import { createReleaseRoutes } from "./releases";

export function patchesRoutes(config: Config, upstream: Upstream) {
  return createReleaseRoutes("/v1/patches", "Patches", config, upstream.patches)
    .get(
      "/version/prerelease",
      async ({ set }) => {
        const file = await upstream.patches();
        const release = file.releases.find((r) => r.prerelease);
        if (!release) throw new ApiError(404, "No prerelease found");
        const body = { version: release.version };
        setCacheHeaders(set, config.cacheTtl, body);
        return body;
      },
      { response: { 200: VersionResponseSchema, 404: ErrorSchema } },
    )
    .get(
      "/history/prerelease",
      async ({ set }) => {
        const file = await upstream.patches();
        const body = { bundle: file.bundle, releases: file.releases };
        setCacheHeaders(set, config.cacheTtl, body);
        return body;
      },
      { response: { 200: ReleaseHistoryResponseSchema } },
    )
    .get(
      "/keys",
      async ({ set }) => {
        const file = await upstream.patches();
        if (!file.bundle.public_key)
          throw new ApiError(
            404,
            "No public key is available for this release source",
          );
        const body = { public_key: file.bundle.public_key };
        setCacheHeaders(set, config.cacheTtl, body);
        return body;
      },
      { response: { 200: KeyResponseSchema, 404: ErrorSchema } },
    );
}
