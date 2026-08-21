# pulsecommerce-cli

A command-line client for the PulseCommerce API. Built on
[`pulsecommerce-sdk`](https://www.npmjs.com/package/pulsecommerce-sdk), which
talks to the same REST API the dashboard uses.

## Install

```bash
npm install -g pulsecommerce-cli
```

Building from this repo's workspace instead:

```bash
npm install
npm run build -w packages/sdk
npm run build -w packages/cli
npm link -w packages/cli   # puts `pulse` on your PATH
```

## Sign in

```bash
pulse login
```

Opens a browser to a code your terminal also printed. Approve it in a
dashboard session that's already signed in, and the key comes back without
ever being typed or pasted — the same session-gated key creation
**Settings → API keys** does, just without the copy-paste. `pulse logout`
clears it.

For CI, containers, or anywhere a browser can't open:

```bash
pulse config set --api-key pc_live_... --base-url https://your-deployment
pulse config show
```

The base URL resolves as `--base-url` flag → `PULSE_BASE_URL` → saved config
→ a built-in default pointing at pulsecommerce-sw.vercel.app, so `pulse login`
needs nothing set up first; point at a different deployment with one flag.
The API key follows the same order minus the built-in default. Config lives
at `~/.config/pulsecommerce/config.json` (or under `$XDG_CONFIG_HOME` if set)
and is written with `0600` permissions.

There is still no `pulse keys` command — the API only allows a key to be
created or revoked by a dashboard session, never by another key, and
`pulse login` goes through that same session-gated path.

## Commands

| Command | What it does |
|---|---|
| `pulse login` / `logout` | Sign in through a browser / remove the saved key |
| `pulse config set` / `config show` | Save or inspect local credentials |
| `pulse sync status` / `sync run [--full]` | Check or trigger the WooCommerce mirror |
| `pulse analytics [--from] [--to] [--granularity] [--refresh]` | Every metric for a date range |
| `pulse customers get <key>` | One customer, with order history |
| `pulse settings show` | Connected stores and the active one |
| `pulse reports export --format <xlsx\|pdf\|csv> --reports <a,b> --out <path>` | Generate and download an export |
| `pulse campaigns preview --file <campaign.json>` | Dry run — resolve recipients, send nothing |
| `pulse campaigns broadcast --file <campaign.json>` | Preview, confirm, then send |
| `pulse campaigns test --phone <p> --file <message.json>` | One message to a number typed by hand |
| `pulse campaigns status <id>` / `campaigns cancel <id>` | Progress and cancellation |
| `pulse flows list` / `flows get <id>` | Multi-step campaigns and their progress |

Full guides and worked examples: `/docs/cli` on your deployment. Full route
reference: `/api-docs`. Writing your own script instead: `/docs/sdk`.

## License

MIT
