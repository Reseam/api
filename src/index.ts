import { createApp } from "./app";
import { readConfig } from "./config";

const config = readConfig();
const app = createApp({ config }).listen(config.port);

console.log(
  `Reseam API listening at http://${app.server?.hostname}:${app.server?.port}`,
);

export type { App } from "./app";
