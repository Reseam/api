---
title: Translate
description: Translating posts on our own servers, with Firefox's translation models.
---

# Translate

`POST /v1/translate` translates posts for the patched apps on our own servers. No text goes to a third party, and none is logged or stored, apart from the API's in-memory cache of recent translations.

It runs Mozilla's [Firefox Translations](https://github.com/mozilla/translations) models, the ones Firefox uses for its built-in translation, on our own CPU engine, [Reseam Translate](https://git.reseam.app/reseam/translate). One 4-core server with every language loaded translates several hundred posts a second in under 1 GB of memory.

## Request

```http
POST /v1/translate
Content-Type: application/json

{ "from": "ja", "to": "en", "texts": ["今日はとても暑いですね。", "@user ありがとう！"] }
```

```json
{ "translations": ["It's very hot today, isn't it?", "@user Thank you!"] }
```

- `from`, `to`: ISO 639-1 codes. Chinese is `zh-Hans` or `zh-Hant`; `zh`, `zh-CN` and `zh-TW` work too, as do the legacy codes `in` (Indonesian) and `iw` (Hebrew).
- `texts`: 1 to 50 texts, 20,000 bytes of UTF-8 in all. Line breaks and spacing between sentences are kept.
- Every model translates to or from English. Other pairs go through English and take about twice as long.
- URLs are left as they are, and @mentions keep their original handle.

The client has to know the source language. Most platforms send it with each post; for text without one, Android's `TextClassifier` detects it on the device.

| Status | |
|---|---|
| `200` | `{ "translations": [...] }`, in the order of `texts` |
| `400` | invalid body, or no model for the pair |
| `413` | more than 20,000 bytes of text |
| `429` | more than `TRANSLATE_RATE` requests from one address in a minute |
| `502` | the engine failed or did not answer |
| `503` | `TRANSLATE_URL` is not set |

`GET /v1/translate/languages` returns `{ "pairs": [["es", "en"], ...], "pivot": "en" }`, cached for `CACHE_TTL` seconds.

The API keeps the last `TRANSLATE_CACHE_ENTRIES` translations in memory, per text, so a post that many people open is translated once.

## Running the engine

`docker compose up` builds the engine's image from [reseam/translate](https://git.reseam.app/reseam/translate), which downloads the latest build from its releases. On its first start it downloads the models for `TRANSLATE_LANGUAGES` from Mozilla, checked against their SHA-256, into the `translate-models` volume. Each direction is about 33 MB. Later starts reuse them.

| Variable | Default | |
|---|---|---|
| `LANGUAGES` | 18 common languages | comma-separated codes, each fetched to and from English; `all` for all 57 (about 3.7 GB) |
| `THREADS` | all cores | compute threads, one per physical core |
| `TRANSLATE_TOKEN` | empty | bearer token the engine requires; set the same value on the API |
| `MAX_BATCH` | `64` | sentences decoded together per model |
| `PRELOAD` | on in the image | loads every model at start instead of on first use |
| `IDLE_SECONDS` | `300` | drops a model's weights from memory after this long unused; it reloads in about 30 ms |

How the engine works and how fast it is: [Reseam Translate](https://git.reseam.app/reseam/translate).
