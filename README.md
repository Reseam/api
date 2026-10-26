<p align="center">
  <img src="https://reseam.app/logo.svg" alt="Reseam logo" width="96">
</p>

<h1 align="center">Reseam API</h1>

The server behind [api.reseam.app](https://api.reseam.app). It tells Reseam Manager and [reseam.app](https://reseam.app) which releases exist, where to download them, and which announcements to show. It also holds patch requests and their votes.

- **Release indexes.** Fetches one `patches.json` and one `manager.json`, caches them, and serves them as they are.
- **Download links.** `/patches/<tag>/<file>` and `/manager/<tag>/<file>` redirect to where the files are hosted.
- **Announcements.** Stored in SQLite. Anyone can read them; writing needs the admin token.
- **Requests.** Anyone posts and votes without an account, after a Turnstile check. New requests are screened by a decision model on OpenRouter.

It never opens a bundle or checks a signature. Reseam Manager does that. One instance serves one patch bundle.

Setup, configuration, and every endpoint are in the [API docs](https://reseam.app/docs/api/overview/) (source: [`docs/`](docs/)). OpenAPI docs are served at `/openapi`.

## Develop

Needs [Bun](https://bun.sh).

```bash
bun install
bun run dev          # server on port 4000, restarts on changes
bun test
bun run typecheck
bun run db:generate  # migration after a schema change
```

## Run

```bash
docker compose up -d
```

This keeps the database in the `reseam-data` volume. Set `ADMIN_TOKEN` to turn on announcement writes. The other settings are in [Configuration](docs/2_config.md).

Built with Bun, Elysia, and Drizzle on SQLite.

## License

AGPL-3.0-or-later, with additional terms under section 7 in [NOTICE](NOTICE).
