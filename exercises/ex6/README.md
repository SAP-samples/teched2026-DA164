# Exercise 7 – HANA Cloud AI Agents with hana_ai Toolkit + Joule Studio *(Optional)*

In this exercise you will use SAP's **`hana_ai` Python toolkit** to expose HANA Cloud's native AI stored procedures as MCP tools — and connect them to Joule Studio so Maya can ask natural-language questions about the service charge data directly.

> **The `hana_ai` toolkit approach**
>
> Previous workshops used a hand-written FastMCP server to wrap HANA's AI procedures. This exercise uses the **`hana_ai` package** — SAP's supported Python library — which handles the wrapping, MCP protocol, and audit trail for you. The server is ~50 lines of configuration.
>
> Two tool classes do all the heavy lifting:
>
> | Python class | HANA procedure | What it answers |
> |---|---|---|
> | `ObjectDiscoveryTool` | `SYS.AI_OBJECT_DISCOVERY` | Schema questions — *"what tables store service charge data?"* |
> | `DataRetrievalTool` | `SYS.AI_DATA_RETRIEVAL` | Data questions — *"show me the top 5 products by quantity"* |
>
> Both procedures are native HANA Cloud capabilities. The toolkit wraps them in a `HANAMLToolkit` instance and launches a FastMCP HTTP server in one method call. The server runs **locally in your BAS terminal** — no Cloud Foundry deployment required.

> **Story context:**
> Maya's service charge advisor (Exercise 5) answers customer questions about service charge recommendations. Her manager now wants to ask broader questions about the data itself — *"which service charge types appear most in our catalog?"* or *"what tables do we have about freight rates?"* HANA Cloud's built-in AI agents already understand your schema and live data. In this exercise you will expose them to Joule Studio using the `hana_ai` toolkit — zero custom query logic required.

---

## What you will do

| Part | Steps | Time |
|---|---|---|
| A — Run the MCP server in BAS | 1–4 | ~10 min |
| B — Connect Joule Studio | 5–7 | ~10 min |
| C — Test with natural language | 8 | ~5 min |

---

## What is pre-configured for you

The session team has set up the following before the workshop. You do not need to create any of this — but it helps to understand what exists:

| What | Why |
|---|---|
| HANA Cloud technical user | A dedicated low-privilege user that can execute the AI procedures — credentials in your handout |
| `ObjectDiscovery` wrapper procedure | A schema-scoped stored procedure that calls `SYS.AI_OBJECT_DISCOVERY` — name in your handout |
| `DataRetrieval` wrapper procedure | A schema-scoped stored procedure that calls `SYS.AI_DATA_RETRIEVAL` — name in your handout |
| AI Core remote source | The embedding model connection that powers HANA's knowledge graph — already attached to HANA |
| Knowledge graph | A semantic index of your HDI schema — built from your `ProductExtension` table and S/4HANA entities |

---

## Part A – Run the MCP Server in BAS

### Step 1 – Review the server code

1. In BAS, open a **new terminal** and navigate to the MCP server folder:

```bash
cd ~/projects/teched2026-DA164/hana-agents-mcp-server
```

2. Open [server.py](../../hana-agents-mcp-server/server.py) and read through it. The entire server is five logical blocks:

```python
# 1. Load credentials from .env
load_dotenv(...)
cc = ConnectionContext(address=..., port=443, user=..., password=..., encrypt=True)

# 2. Create the toolkit (audit writes to HANA session context, not a file)
toolkit = HANAMLToolkit(connection_context=cc, used_tools=[],
                        audit_enabled=True, audit_log_path=None)

# 3. ObjectDiscoveryTool — answers schema questions
discovery_tool = ObjectDiscoveryTool(connection_context=cc)
discovery_tool.configure(schema_name=..., procedure_name=...)
discovery_tool.name = 'discovery_agent'
toolkit.add_custom_tool(discovery_tool)

# 4. DataRetrievalTool — answers data questions
data_tool = DataRetrievalTool(connection_context=cc)
data_tool.configure(schema_name=..., procedure_name=...)
data_tool.name = 'data_agent'
toolkit.add_custom_tool(data_tool)

# 5. Find a free port and start the server (blocks here, Ctrl+C to stop)
MCP_PORT = find_free_port()
toolkit.launch_mcp_server(transport='http', host='0.0.0.0', port=MCP_PORT, max_retries=5)
```

