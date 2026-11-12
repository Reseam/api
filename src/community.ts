import { Value } from "@sinclair/typebox/value";
import { cached } from "./cached";
import type { Config } from "./config";
import { ApiError } from "./errors";
import {
  ForgejoReposSchema,
  type CommunityBundle,
  type CommunityDetail,
  type ForgejoRepo,
} from "./schemas/community";
import { ReleaseFileSchema, type ReleaseFile } from "./schemas/releases";

const PAGE_SIZE = 50;
const FETCH_TIMEOUT_MS = 15_000;
const INDEX_FILE = "patches.json";

type Entry = { bundle: CommunityBundle; index: ReleaseFile; readme: string | null };

// The org is the list: adding a repository lists it, archiving one takes it off.
export function createCommunity(config: Config, fetcher: typeof fetch = fetch) {
  const forgejoApi = `${config.forgejoUrl}/api/v1`;
  let previous = new Map<string, Entry>();

  function get(url: string, accept: string) {
    return fetcher(url, {
      headers: { Accept: accept },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  }

  async function repos(): Promise<ForgejoRepo[]> {
    const all: ForgejoRepo[] = [];
    for (let page = 1; ; page++) {
      const url = `${forgejoApi}/orgs/${encodeURIComponent(config.communityOrg)}/repos?limit=${PAGE_SIZE}&page=${page}`;
      const response = await get(url, "application/json");
      if (!response.ok)
        throw new ApiError(502, `Forgejo returned ${response.status} for ${config.communityOrg}`);
      const batch = await response.json();
      if (!Value.Check(ForgejoReposSchema, batch))
        throw new ApiError(502, "Forgejo returned an invalid repository list");
      all.push(...batch);
      if (batch.length < PAGE_SIZE) return all;
    }
  }

  async function index(repository: string): Promise<{ url: string; file: ReleaseFile } | null> {
    for (const url of indexLinks(repository)) {
      const response = await get(url, "application/json");
      if (response.status === 404) continue;
      if (!response.ok) throw new Error(`${url} returned ${response.status}`);
      const file = await response.json();
      if (!Value.Check(ReleaseFileSchema, file)) throw new Error(`${url} is not a patches index`);
      return { url, file };
    }
    return null;
  }

  async function readme(repo: ForgejoRepo): Promise<string | null> {
    const url = `${forgejoApi}/repos/${encodeURIComponent(config.communityOrg)}/${encodeURIComponent(repo.name)}/raw/README.md`;
    const response = await get(url, "text/plain");
    return response.ok ? response.text() : null;
  }

  async function entry(repo: ForgejoRepo): Promise<Entry | null> {
    const repository = sourceOf(repo);
    const found = await index(repository);
    const release = found?.file.releases.find((r) => !r.prerelease);
    const key = found?.file.bundle.public_key;
    if (!found || !release || !key) return null;

    const patches = (release.patches ?? []).filter((patch) => !patch.hidden);
    const targets = patches.map((patch) => patch.compatibility);
    const { bundle } = found.file;
    return {
      bundle: {
        slug: repo.name,
        name: bundle.name,
        author: bundle.author,
        description: bundle.description,
        homepage: bundle.homepage,
        public_key: key,
        repository,
        index_url: found.url,
        version: release.version,
        published_at: release.created_at,
        apps: [...new Set(targets.flatMap((c) => (c.kind === "packages" ? c.packages.map((p) => p.package) : [])))],
        any_app: targets.some((c) => c.kind === "universal"),
        patches: patches.length,
        listed: !repo.archived,
      },
      index: found.file,
      readme: await readme(repo),
    };
  }

  // A repository that fails to load keeps its last good entry, so a host's bad minute doesn't delist it.
  const snapshot = cached(config.communityTtl, async () => {
    const listed = (await repos()).filter((repo) => !repo.private && !repo.name.startsWith("."));
    const entries = await Promise.all(
      listed.map(async (repo) => {
        try {
          return await entry(repo);
        } catch (error) {
          console.warn(`Community repository ${repo.name} failed to load: ${error}`);
          return previous.get(repo.name) ?? null;
        }
      }),
    );
    previous = new Map(
      entries
        .filter((e) => e !== null)
        .sort((a, b) => b.bundle.published_at.localeCompare(a.bundle.published_at))
        .map((e) => [e.bundle.slug, e]),
    );
    return previous;
  });

  return {
    async list(): Promise<CommunityBundle[]> {
      return [...(await snapshot()).values()].map((e) => e.bundle);
    },
    async detail(slug: string): Promise<CommunityDetail> {
      const found = (await snapshot()).get(slug);
      if (!found?.bundle.listed) throw new ApiError(404, "Community bundle not found");
      return { ...found.bundle, releases: found.index.releases, readme: found.readme };
    },
  };
}

function sourceOf(repo: ForgejoRepo) {
  const url = repo.mirror && repo.original_url ? repo.original_url : repo.html_url;
  return url.replace(/\/+$/, "").replace(/\.git$/, "");
}

function indexLinks(repository: string) {
  return [
    `${repository}/releases/latest/download/${INDEX_FILE}`,
    `${repository}/releases/download/latest/${INDEX_FILE}`,
    `${repository}/-/releases/permalink/latest/downloads/${INDEX_FILE}`,
  ];
}

export type Community = ReturnType<typeof createCommunity>;
