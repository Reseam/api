import { Value } from "@sinclair/typebox/value";
import type { Static, TSchema } from "elysia";
import type { Config } from "./config";
import { ApiError } from "./errors";
import { ErrorSchema } from "./schemas/releases";
import { LanguagesSchema, TranslationsSchema, type Languages } from "./schemas/translate";

const TIMEOUT_MS = 15000;

export type Translator = {
  translate(from: string, to: string, texts: string[]): Promise<string[]>;
  languages(): Promise<Languages>;
};

export function createTranslator(config: Config, fetcher: typeof fetch): Translator | undefined {
  if (!config.translateUrl) return undefined;
  const cache = new Lru<string>(config.translateCacheEntries);
  let languages: { data: Promise<Languages>; expiresAt: number } | undefined;

  const call = async <S extends TSchema>(path: string, schema: S, body?: unknown): Promise<Static<S>> => {
    const headers = new Headers({ "Content-Type": "application/json" });
    if (config.translateToken) headers.set("Authorization", `Bearer ${config.translateToken}`);
    const response = await fetcher(`${config.translateUrl}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch(() => {
      throw new ApiError(502, "Translation engine is unreachable");
    });
    const json = await response.json().catch(() => undefined);
    if (response.status === 400 && Value.Check(ErrorSchema, json)) throw new ApiError(400, json.error);
    if (!response.ok || !Value.Check(schema, json)) throw new ApiError(502, `Translation engine returned ${response.status}`);
    return json;
  };

  return {
    async translate(from, to, texts) {
      const key = (text: string) => `${from.toLowerCase()}\0${to.toLowerCase()}\0${text}`;
      const cached = texts.map((text) => cache.get(key(text)));
      const missing = [...new Set(texts.filter((_, i) => cached[i] === undefined))];
      if (missing.length === 0) return cached as string[];

      const { translations } = await call("/v1/translate", TranslationsSchema, { from, to, texts: missing });
      if (translations.length !== missing.length) throw new ApiError(502, "Translation engine returned a wrong number of translations");
      const fresh = new Map(missing.map((text, i) => [text, translations[i]!]));
      fresh.forEach((translation, text) => cache.set(key(text), translation));
      return texts.map((text, i) => cached[i] ?? fresh.get(text)!);
    },

    languages() {
      if (!languages || languages.expiresAt <= Date.now()) {
        const data = call("/v1/languages", LanguagesSchema);
        languages = { data, expiresAt: Date.now() + config.cacheTtl * 1000 };
        data.catch(() => (languages = undefined));
      }
      return languages.data;
    },
  };
}

export function createRateLimiter(perMinute: number) {
  let window = 0;
  let counts = new Map<string, number>();
  return (address: string) => {
    const now = Math.floor(Date.now() / 60_000);
    if (now !== window) {
      window = now;
      counts = new Map();
    }
    const count = (counts.get(address) ?? 0) + 1;
    counts.set(address, count);
    return count <= perMinute;
  };
}

class Lru<V> {
  private readonly map = new Map<string, V>();
  constructor(private readonly capacity: number) {}

  get(key: string) {
    const value = this.map.get(key);
    if (value !== undefined) {
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }

  set(key: string, value: V) {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) this.map.delete(this.map.keys().next().value!);
  }
}
