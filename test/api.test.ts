import { describe, expect, it } from "bun:test";
import { createApp } from "../src/app";
import type { Config } from "../src/config";
import { openDatabase } from "../src/db/client";

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
  adminToken: "secret",
  dbPath: ":memory:",
  cacheTtl: 300,
  allowedOrigins: [],
  nodeEnv: "test",
};

function mockFetch(fn: () => Promise<Response>): typeof fetch {
  return Object.assign(fn, { preconnect() {} }) as typeof fetch;
}

const okFetcher = mockFetch(async () => Response.json(releaseFile));

function testApp(fetcher?: typeof fetch) {
  return createApp({
    config,
    fetcher: fetcher ?? okFetcher,
    db: openDatabase(":memory:"),
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

describe("Patches", () => {
  it("returns latest stable release", async () => {
    const res = await testApp().handle(req("/v1/patches"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.release.version).toBe("v2.0.0");
    expect(res.headers.get("etag")).toStartWith('"');
    expect(res.headers.get("cache-control")).toContain("s-maxage=300");
  });

  it("returns prerelease", async () => {
    const res = await testApp().handle(req("/v1/patches/prerelease"));
    expect(res.status).toBe(200);
    expect((await res.json()).release.version).toBe("v2.1.0-beta");
  });

  it("returns stable version string", async () => {
    const res = await testApp().handle(req("/v1/patches/version"));
    expect(res.status).toBe(200);
    expect((await res.json()).version).toBe("v2.0.0");
  });

  it("returns prerelease version string", async () => {
    const res = await testApp().handle(req("/v1/patches/version/prerelease"));
    expect(res.status).toBe(200);
    expect((await res.json()).version).toBe("v2.1.0-beta");
  });

  it("returns stable history", async () => {
    const body = await (await testApp().handle(req("/v1/patches/history"))).json();
    expect(body.releases).toHaveLength(1);
    expect(body.releases[0].version).toBe("v2.0.0");
  });

  it("returns full history including prereleases", async () => {
    const body = await (await testApp().handle(req("/v1/patches/history/prerelease"))).json();
    expect(body.releases).toHaveLength(2);
  });

  it("returns public key", async () => {
    const res = await testApp().handle(req("/v1/patches/keys"));
    expect(res.status).toBe(200);
    expect((await res.json()).public_key).toBe(releaseFile.bundle.public_key);
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

  it("returns prerelease", async () => {
    const res = await testApp().handle(req("/v1/manager/prerelease"));
    expect(res.status).toBe(200);
    expect((await res.json()).release.version).toBe("v2.1.0-beta");
  });

  it("returns version string", async () => {
    const res = await testApp().handle(req("/v1/manager/version"));
    expect(res.status).toBe(200);
    expect((await res.json()).version).toBe("v2.0.0");
  });

  it("returns stable history", async () => {
    const body = await (await testApp().handle(req("/v1/manager/history"))).json();
    expect(body.releases).toHaveLength(1);
  });
});

describe("Announcements", () => {
  it("starts empty", async () => {
    const res = await testApp().handle(req("/v1/announcements"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("creates, gets, updates, and deletes an announcement", async () => {
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

    const getRes = await app.handle(req(`/v1/announcements/${created.id}`));
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get("etag")).toStartWith('"');
    expect((await getRes.json()).title).toBe("Maintenance");

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

    expect((await app.handle(req(`/v1/announcements/${created.id}`))).status).toBe(404);
  });

  it("filters by tag", async () => {
    const app = testApp();
    const post = (title: string, tag: string) =>
      app.handle(req("/v1/announcements", {
        method: "POST",
        headers: { ...auth, ...json },
        body: JSON.stringify({ title, tags: [tag] }),
      }));

    await post("A", "alpha");
    await post("B", "beta");

    const alpha = await (await app.handle(req("/v1/announcements?tag=alpha"))).json();
    expect(alpha).toHaveLength(1);
    expect(alpha[0].title).toBe("A");

    const beta = await (await app.handle(req("/v1/announcements?tag=beta"))).json();
    expect(beta).toHaveLength(1);
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

  it("returns 404 for missing announcement", async () => {
    expect((await testApp().handle(req("/v1/announcements/9999"))).status).toBe(404);
  });
});

describe("Upstream errors", () => {
  it("returns 502 when upstream fails", async () => {
    const res = await testApp(mockFetch(async () => new Response("error", { status: 500 })))
      .handle(req("/v1/patches"));
    expect(res.status).toBe(502);
  });

  it("returns 502 when upstream returns invalid data", async () => {
    const res = await testApp(mockFetch(async () => Response.json({ invalid: true })))
      .handle(req("/v1/patches"));
    expect(res.status).toBe(502);
  });
});
