import { Value } from "@sinclair/typebox/value";
import type { Config } from "./config";
import { ApiError } from "./errors";
import { ReleaseFileSchema, type ReleaseFile } from "./schemas/releases";

type ReleaseSource = "patches" | "manager";

type CachedReleaseFile = {
  data: ReleaseFile;
  expiresAt: number;
};

export function createUpstream(config: Config, fetcher: typeof fetch = fetch) {
  const cache = new Map<ReleaseSource, CachedReleaseFile>();
  const inflight = new Map<ReleaseSource, Promise<CachedReleaseFile>>();

  async function load(source: ReleaseSource, url: string): Promise<ReleaseFile> {
    if (!url)
      throw new ApiError(503, `${source} upstream URL is not configured`);

    const cached = cache.get(source);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    let pending = inflight.get(source);
    if (!pending) {
      pending = fetchRelease(source, url)
        .then((data) => {
          const entry: CachedReleaseFile = {
            data,
            expiresAt: Date.now() + config.cacheTtl * 1000,
          };
          cache.set(source, entry);
          inflight.delete(source);
          return entry;
        })
        .catch((err) => {
          inflight.delete(source);
          throw err;
        });
      inflight.set(source, pending);
    }

    return (await pending).data;
  }

  async function fetchRelease(source: ReleaseSource, url: string): Promise<ReleaseFile> {
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

    return json as ReleaseFile;
  }

  return {
    patches() {
      return load("patches", config.patchesUrl);
    },
    manager() {
      return load("manager", config.managerUrl);
    },
  };
}

export type Upstream = ReturnType<typeof createUpstream>;
