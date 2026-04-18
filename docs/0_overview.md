---
title: Overview
description: What the Reseam API is, what it does, and what it doesn't.
---

# Overview

The Reseam API is a thin metadata server. It sits between a bundle author's hosted `patches.json` and the clients that read it — Reseam Manager on a phone, and the website at [reseam.app](https://reseam.app).

One API instance fronts one bundle. Run multiple instances for multiple bundles.

## What it does

- Reads `patches.json` and `manager.json` from upstream URLs.
- Caches them in memory.
- Serves them at `/patches.json` and `/manager.json`.
- Exposes structured `/v1/patches` and `/v1/manager` JSON for clients that want typed data.
- Redirects `/patches/<tag>/<name>` and `/manager/<tag>/<name>` to the upstream asset so clients only ever see `*.reseam.app` URLs.
- Stores announcements in SQLite behind a bearer token.

## What it doesn't do

- **No signature verification.** The API serves the bundle's public key. Clients verify. A compromised API can't forge patches.
- **No upload.** Authors publish bundles to wherever they host releases (Forgejo, GitHub, S3, anywhere). The API just points at them.
- **No user accounts.** The only secret the API holds is an admin token for writing announcements.

## Stack

Bun, Elysia, drizzle-orm on SQLite. One process, one SQLite file, one upstream fetch loop. Deploys as a single Docker container.
