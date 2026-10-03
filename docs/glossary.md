---
title: Glossary
description: Terms used across the API, bundles, and clients.
---

# Glossary

**Bundle**: a signed `.reseam` archive holding one or more patches, plus the metadata needed to apply them. Bundles are the unit of distribution; clients trust bundles, not individual patches.

**`patches.json`**: the index file for a bundle. Lists the bundle's name, author, public key, homepage, and the release assets (bundles and metadata) available for download. The API reads one `patches.json` and serves it back out.

**`manager.json`**: the equivalent index for Reseam Manager releases. Same shape, different payload: the Android, Windows, and Linux builds and their release notes.

**Patch**: a single change applied to an app. "Block ads", "force AMOLED dark", "allow screenshots". Patches live inside bundles.

**Reseam Manager**: the client users install, on Android, Windows, or Linux. Reads from the API and applies patches on the device.

**Reseam CLI**: the command-line patch engine. What authors use to build bundles and what advanced users can use on their laptop.

**Tag**: a release identifier, typically a version string like `1.0.50` or a channel like `latest`. The redirect routes take a tag and a filename to locate an asset on the upstream host.

**Admin token**: the one secret the API holds. Required for announcement writes. Lives in the `ADMIN_TOKEN` environment variable. Nothing else on the API is authenticated.

**Upstream**: wherever `patches.json` and `manager.json` are fetched from. For the official deployment, that's a Forgejo release. For self-hosters, it's whatever URL they configure.