> **Why `audit_log_path=None`?**
> By default the toolkit writes a JSONL file next to your script for each tool call. Setting this to `None` switches to session-variable-only mode: audit records are written into the HANA session context (`SET '<KEY>' = '<VALUE>'`), readable via `SESSION_CONTEXT('TOOL_NAME')` from any HANA SQL console. No local file is created. See the Bonus section.

> 📸 **Screenshot here**: `server.py` open in BAS showing the five logical blocks.

---

### Step 2 – Create your `.env` file

The server reads credentials from the `.env` file in the project root folder (one level up from `hana-agents-mcp-server/`).

1. Open your project root `.env` file. If it does not exist yet, create it from the example:

```bash
cp .env.example ../.env
```

2. Add these six entries to the file (alongside any existing entries from earlier exercises):

```bash
# Exercise 6 – HANA AI Agent credentials (from your session handout)
HANA_MCP_HOST=<your-host>.hanacloud.ondemand.com
HANA_MCP_USER=<your-hana-agent-user>
HANA_MCP_PASSWORD=<your-hana-password>
RETRIEVAL_SCHEMA=<schema-from-handout>
DISCOVERY_PROCEDURE=<discovery-procedure-from-handout>
DATA_RETRIEVAL_PROCEDURE=<data-retrieval-procedure-from-handout>
```

3. Save the file.

> The values for `RETRIEVAL_SCHEMA`, `DISCOVERY_PROCEDURE`, and `DATA_RETRIEVAL_PROCEDURE` are in your handout under **"HANA AI Agent credentials"**.

> 📸 **Screenshot here**: The `.env` file with all six Exercise 6 lines filled in.

---

### Step 3 – Install dependencies and start the server

1. Install the Python dependencies (only needed once per BAS workspace):

```bash
pip install -r requirements.txt
```

2. Start the MCP server:

```bash
python server.py
```

The terminal will print output like this:

```
Loaded .env from /home/user/projects/teched2026-DA164/.env
Connected: 4.00.000.00.1751369226 (fa/CE2025.48)
Registered: discovery_agent  (ObjectDiscoveryTool → SYS.AI_OBJECT_DISCOVERY)
Registered: data_agent       (DataRetrievalTool → SYS.AI_DATA_RETRIEVAL)

============================================================
  MCP server starting on port 42731
  Expose this port in BAS to get your public URL.
  BAS URL pattern: https://<workspace>-42731.workspaces-base.<landscape>.hana.ondemand.com/mcp
============================================================
```

**Note the port number** printed in the output — you will need it in Step 4.

> The server is now running and will stay running in this terminal. **Do not close it** while you work in Joule Studio. Press `Ctrl+C` only when you are finished with the exercise.

> 📸 **Screenshot here**: The BAS terminal showing the startup output with the port number highlighted.

---

### Step 4 – Expose the port in BAS to get a public URL

The server is listening on `0.0.0.0:<port>` inside your BAS workspace. You need to expose this port so it is reachable from Joule Studio.

1. In BAS, open the **Ports** panel. You can do this two ways:
   - Click the port number in the bottom status bar (BAS shows it automatically when a port is open), or
   - Open the Command Palette (`Ctrl+Shift+P`) → type **"Ports: Focus on Ports View"** → press Enter.

2. Find the port from Step 3 in the list (e.g. `42731`).

3. Click the **globe icon** (🌐) next to it — this makes the port publicly accessible.

4. BAS will show a public HTTPS URL in the format:

```
https://<workspace-id>-<port>.workspaces-base.<landscape>.hana.ondemand.com
```

5. **Copy this URL** and append `/mcp` to it:

```
https://<workspace-id>-42731.workspaces-base.<landscape>.hana.ondemand.com/mcp
```

This is your **MCP Endpoint URL** — save it, you will paste it into the BTP Destination in Step 5.

> **Quick test:** Open a second terminal and run:
> ```bash
> curl https://<your-bas-url>/mcp
> ```
> You should receive a JSON response. If you get a connection error, make sure the port is still set to public in the Ports panel.

> 📸 **Screenshot here**: The BAS Ports panel showing the port exposed (globe icon lit) and the public URL visible.

---

## Part B – Connect Joule Studio

### Step 5 – Create the BTP Destination

You need a BTP Destination that points to your MCP server. Joule Studio discovers MCP tools through BTP Destinations.

