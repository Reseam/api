---
title: Overview
description: What the Reseam API is and what it does.
---

# Overview

The Reseam API is a thin metadata server. It sits between a bundle author's hosted `patches.json` and the clients that read it: Reseam Manager on a phone, and the website at [reseam.app](https://reseam.app).

One API instance fronts one bundle. Run multiple instances for multiple bundles.

## What it does

- Reads `patches.json` and `manager.json` from upstream URLs.
- Caches them in memory.
- Serves them at `/patches.json` and `/manager.json`.
- Exposes structured `/v1/patches` and `/v1/manager` JSON for clients that want typed data, including the publisher-generated catalog on patch releases.
- Redirects `/patches/<tag>/<name>` and `/manager/<tag>/<name>` to the upstream asset so clients only ever see `*.reseam.app` URLs.
- Stores announcements in SQLite behind a bearer token.

The API never opens a `.reseam` archive or executes patch code. Patch catalogs arrive in the upstream `patches.json` and pass through the same cache and validation as the rest of the release metadata.
