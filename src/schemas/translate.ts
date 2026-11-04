import { t } from "elysia";

const LanguageSchema = t.String({ pattern: "^[A-Za-z]{2,3}([-_][A-Za-z0-9]{2,8})*$", maxLength: 16 });

export const TranslateSchema = t.Object({
  from: LanguageSchema,
  to: LanguageSchema,
  texts: t.Array(t.String(), { minItems: 1, maxItems: 50 }),
});

export const TranslationsSchema = t.Object({ translations: t.Array(t.String()) });

export const LanguagesSchema = t.Object({
  pairs: t.Array(t.Tuple([t.String(), t.String()])),
  pivot: t.String(),
});

export type Languages = typeof LanguagesSchema.static;