1. Go to the **BTP Cockpit** URL from your session handout and log in.

2. Navigate to your subaccount → **Connectivity → Destinations**.

3. Click **New Destination** and fill in these values:

| Field | Value |
|---|---|
| Name | `hana_mcp_<your-user-id>` |
| Type | `HTTP` |
| URL | `https://<your-bas-url-from-step-4>/mcp` |
| Proxy Type | `Internet` |
| Authentication | `NoAuthentication` |

4. Scroll down to **Additional Properties** and add:

| Property name | Value |
|---|---|
| `sap-joule-studio-mcp-server` | `true` |

> **Why this property?** Joule Studio scans BTP Destinations for the `sap-joule-studio-mcp-server: true` flag. Without it, the destination is invisible to Joule Studio's Control Tower.

5. Click **Save**.

> 📸 **Screenshot here**: The completed Destination form showing the URL, Authentication = NoAuthentication, and the additional property filled in.

---

### Step 6 – Register the destination in Joule Studio

1. Open **Joule Studio** from the URL in your session handout.

2. In the left menu, go to **Control Tower → Connectors → Destinations**.

> 📸 **Screenshot here**: Joule Studio showing the Control Tower navigation with the Destinations section highlighted.

3. Find `hana_mcp_<your-user-id>` in the list and click **Add**.

> 📸 **Screenshot here**: The Destinations list with your `hana_mcp_<your-user-id>` entry and the Add button.

Once added, Joule Studio calls your MCP server to discover the tools it exposes.

---

### Step 7 – Create the Joule Agent

1. In Joule Studio, go to **Agents** and click **New Agent**.

2. Fill in the details:

| Field | Value |
|---|---|
| Name | `HANA Service Charge Data Agent` |
| Description | `Answers questions about service charge data using HANA Cloud's built-in AI tools` |

> 📸 **Screenshot here**: The new agent form with the name and description filled in.

3. Click on the **MCP Servers** tab.

4. Click **Add MCP Server** and select `hana_mcp_<your-user-id>`.

5. After adding it, you should see **2 tools** discovered automatically:

| Tool | What it does |
|---|---|
| `discovery_agent` | Answers questions about the schema — powered by `ObjectDiscoveryTool` |
| `data_agent` | Retrieves actual data — powered by `DataRetrievalTool` |

> 📸 **Screenshot here**: The MCP Servers tab showing your `hana_mcp` server with "2" in the Tools column.

6. Click **Save**.

---

## Part C – Test with Natural Language

### Step 8 – Ask questions about your service charge data

1. Click the **Test** button (top-right) to open the agent chat window.

> 📸 **Screenshot here**: The Joule Studio agent test chat window, empty and ready for input.

Work through these questions one at a time. After each one, read the response carefully and look at which tool the agent chose.

---

**Question 1 — Schema discovery**

```
What tables do we have that store service charge data?
```

> The agent calls `discovery_agent` → `SYS.AI_OBJECT_DISCOVERY` → the knowledge graph searches your schema semantically → returns a list of relevant tables with column descriptions.
>
> What to look for: the agent returns table names and structure, not raw data rows.

> 📸 **Screenshot here**: The chat showing the agent's schema response with table names like `ProductExtension`.

---

**Question 2 — Column lookup**

```
Which column stores the service charge description, and what data type is it?
```

> The agent navigates the knowledge graph to find the right column. It understands that `Description` and `ProductDescription` could refer to the same concept.

> 📸 **Screenshot here**: The agent correctly identifying the `Description` column and its type.

---

**Question 3 — Live data retrieval**

```
Show me the first 5 service charges and their descriptions.
```

> Now the agent calls `data_agent` → `SYS.AI_DATA_RETRIEVAL` → HANA generates and runs a SQL query against your live `ProductExtension` table → returns structured rows.
>
> What to look for: actual service charge rows are returned — not a schema description, but real data.

> 📸 **Screenshot here**: The agent returning a table of service charge rows with descriptions.

---

**Question 4 — Aggregation**

```
How many service charges do we have in total, and how many have embeddings stored?
```

> The agent uses `data_agent` to count rows and filter on the `Embedding` column — the one you populated in Exercise 3.

> 📸 **Screenshot here**: The agent returning two numbers: total service charges and embedded service charges.

---

**Question 5 — Agent chaining (schema → data)**

