---
title: Translate
description: Translate texts with Firefox's translation models.
---

# Translate

The API translates short texts with [Reseam Translate](https://git.reseam.app/reseam/translate), a CPU engine for Mozilla's Firefox Translations models. Texts are not logged or stored. The API keeps recent translations in memory only.

Translation needs `TRANSLATE_URL`; see [Configuration](2_config.md).

## Translate

```bash
curl -X POST https://api.reseam.app/v1/translate \
  -H "Content-Type: application/json" \
  -d '{ "from": "ja", "to": "en", "texts": ["今日はとても暑いですね。"] }'
```

The answer is `{ "translations": [...] }`, in the order of `texts`.

| Field | |
|---|---|
| `from`, `to` | ISO 639-1 codes; `zh-Hans` or `zh-Hant` for Chinese. `zh`, `zh-CN`, `zh-TW`, `in` and `iw` work too. |
| `texts` | 1 to 50 texts, 20,000 bytes in all |

Every model translates to or from English; other pairs go through English. URLs, @mentions and line breaks are kept.

A pair without a model answers `400`, too much text `413`. One address sends at most `TRANSLATE_RATE` requests a minute. When the engine fails or does not answer, the API returns `502`.

## Languages

`GET /v1/translate/languages` returns `{ "pairs": [["es", "en"], ...], "pivot": "en" }`: the directions the engine has models for.

## The engine

`docker-compose.yml` starts the engine next to the API. On its first start it downloads the models for `TRANSLATE_LANGUAGES` from Mozilla into the `translate-models` volume. Its settings are in its [README](https://git.reseam.app/reseam/translate).
