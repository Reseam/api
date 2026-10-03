---
title: Overview
description: What the Reseam API serves, and who uses it.
---

# Overview

The Reseam API is a small server behind `api.reseam.app`. It tells Reseam Manager and the website which releases exist, where to download them, and what announcements to show. You only need these pages to run your own instance.

![The API fetches and caches one patches.json and one manager.json, serves them and their download links to Reseam Manager and the website, and keeps announcements in SQLite. Third-party bundles don't go through it; Reseam Manager reads their patches.json directly.](architecture.svg)

It does three things:

- **Release indexes.** It fetches one `patches.json` and one `manager.json`, checks them, caches them, and serves them as is and as simple JSON endpoints, such as "the latest stable release".
- **Download links.** `/patches/<tag>/<file>` and `/manager/<tag>/<file>` redirect to where the files are hosted, so clients keep working when hosting moves.
- **Announcements.** Short messages stored in SQLite. Anyone can read them; writing needs an admin token.

It never opens a bundle or runs patch code. Bundles from other publishers don't go through it: Reseam Manager reads their `patches.json` directly.

Next: [Install](1_install.md).
