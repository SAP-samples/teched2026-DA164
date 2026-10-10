# Exercise 8 – Expose Your CAP App as an MCP Server *(Optional)*

In Exercise 6 you connected HANA Cloud's **built-in** AI agents to Joule Studio. In this exercise you will expose **your own CAP app** — the hybrid search and service charge advisor you built in Exercises 4 and 5 — as an MCP server using `@cap-js/mcp`. Any MCP-compatible AI assistant can then call your actions directly from a chat interface.

> **What is different from Exercise 6?**
> Exercise 6 exposes HANA's native agents (discovery + data retrieval) to Joule Studio. This exercise exposes *your custom business logic* — the hybrid search query and RAG advisor you wrote — to an AI assistant using CAP's built-in MCP support. One package, one annotation.

> **Story context:**
> The advisor works. Maya loves it. Now her development team wants to use it while they code — asking the service charge advisor questions from inside their AI coding assistant without switching tabs. In this exercise you will add one package and one annotation to your CAP app, and the entire advisor becomes available as a set of AI tools in OpenCode. No new server, no tool definitions, no glue code. This is what it looks like when your SAP application is AI-native by default.

---

## What you will do

1. Install the `@cap-js/mcp` plugin in your CAP project
2. Annotate your service with `@mcp` and write instructions for the AI
3. Deploy the updated app to Cloud Foundry
4. Configure OpenCode to connect to your MCP endpoint
5. Use OpenCode to search products and ask the advisor — from a chat window

---

## Step 1 – Install the Plugin

1. In the BAS terminal, navigate back to your CAP project:

```bash
cd ~/projects/teched2026-DA164
```

2. Install the plugin:

```bash
npm add @cap-js/mcp
```

`@cap-js/mcp` is a CAP plugin — it activates automatically on startup with no extra wiring.

> 📸 **Screenshot here**: Terminal showing `added 1 package ... @cap-js/mcp` after the install completes.

---

## Step 2 – Annotate the Service

1. Open [srv/product-service.cds](../../srv/product-service.cds).

2. Add `@mcp` on the line directly above `service ProductService`:

```cds
@mcp
service ProductService {
  ...
}
```

3. Add this block **after** the closing `}` of the service to give the AI assistant instructions:

```cds
annotate ProductService with @mcp.instructions: '
You are a service charge advisor for a logistics company.
The service charge data originates from SAP S/4HANA Cloud.

- Use "describe" first to learn what data and actions are available.
- Use "query" for structured lookups, e.g. SELECT * FROM Products WHERE ProductType = \'SERV\'.
- Use "hybridSearch" to find service charges using natural language — it combines keyword and semantic search.
- Use "askAdvisor" for open-ended customer questions that need a full answer.
- Always include the charge code in your answers.
- Only recommend service charges that the tools return — never invent charges.';
```

4. Save the file.

> 📸 **Screenshot here**: The `product-service.cds` file with `@mcp` visible above the service and the `annotate` block below it.

---

## Step 3 – Configure MCP Options

1. Open [package.json](../../package.json) and add the `"mcp"` block inside the `"cds"` section:

```json
"cds": {
  "mcp": {
    "per_action_tool": true,
    "format": "cql"
  },
  "requires": { ... }
}
```

2. Save the file.

> With `per_action_tool: true` each of your actions becomes a separately named tool. OpenCode will see four tools:

| Tool | Source | What it does |
|---|---|---|
| `describe` | CAP built-in | Describes your entities and action signatures |
| `query` | CAP built-in | Runs a CQL SELECT against the Products table |
| `hybridSearch` | Your Ex4 action | Full-text + semantic search |
| `askAdvisor` | Your Ex5 action | RAG-based service charge advisor |

---

## Step 4 – Deploy the Updated App

1. Redeploy to Cloud Foundry so the changes take effect:

```bash
cf push
```

2. When the deploy finishes, note your app route:

```
routes: da164-product-<your-user>.cfapps.<landscape>.hana.ondemand.com
```

> 📸 **Screenshot here**: Terminal showing the `cf push` output with the app route highlighted.

3. Verify the MCP endpoint is live:

```bash
curl -X POST https://<your-app-route>/product/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

You should get back a JSON response listing the four tools.

> 📸 **Screenshot here**: Terminal showing the `/product/mcp` response listing `describe`, `query`, `hybridSearch`, and `askAdvisor` as tools.

---

## Step 5 – Connect OpenCode

OpenCode reads MCP configuration from `opencode.json` in your project folder.

1. In BAS, right-click the project root and choose **New File**. Name it `opencode.json`.

> 📸 **Screenshot here**: The BAS file explorer showing `opencode.json` created at the project root.

2. Paste this content, replacing `<YOUR-APP-ROUTE>` with the URL from Step 4:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "product-advisor": {
      "type": "remote",
      "url": "https://<YOUR-APP-ROUTE>/product/mcp",
      "enabled": true
    }
  }
}
```

3. Save the file.

> 📸 **Screenshot here**: The `opencode.json` file open in BAS with the correct URL filled in.

---

## Step 6 – Open OpenCode and Verify Tools

1. Open OpenCode from your BAS workspace.

> 📸 **Screenshot here**: The OpenCode chat interface open, showing the empty input area.

2. Look for the tools list. You should see all four tools registered from your CAP app:

> 📸 **Screenshot here**: OpenCode showing `describe`, `query`, `hybridSearch`, and `askAdvisor` listed as available tools.

If tools do not appear, check that the URL in `opencode.json` matches your app route exactly.

---

## Step 7 – Try It Out

Type these messages in OpenCode one at a time:

---

**Explore the data first:**
```
What service charge data do you have? Describe the available information.
```
> OpenCode calls `describe` → learns your schema → explains what's available.

> 📸 **Screenshot here**: OpenCode response showing the Products entity fields and the four available actions.

---

**Search by meaning:**
```
Find service charges applicable to hazardous goods shipments.
```
> OpenCode calls `hybridSearch` → HANA runs keyword + vector search → ranked results appear.

> 📸 **Screenshot here**: OpenCode showing the hybridSearch call and the returned service charge list with scores.

---

**Structured filter:**
```
List all surcharge types and their applicable conditions.
```
> OpenCode calls `query` with a CQL SELECT filtered by ProductType.

> 📸 **Screenshot here**: OpenCode showing the query tool call and the filtered list of surcharge entries.

---

**Ask the advisor:**
```
A customer wants to know what charges apply for a delayed container pickup at the port. What would you recommend?
```
> OpenCode calls `askAdvisor` → HANA retrieves context → LLM generates a grounded answer.

> 📸 **Screenshot here**: OpenCode showing the askAdvisor response with a specific charge code and description.

---

## Summary

You added **one package** and **one annotation** — and your CAP app became a fully working AI tool server. OpenCode discovered your tools automatically and used them to answer questions about real S/4HANA service charge data stored in HANA Cloud.

| Capability | Powered by |
|---|---|
| Schema discovery | CAP `describe` tool (auto-generated) |
| Structured filtering | CAP `query` tool + HANA SQL |
| Semantic + keyword search | Your `hybridSearch` action (Ex4) |
| Grounded Q&A | Your `askAdvisor` action + RAG (Ex5) |
| S/4HANA service charge data | BTP Destination → S/4HANA Cloud (Ex1) |

**Congratulations — you have now completed all exercises in DA164!**

---

*Back to [Exercise 7 – HANA Cloud Native AI Agents in Joule Studio](../ex6/README.md) | [Session overview](../../README.md)*