```
Which service charge type has the most entries in the catalog?
```

> Watch closely: the agent first calls `discovery_agent` to understand the `ProductType` column, then calls `data_agent` to run the aggregation. This is **automatic tool chaining** — you did not specify which tool to use.

> 📸 **Screenshot here**: The agent's response showing it called discovery first, then data, and returning an aggregation result.

---

## Bonus – View the Audit Trail

Every time Joule calls one of your tools, the `hana_ai` toolkit writes a structured audit record to the HANA session context. You can read it from HANA Database Explorer.

1. Open **HANA Database Explorer** from the BTP Cockpit.

2. Connect with your technical user credentials (`HANA_MCP_USER` / `HANA_MCP_PASSWORD` from your `.env`).

3. Open a new SQL console and run:

```sql
-- Read the last tool invocation from the session context
SELECT
  SESSION_CONTEXT('EVENT_TYPE')                  AS EVENT_TYPE,
  SESSION_CONTEXT('OCCURRED_AT')                 AS OCCURRED_AT,
  SESSION_CONTEXT('MCP_SESSION_ID')              AS MCP_SESSION_ID,
  SESSION_CONTEXT('CLIENT_DECLARED_AGENT_NAME')  AS AGENT_NAME,
  SESSION_CONTEXT('TOOL_NAME')                   AS TOOL_NAME,
  SESSION_CONTEXT('TOOL_ARGS_JSON')              AS TOOL_ARGS_JSON,
  SESSION_CONTEXT('STATUS')                      AS STATUS,
  SESSION_CONTEXT('DURATION_MS')                 AS DURATION_MS,
  SESSION_CONTEXT('HANA_CORRELATION_ID')         AS CORRELATION_ID
FROM DUMMY;
```

> Each row shows: which Joule agent called which tool, with what arguments, and how long it took. This is stored in the HANA session context — a DBA can also read it cross-session from `M_SESSION_CONTEXT`.

> 📸 **Screenshot here**: HANA Database Explorer showing the SESSION_CONTEXT result with `TOOL_NAME = discovery_agent` and `STATUS = success`.

---

## What Just Happened

```
Joule Studio (chat)
        │
        │  calls tool via MCP protocol
        ▼
BTP Destination  hana_mcp_<user>
        │
        │  HTTPS → BAS port exposure
        ▼
hana_ai MCP Server  (running in your BAS terminal)
HANAMLToolkit
        │                        │
        ▼                        ▼
ObjectDiscoveryTool         DataRetrievalTool
        │                        │
        ▼                        ▼
SYS.AI_OBJECT_DISCOVERY   SYS.AI_DATA_RETRIEVAL
        │                        │
        └────────────┬───────────┘
                     ▼
            SAP HANA Cloud
            Knowledge graph + live data
                     │
                     ▼
            Audit record → SESSION_CONTEXT
```

The `hana_ai` toolkit took care of:
- Wrapping the HANA stored procedures as MCP tools
- Finding a free port and starting the FastMCP HTTP server
- Writing a full audit record to the HANA session after each call
- Naming the tools (`discovery_agent`, `data_agent`) so Joule Studio can auto-discover them

You did not write any query logic, embeddings, or RAG pipeline. HANA Cloud handles all of it internally using the knowledge graph built on your schema.

---

## Summary

Across all six exercises you built a complete AI application on SAP BTP — from raw S/4HANA data to a natural-language advisor:

| Exercise | What you built |
|---|---|
| Ex0 | CAP project foundation, AI Core helper |
| Ex1 | Live S/4HANA service charge data via BTP Destination (clean core) |
| Ex2 | GitHub Copilot wired to live HANA via `@sap/hana-tooling-mcp-server` — AI knows your schema |
| Ex3 | Extended service charge table in HANA Cloud with `REAL_VECTOR(1536)` column |
| Ex4 | AI embeddings generated for all service charges, stored in HANA |
| Ex5 | Hybrid full-text + semantic search in a single HANA SQL query |
| Ex6 | RAG-based AI service charge advisor deployed to CF, connected to Joule Studio |
| Ex7 | HANA's native AI agents exposed via `hana_ai` toolkit MCP server — natural-language schema + data queries in Joule Studio |

**Congratulations — you have completed DA164!**

---

*Continue to [Exercise 8 – Expose Your CAP App as an MCP Server (Optional)](../ex7/README.md)*
