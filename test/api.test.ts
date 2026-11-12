import { describe, expect, it } from "bun:test";
import { createApp } from "../src/app";
import type { Config } from "../src/config";
import { openDatabase, type DrizzleDb } from "../src/db/client";
import { tags } from "../src/db/schema";
import { TranslateSchema } from "../src/schemas/translate";

const releaseFile = {
  bundle: {
    name: "Reseam Patches",
    author: "Reseam",
    description: "Official patches",
    homepage: "https://reseam.app",
    public_key:
      "a1f86ade3448ccb877160864c9bdd135bb807e94466b43a88c566bcdae9c3753",
  },
  releases: [
    {
      version: "v2.0.0",
      created_at: "2026-03-23T06:50:11Z",
      description: "Stable",
      download_url: "https://reseam.app/patches.reseam",
      prerelease: false,
    },
    {
      version: "v2.1.0-beta",
      created_at: "2026-03-24T06:50:11Z",
      description: "Beta",
      download_url: "https://reseam.app/patches-beta.reseam",
      prerelease: true,
    },
  ],
};

const config: Config = {
  port: 4000,
  patchesUrl: "https://example.test/patches.json",
  managerUrl: "https://example.test/manager.json",
  patchesBundleBaseUrl: "https://git.example.test/reseam/patches/releases/download",
  managerBinaryBaseUrl: "https://git.example.test/reseam/manager/releases/download",
  adminToken: "secret",
  dbPath: ":memory:",
  cacheTtl: 300,
  clientIpHeader: "cf-connecting-ip",
  requestsSecret: "",
  turnstileSecret: "",
  openRouterApiKey: "",
  screeningModel: "~typesafe/jev-latest",
  relayUrl: "",
  relaySecret: "",
  translateUrl: "",
  translateToken: "",
  translateRate: 120,
  translateCacheEntries: 1000,
  forgejoUrl: "https://git.example.test",
  communityOrg: "reseam-community",
  communityTtl: 600,
};

function mockFetch(fn: () => Promise<Response>): typeof fetch {
  return Object.assign(fn, { preconnect() {} }) as typeof fetch;
}

const okFetcher = mockFetch(async () => Response.json(releaseFile));

function testApp(options: { fetcher?: typeof fetch; config?: Partial<Config>; db?: DrizzleDb } = {}) {
  return createApp({
    config: { ...config, ...options.config },
    fetcher: options.fetcher ?? okFetcher,
    db: options.db ?? openDatabase(":memory:"),
    version: "test",
  });
}

const BASE = "http://localhost";
const auth = { Authorization: "Bearer secret" };
const json = { "Content-Type": "application/json" };

function req(path: string, init?: RequestInit) {
  return new Request(`${BASE}${path}`, init);
}

describe("Health", () => {
  it("returns ok with version", async () => {
    const res = await testApp().handle(req("/v1/health"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, version: "test" });
  });
});

