import { Elysia, t } from "elysia";
import type { Config } from "../config";
import { ApiError } from "../errors";
import type { Upstream } from "../upstream";
import { setCacheHeaders } from "../utils";

const AssetParam = /^[A-Za-z0-9._-][A-Za-z0-9._+-]*$/;

function assertAsset(value: string, field: string) {
  if (!AssetParam.test(value)) throw new ApiError(400, `Invalid ${field}`);
}

export function proxyRoutes(config: Config, upstream: Upstream) {
  return new Elysia({ tags: ["Proxy"] })
    .get(
      "/patches.json",
      async ({ set }) => {
        const body = await upstream.patches();
        setCacheHeaders(set, config.cacheTtl, body);
        return body;
      },
    )
    .get(
      "/manager.json",
      async ({ set }) => {
        const body = await upstream.manager();
        setCacheHeaders(set, config.cacheTtl, body);
        return body;
      },
    )
    .get(
      "/patches/:tag/:name",
      ({ params, redirect }) => {
        assertAsset(params.tag, "tag");
        assertAsset(params.name, "name");
        return redirect(
          `${config.patchesBundleBaseUrl}/${params.tag}/${params.name}`,
          302,
        );
      },
      {
        params: t.Object({ tag: t.String(), name: t.String() }),
      },
    )
    .get(
      "/manager/:tag/:name",
      ({ params, redirect }) => {
        assertAsset(params.tag, "tag");
        assertAsset(params.name, "name");
        return redirect(
          `${config.managerBinaryBaseUrl}/${params.tag}/${params.name}`,
          302,
        );
      },
      {
        params: t.Object({ tag: t.String(), name: t.String() }),
      },
    );
}
