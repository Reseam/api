import type { Config } from "../config";
import type { Upstream } from "../upstream";
import { createReleaseRoutes } from "./releases";

export function managerRoutes(config: Config, upstream: Upstream) {
  return createReleaseRoutes(
    "/v1/manager",
    "Manager",
    config,
    upstream.manager,
  );
}
