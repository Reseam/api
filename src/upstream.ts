import { Value } from "@sinclair/typebox/value";
import { cached } from "./cached";
import type { Config } from "./config";
import { ApiError } from "./errors";
import { ReleaseFileSchema, type ReleaseFile } from "./schemas/releases";

type ReleaseSource = "patches" | "manager";

export function createUpstream(config: Config, fetcher: typeof fetch = fetch) {
  async function fetchRelease(source: ReleaseSource, url: string): Promise<ReleaseFile> {
    if (!url)
      throw new ApiError(503, `${source} upstream URL is not configured`);

    const response = await fetcher(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new ApiError(
        502,
        `${source} upstream returned ${response.status} ${response.statusText || "error"}`,
      );
    }

    const json = await response.json();
    if (!Value.Check(ReleaseFileSchema, json)) {
      throw new ApiError(
        502,
        `${source} upstream returned invalid release metadata`,
      );
    }

    return json;
  }

  return {
    patches: cached(config.cacheTtl, () => fetchRelease("patches", config.patchesUrl)),
    manager: cached(config.cacheTtl, () => fetchRelease("manager", config.managerUrl)),
  };
}

export type Upstream = ReturnType<typeof createUpstream>;
