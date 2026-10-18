# DA164 Workshop — Solution Project

This is the complete working solution for the DA164 workshop. Import it into your BAS workspace and follow the steps below to run it end-to-end.

## What's in here

| File / Folder | Built in exercise |
|---|---|
| `db/schema.cds` | Ex2 — HANA extension table |
| `srv/product-service.cds` | Ex6 — Service definition with `@mcp` |
| `srv/product-service.js` | Ex4 — All handlers: getProducts, syncProducts, hybridSearch, askAdvisor |
| `srv/ai-core-client.js` | Ex3 — AI Core client (chat completion only) |
| `srv/external/` | Ex1 — Generated S/4HANA API model |
| `opencode.json` | Ex6 — MCP config for OpenCode (update URL after deploy) |

## Steps to run locally (hybrid mode)

```bash
npm install
```

Extract the AI Core credentials (password from FACILITATOR_SETUP.md):

```bash
mkdir -p .aicore
unzip -P <zip-password> ../resources/aicore-config.zip -j -d .aicore/
mv .aicore/aicore-config.json .aicore/config.json
```

Log in to CF and bind your HDI container (replace `001` with your seat number):

```bash
cds bind --to da164-hdi-001
```

Deploy the schema, sync products, then generate embeddings in HANA:

```bash
cds deploy --to hana
cds watch --profile hybrid
```

In a second terminal:

```bash
curl -X POST http://localhost:4004/odata/v4/product/syncProducts \
  -H "Content-Type: application/json" -d '{}'
```

Then in **HANA Database Explorer**, run:

```sql
UPDATE PRODUCTS_PRODUCTEXTENSION
SET EMBEDDING = VECTOR_EMBEDDING(
  'Product: ' || PRODUCT || '. ' || DESCRIPTION,
  'DOCUMENT', 'SAP_GXY.20250407'
)
WHERE EMBEDDING IS NULL;
```

## Deploy to CF

```bash
cf push
```

Then update `opencode.json` with your app route from the push output.
