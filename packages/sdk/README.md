# pulsecommerce-sdk

A typed TypeScript client for the [PulseCommerce](https://github.com/pulsecommerce/pulsecommerce)
API.

```bash
npm install pulsecommerce-sdk
```

```ts
import { PulseCommerceClient } from "pulsecommerce-sdk";

const client = new PulseCommerceClient({
  apiKey: "pc_live_...", // Settings → API keys, or client.auth.pollDeviceLogin()
  baseUrl: "https://your-deployment",
});

const { kpis } = await client.analytics.get({ from: "2026-01-01" });

const preview = await client.campaigns.preview({
  filter: { segments: ["at-risk"] },
  message: { type: "text", text: "Hi {{name}}, your usual refill is running low." },
});

if (preview.deliverable > 0) {
  await client.campaigns.broadcast({
    filter: { segments: ["at-risk"] },
    message: { type: "text", text: "Hi {{name}}, your usual refill is running low." },
    confirm: preview.deliverable,
  });
}
```

## Method groups

| Group | Methods |
|---|---|
| `sync` | `status()`, `run({ full? })` |
| `analytics` | `get({ from?, to?, granularity?, refresh? })` |
| `customers` | `get(key, { from?, to? })` |
| `settings` | `get()` |
| `reports` | `export({ format, reports, from?, to? })` — returns an `ArrayBuffer` |
| `campaigns` | `preview()`, `broadcast()`, `test()`, `status(id)`, `cancel(id)` |
| `flows` | `list()`, `get(id)` |
| `auth` | `startDeviceLogin(scopes?)`, `pollDeviceLogin(deviceCode)` |

Every rejected request throws `PulseApiError` with `.status` and `.hint` —
the same fields the API's own `{ error, hint }` response carries.

Full guides: `/docs/sdk` on your deployment. Full route reference: `/api-docs`.

## License

MIT
