import { Elysia } from "elysia";
import { clientAddress } from "../auth";
import { httpCache, sharedCache } from "../cache";
import type { Config } from "../config";
import { ApiError } from "../errors";
import { ErrorSchema } from "../schemas/releases";
import { LanguagesSchema, TranslateSchema, TranslationsSchema } from "../schemas/translate";
import { createRateLimiter, type Translator } from "../translate";

const MAX_BYTES = 20000;

export function translateRoutes(config: Config, translator: Translator | undefined) {
  const allow = createRateLimiter(config.translateRate);
  const requireEngine = () => {
    if (!translator) throw new ApiError(503, "Translation needs TRANSLATE_URL");
    return translator;
  };

  const languages = new Elysia({ tags: ["Translate"] })
    .use(httpCache(sharedCache(config.cacheTtl)))
    .get("/translate/languages", () => requireEngine().languages(), {
      response: { 200: LanguagesSchema, 502: ErrorSchema, 503: ErrorSchema },
    });

  return new Elysia({ prefix: "/v1", tags: ["Translate"] })
    .use(languages)
    .post(
      "/translate",
      async ({ body, request }) => {
        const engine = requireEngine();
        if (!allow(clientAddress(config, request))) throw new ApiError(429, "Too many translations from this address");
        if (body.texts.reduce((bytes, text) => bytes + Buffer.byteLength(text), 0) > MAX_BYTES)
          throw new ApiError(413, `More than ${MAX_BYTES} bytes of text`);
        return { translations: await engine.translate(body.from, body.to, body.texts) };
      },
      {
        body: TranslateSchema,
        response: { 200: TranslationsSchema, 400: ErrorSchema, 413: ErrorSchema, 429: ErrorSchema, 502: ErrorSchema, 503: ErrorSchema },
      },
    );
}