describe("Manager", () => {
  it("returns latest stable release", async () => {
    const res = await testApp().handle(req("/v1/manager"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.release.version).toBe("v2.0.0");
    expect(res.headers.get("etag")).toStartWith('"');
  });
});

describe("Proxy", () => {
  it("serves patches.json verbatim", async () => {
    const res = await testApp().handle(req("/patches.json"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(releaseFile);
    expect(res.headers.get("etag")).toStartWith('"');
    expect(res.headers.get("cache-control")).toContain("s-maxage=300");
  });

  it("returns 304 when the ETag matches", async () => {
    const app = testApp();
    const first = await app.handle(req("/patches.json"));
    const res = await app.handle(
      req("/patches.json", { headers: { "If-None-Match": first.headers.get("etag")! } }),
    );
    expect(res.status).toBe(304);
    expect(res.headers.get("etag")).toBe(first.headers.get("etag"));
    expect(await res.text()).toBe("");
  });

  it("serves manager.json verbatim", async () => {
    const res = await testApp().handle(req("/manager.json"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(releaseFile);
  });

  it("redirects patches bundle requests to Forgejo", async () => {
    const res = await testApp().handle(
      req("/patches/v1.2.3/reseam-patches.reseam", { redirect: "manual" }),
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "https://git.example.test/reseam/patches/releases/download/v1.2.3/reseam-patches.reseam",
    );
  });

  it("redirects manager binary requests to Forgejo", async () => {
    const res = await testApp().handle(
      req("/manager/v0.1.0/manager-linux-x64", { redirect: "manual" }),
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "https://git.example.test/reseam/manager/releases/download/v0.1.0/manager-linux-x64",
    );
  });

  it("rejects path traversal in bundle params", async () => {
    const res = await testApp().handle(
      req("/patches/..%2Fetc/passwd", { redirect: "manual" }),
    );
    expect(res.status).toBe(400);
  });
});

describe("Announcements", () => {
  it("starts empty", async () => {
    const res = await testApp().handle(req("/v1/announcements"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("creates, lists, updates, and deletes an announcement", async () => {
    const app = testApp();

    const createRes = await app.handle(
      req("/v1/announcements", {
        method: "POST",
        headers: { ...auth, ...json },
        body: JSON.stringify({ title: "Maintenance", content: "Short outage", level: 2, tags: ["Ops", "infra"] }),
      }),
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.title).toBe("Maintenance");
    expect(created.tags).toEqual(["infra", "ops"]);

    const listRes = await app.handle(req("/v1/announcements"));
    expect(listRes.status).toBe(200);
    expect(listRes.headers.get("etag")).toStartWith('"');
    expect((await listRes.json())[0].title).toBe("Maintenance");

    const patchRes = await app.handle(
      req(`/v1/announcements/${created.id}`, {
        method: "PATCH",
        headers: { ...auth, ...json },
        body: JSON.stringify({ title: "Updated", tags: ["ops"] }),
      }),
    );
    expect(patchRes.status).toBe(200);
    expect((await patchRes.json()).title).toBe("Updated");

    const deleteRes = await app.handle(
      req(`/v1/announcements/${created.id}`, { method: "DELETE", headers: auth }),
    );
    expect(deleteRes.status).toBe(200);
    expect((await deleteRes.json()).ok).toBe(true);

    expect(await (await app.handle(req("/v1/announcements"))).json()).toEqual([]);
  });

  it("rejects writes without auth", async () => {
    const res = await testApp().handle(
      req("/v1/announcements", { method: "POST", headers: json, body: JSON.stringify({ title: "Nope" }) }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects writes with wrong token", async () => {
    const res = await testApp().handle(
      req("/v1/announcements", {
        method: "POST",
        headers: { ...auth, Authorization: "Bearer wrong", ...json },
        body: JSON.stringify({ title: "Nope" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 for a missing announcement", async () => {
    const res = await testApp().handle(
      req("/v1/announcements/9999", { method: "PATCH", headers: { ...auth, ...json }, body: JSON.stringify({ title: "Gone" }) }),
    );
    expect(res.status).toBe(404);
  });

  it("hides archived announcements unless requested", async () => {
    const app = testApp();
    const created = await (await app.handle(
      req("/v1/announcements", { method: "POST", headers: { ...auth, ...json }, body: JSON.stringify({ title: "Old" }) }),
    )).json();

    const patchRes = await app.handle(
      req(`/v1/announcements/${created.id}`, {
        method: "PATCH",
        headers: { ...auth, ...json },
        body: JSON.stringify({ archived_at: "2026-01-01T00:00:00Z" }),
      }),
    );
    expect((await patchRes.json()).archived_at).toBe("2026-01-01T00:00:00Z");

    expect(await (await app.handle(req("/v1/announcements"))).json()).toEqual([]);
    expect(await (await app.handle(req("/v1/announcements?archived=true"))).json()).toHaveLength(1);
  });

  it("removes tags no announcement references", async () => {
    const db = openDatabase(":memory:");
    const app = testApp({ db });
    const post = (title: string, tagList: string[]) =>
      app.handle(req("/v1/announcements", { method: "POST", headers: { ...auth, ...json }, body: JSON.stringify({ title, tags: tagList }) }));
    const tagNames = () => db.select({ name: tags.name }).from(tags).all().map((t) => t.name).sort();

    const a = await (await post("A", ["shared", "only-a"])).json();
    await post("B", ["shared"]);
    expect(tagNames()).toEqual(["only-a", "shared"]);

    await app.handle(
      req(`/v1/announcements/${a.id}`, { method: "PATCH", headers: { ...auth, ...json }, body: JSON.stringify({ tags: ["renamed"] }) }),
    );
    expect(tagNames()).toEqual(["renamed", "shared"]);

    await app.handle(req(`/v1/announcements/${a.id}`, { method: "DELETE", headers: auth }));
    expect(tagNames()).toEqual(["shared"]);
  });

  it("returns a readable validation error", async () => {
    const res = await testApp().handle(req("/v1/announcements?archived=1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/^Invalid query: \/archived /);
  });

  it("refuses writes when no admin token is configured", async () => {
    const res = await testApp({ config: { adminToken: "" } }).handle(
      req("/v1/announcements", { method: "POST", headers: { ...auth, ...json }, body: JSON.stringify({ title: "Nope" }) }),
    );
    expect(res.status).toBe(503);
  });
});

describe("Upstream", () => {
  it("returns 502 when upstream fails", async () => {
    const res = await testApp({ fetcher: mockFetch(async () => new Response("error", { status: 500 })) })
      .handle(req("/patches.json"));
    expect(res.status).toBe(502);
  });

  it("returns 502 when upstream returns invalid data", async () => {
    const res = await testApp({ fetcher: mockFetch(async () => Response.json({ invalid: true })) })
      .handle(req("/patches.json"));
    expect(res.status).toBe(502);
  });

  it("serves the last good release when a refresh fails", async () => {
    let calls = 0;
    const fetcher = mockFetch(async () =>
      calls++ === 0 ? Response.json(releaseFile) : new Response("error", { status: 500 }),
    );
    const app = testApp({ fetcher, config: { cacheTtl: 0 } });

    expect((await app.handle(req("/patches.json"))).status).toBe(200);
    const res = await app.handle(req("/patches.json"));
    expect(res.status).toBe(200);
    expect((await res.json()).releases[0].version).toBe("v2.0.0");
    expect(calls).toBe(2);
  });

  it("fetches upstream once for concurrent requests", async () => {
    let calls = 0;
    const fetcher = mockFetch(async () => {
      calls++;
      await Bun.sleep(20);
      return Response.json(releaseFile);
    });
    const app = testApp({ fetcher });

    const responses = await Promise.all(
      ["/patches.json", "/patches.json", "/patches.json"].map((path) => app.handle(req(path))),
    );
    expect(responses.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(calls).toBe(1);
  });
});

describe("Translate", () => {
  function engine(options: { status?: number; body?: unknown } = {}) {
    const calls: { url: string; auth: string | null; body?: typeof TranslateSchema.static }[] = [];
    const fetcher = mockFetch((async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body: typeof TranslateSchema.static | undefined = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, auth: new Headers(init?.headers).get("Authorization"), body });
      if (options.status) return Response.json(options.body ?? { error: "boom" }, { status: options.status });
      if (url.endsWith("/v1/languages")) return Response.json({ pairs: [["es", "en"], ["en", "es"]], pivot: "en" });
      return Response.json({ translations: body!.texts.map((text) => text.toUpperCase()) });
    }) as () => Promise<Response>);
    return { calls, fetcher };
  }
  const translateConfig = { translateUrl: "http://translate.test", translateToken: "engine-token" };
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    req("/v1/translate", { method: "POST", headers: { ...json, ...headers }, body: JSON.stringify(body) });

  it("answers 503 when no engine is configured", async () => {
    const res = await testApp().handle(post({ from: "es", to: "en", texts: ["hola"] }));
    expect(res.status).toBe(503);
  });

  it("translates through the engine with its token", async () => {
    const { calls, fetcher } = engine();
    const app = testApp({ fetcher, config: translateConfig });
    const res = await app.handle(post({ from: "es", to: "en", texts: ["hola", "adiós"] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ translations: ["HOLA", "ADIÓS"] });
    expect(calls).toEqual([
      { url: "http://translate.test/v1/translate", auth: "Bearer engine-token", body: { from: "es", to: "en", texts: ["hola", "adiós"] } },
    ]);
  });

  it("sends only texts missing from the cache, once each, and keeps order", async () => {
    const { calls, fetcher } = engine();
    const app = testApp({ fetcher, config: translateConfig });
    await app.handle(post({ from: "es", to: "en", texts: ["uno"] }));
    const res = await app.handle(post({ from: "ES", to: "en", texts: ["dos", "uno", "dos", "tres"] }));
    expect(await res.json()).toEqual({ translations: ["DOS", "UNO", "DOS", "TRES"] });
    expect(calls.map((c) => c.body!.texts)).toEqual([["uno"], ["dos", "tres"]]);
    await app.handle(post({ from: "es", to: "fr", texts: ["uno"] }));
    expect(calls.length).toBe(3);
  });

  it("rejects bad requests before the engine sees them", async () => {
    const { calls, fetcher } = engine();
    const app = testApp({ fetcher, config: translateConfig });
    for (const body of [
      { from: "es", to: "en", texts: [] },
      { from: "es", to: "en", texts: Array(51).fill("a") },
      { from: "e", to: "en", texts: ["a"] },
      { from: "es; DROP", to: "en", texts: ["a"] },
      { to: "en", texts: ["a"] },
    ])
      expect((await app.handle(post(body))).status).toBe(400);
    expect((await app.handle(post({ from: "es", to: "en", texts: Array(5).fill("a".repeat(5000)) }))).status).toBe(413);
    expect((await app.handle(post({ from: "ja", to: "en", texts: Array(2).fill("あ".repeat(4000)) }))).status).toBe(413);
    expect(calls.length).toBe(0);
  });

  it("passes on the engine's input errors and hides its failures", async () => {
    const unsupported = engine({ status: 400, body: { error: "no model for xx to en" } });
    let res = await testApp({ fetcher: unsupported.fetcher, config: translateConfig }).handle(post({ from: "xx", to: "en", texts: ["a"] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("no model for xx to en");
    const broken = engine({ status: 500 });
    res = await testApp({ fetcher: broken.fetcher, config: translateConfig }).handle(post({ from: "es", to: "en", texts: ["a"] }));
    expect(res.status).toBe(502);
    const down = mockFetch(async () => {
      throw new TypeError("connection refused");
    });
    res = await testApp({ fetcher: down, config: translateConfig }).handle(post({ from: "es", to: "en", texts: ["a"] }));
    expect(res.status).toBe(502);
  });

  it("limits requests per client address", async () => {
    const { fetcher } = engine();
    const app = testApp({ fetcher, config: { ...translateConfig, translateRate: 2 } });
    const from = (ip: string) => post({ from: "es", to: "en", texts: ["hola"] }, { "cf-connecting-ip": ip });
    expect((await app.handle(from("1.1.1.1"))).status).toBe(200);
    expect((await app.handle(from("1.1.1.1"))).status).toBe(200);
    expect((await app.handle(from("1.1.1.1"))).status).toBe(429);
    expect((await app.handle(from("2.2.2.2"))).status).toBe(200);
  });

  it("lists the available directions", async () => {
    const { calls, fetcher } = engine();
    const app = testApp({ fetcher, config: translateConfig });
    const res = await app.handle(req("/v1/translate/languages"));
    expect(await res.json()).toEqual({ pairs: [["es", "en"], ["en", "es"]], pivot: "en" });
    await app.handle(req("/v1/translate/languages"));
    expect(calls.length).toBe(1);
  });
});
