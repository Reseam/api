---
title: Overview
description: What the Reseam API serves, and who uses it.
---

# Overview

The Reseam API is a small server behind `api.reseam.app`. It tells Reseam Manager and the website which releases exist, where to download them, and what announcements to show. It also holds patch requests and their votes. You only need these pages to run your own instance.

It does four things:

- **Release indexes.** It fetches one `patches.json` and one `manager.json`, checks them, caches them, and serves them as is. Clients pick the release they want from the index, stable or prerelease.
- **Download links.** `/patches/<tag>/<file>` and `/manager/<tag>/<file>` redirect to where the files are hosted, so clients keep working when hosting moves.
- **Announcements.** Short messages stored in SQLite. Anyone can read them; writing needs an admin token.
- **Requests.** Patch requests anyone can post and vote on without an account. See [Requests](5_requests.md).

It never opens a bundle or runs patch code. Bundles from other publishers don't go through it: Reseam Manager reads their `patches.json` directly.

Next: [Install](1_install.md).
