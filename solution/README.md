# DA164 Workshop — Solution Project

This is the complete working solution for the DA164 workshop. Import it into your BAS workspace and follow the steps below to run it end-to-end.

## What's in here

| File / Folder | Built in exercise |
|---|---|
| `db/schema.cds` | Ex2 — HANA extension table |
| `srv/product-service.cds` | Ex6 — Service definition with `@mcp` |
| `srv/product-service.js` | Ex4 — All handlers: getProducts, syncProducts, hybridSearch, askAdvisor |
| `srv/ai-core-client.js` | Ex3 — AI Core client (embeddings + chat) |
| `scripts/embed-products.js` | Ex3 — Embedding generation script |
| `srv/external/` | Ex1 — Generated S/4HANA API model |
| `opencode.json` | Ex6 — MCP config for OpenCode (update URL after deploy) |

## Steps to run locally (hybrid mode)

```bash
npm install
```

Copy the AI Core credentials:

```bash
mkdir -p .aicore
cp ../resources/aicore-config.json .aicore/config.json
```

Log in to CF and bind your HDI container (replace `001` with your seat number):

```bash
cds bind --to da164-hdi-001
```

Deploy the schema and sync products:

```bash
cds deploy --to hana
cds watch --profile hybrid
```

In a second terminal:

```bash
curl -X POST http://localhost:4004/odata/v4/product/syncProducts \
  -H "Content-Type: application/json" -d '{}'

node scripts/embed-products.js  # needs cds bind --exec prefix
cds bind --exec -- node scripts/embed-products.js
```

## Deploy to CF

```bash
cf push
```

Then update `opencode.json` with your app route from the push output.
