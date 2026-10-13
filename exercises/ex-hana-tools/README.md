# Exercise – AI-Assisted HANA Development with GitHub Copilot *(Conceptual)*

> **Preview exercise** — `@sap/hana-tooling-mcp-server` is a pre-release SAP package not yet on the public npm registry. This exercise shows what will be possible once the package is released. Read through the steps and example outputs to understand how the integration works, but you will not be able to run it in today's BAS environment.

> **What you need when this is available**: A **GitHub Copilot** license (individual, team, or enterprise) and access to `@sap/hana-tooling-mcp-server` via the SAP npm registry.

Maya's developer colleague **Alex** is about to extend the HANA Cloud database, write vector SQL, and wire up remote sources for S/4HANA data. Before writing a single line of DDL, Alex gives GitHub Copilot **live access to the HANA instance** using the `@sap/hana-tooling-mcp-server`. From this point on, Copilot knows the real schema, can validate SQL before it runs, and can deploy HDI artifacts directly from a chat command.

> **What is the SAP HANA Tools MCP Server?**
>
> `@sap/hana-tooling-mcp-server` is a Node.js process that exposes live SAP HANA capabilities to any MCP-capable AI coding assistant via the Model Context Protocol. Without it, an AI assistant working on HDI projects can only guess at SQL syntax and schema structure. With it, the AI can:
>
> | Tool category | Examples |
> |---|---|
> | Schema & SQL | Validate SQL, execute queries, search HANA documentation |
> | Remote sources | List and explore SDA/SDI remote sources (your S/4HANA connection) |
> | HDI lifecycle | Deploy, undeploy, check status, download artifacts from your container |
> | Documentation | Search SAP HANA SQL reference + your own schema DDL |

> **Story context:**
> Alex joins Maya's project. The first task is to add a vector column to a HANA table so HANA can store AI embeddings for semantic search. Before starting, Alex types: *"What tables do I currently have in my HANA schema?"* — Copilot calls the live HANA instance and answers immediately. Then: *"Is this SQL valid for a REAL_VECTOR column?"* — Copilot validates it before a single character touches the database. By the end of this exercise, Alex's AI assistant knows the live database as well as Alex does.

---

## What you will do

| Step | Action | Time |
|---|---|---|
| 1 | Configure `.vscode/mcp.json` with the HANA tools server | ~5 min |
| 2 | Verify GitHub Copilot loads the HANA tools | ~3 min |
| 3 | Explore your HANA schema and S/4HANA remote source | ~5 min |
| 4 | Validate SQL with AI before running it | ~5 min |
| 5 | Understand HDI artifact types for the next exercise | ~2 min |

---

## Step 1 – Configure the HANA Tools MCP Server

GitHub Copilot reads MCP server configuration from `.vscode/mcp.json` in your project root.

### 1a – Collect your HANA credentials

In a terminal, list the service key for your HDI container:

```bash
cf service-keys da164-hdi-<your-number>
```

Then fetch the key (use the name shown in the output above):

```bash
cf service-key da164-hdi-<your-number> <key-name>
```

The output is a JSON object. Note the following fields:

| `.vscode/mcp.json` field | Service key field |
|---|---|
| `HANA_HOST` | `host` |
| `HANA_USER` | `user` |
| `HANA_PASSWORD` | `password` |
| `HANA_SCHEMA` | `schema` |

### 1b – Create `.vscode/mcp.json`

In BAS, navigate to your CAP project root and create the file:

```bash
cd ~/projects/da164-product-advisor-<your-number>
mkdir -p .vscode
```

Create `.vscode/mcp.json` with this content:

```json
{
  "servers": {
    "hana-tools": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@sap/hana-tooling-mcp-server"],
      "env": {
        "HANA_HOST": "<host from service key>",
        "HANA_PORT": "443",
        "HANA_USER": "<user from service key>",
        "HANA_PASSWORD": "<password from service key>",
        "HANA_SCHEMA": "<schema from service key>"
      }
    }
  }
}
```

Save the file.

> **Security note:** `.vscode/mcp.json` contains your HANA password. Add it to `.gitignore` so it is never committed:
> ```bash
> echo ".vscode/mcp.json" >> .gitignore
> ```

---

## Step 2 – Open GitHub Copilot Agent Mode

1. Open the GitHub Copilot chat panel: press **Ctrl+Alt+I** (or click the Copilot icon in the activity bar).

2. In the chat input, click the mode dropdown and select **Agent**.

3. Copilot reads `.vscode/mcp.json` and starts the HANA tools server. You should see **hana-tools** listed in the available tools.

> If the tools do not appear, check that `command` and `args` in `.vscode/mcp.json` are correct and that Node.js is available (`node --version` in terminal).

4. Type this message to confirm the connection:

```
List the tools you have available from hana-tools
```

Copilot responds with the tool names and their descriptions.

---

## Step 3 – Explore Your HANA Schema and S/4HANA Remote Source

Now put the tools to work. These questions are designed to give you a picture of your database before you start building on it.

### What is already in your HANA schema?

Type in Copilot chat:

```
What tables exist in my HANA schema? Give me their names and a one-line description of each.
```

> Copilot calls `getHanaDocumentation` and queries your live schema. It should return the tables that the HDI container has deployed so far.

---

### What S/4HANA data is available via remote source?

```
List the available remote sources on my HANA instance and describe what they expose.
```

> Copilot calls `listRemoteSources` → connects to HANA → returns the SDA/SDI remote sources configured. You should see the S/4HANA remote source (configured before the session).

```
Explore the S/4HANA remote source. What product-related objects (tables or views) are available?
```

> Copilot calls `exploreRemoteSource` and browses the objects. This is the same remote source your CAP app uses in Exercise 2 via a virtual table.

---

## Step 4 – Validate SQL with Copilot Before Running It

One of the most powerful tools is `validateSqlStatement` — it checks your SQL against the live HANA engine without executing it. Syntax errors, missing tables, and type mismatches are caught instantly.

### Test a valid SQL statement

Type:

```
Validate this SQL for me:
SELECT PRODUCT, DESCRIPTION FROM PRODUCTS_PRODUCTEXTENSION LIMIT 5
```

> Copilot calls `validateSqlStatement` → HANA returns a parse/type-check result → Copilot tells you if it is valid. If the table does not exist yet (we create it in Exercise 2), Copilot will tell you exactly why.

### Test SQL for a REAL_VECTOR column

This is the column you will create in Exercise 2. Ask Copilot to validate the DDL:

```
Is the following SQL valid for adding a vector column in SAP HANA Cloud?
ALTER TABLE PRODUCTS_PRODUCTEXTENSION ADD (EMBEDDING REAL_VECTOR(1536))
```

> Copilot validates the syntax and confirms whether `REAL_VECTOR(1536)` is the correct type.

### Ask HANA documentation a question

```
What indexes can I create on a REAL_VECTOR column in SAP HANA Cloud? What is the difference between HNSW and IVF?
```

> Copilot calls `getHanaDocumentation` → searches the HANA SQL Reference → returns an accurate, up-to-date answer from the actual documentation.

---

## Step 5 – Understand HDI Artifact Types

Before you write the vector table definition in Exercise 2, ask Copilot to explain the artifact type you will use:

```
I need to add a new column to an existing HDI table definition.
What artifact type should I use — .hdbtable or .hdbmigrationtable?
What is the difference?
```

> Copilot calls `getHdiArtifactContext` with the relevant artifact type and returns the syntax rules, JSON schema, and the key differences. This is the exact question you will face when you open the exercise file.

```
Show me the post-creation checklist for a .hdbmigrationtable artifact.
```

> Copilot calls `getHdiArtifactVerificationChecklist` → returns the required companion files and common mistakes. Keep this in mind for Exercise 2.

---

## Bonus – Deploy an Artifact from Chat

If you want to try the full HDI lifecycle integration:

```
Set the project directory to ~/projects/da164-product-advisor-<your-number> and show me the current artifact status.
```

> Copilot calls `set_project_directory` (loads credentials from `.env`) then `get_artifact_status` (compares your local workspace files against what is deployed in the HDI container). Any differences show up as undeployed or changed artifacts.

---

## What Just Happened

```
GitHub Copilot (Agent Mode)
        │
        │  MCP protocol (stdio)
        ▼
@sap/hana-tooling-mcp-server
        │
        ├── HANA-credential tools
        │       validateSqlStatement  ──→  SAP HANA Cloud (live check)
        │       listRemoteSources     ──→  S/4HANA remote source
        │       getHanaDocumentation  ──→  HANA SQL Reference + your schema DDL
        │
        └── HDI project tools (reads .env)
                get_artifact_status   ──→  HDI container
                deploy_artifacts      ──→  HDI container
                getHdiArtifactContext ──→  artifact type rules (offline)
```

Your AI assistant now has the same live HANA knowledge that a DBA would have. Every SQL statement you ask Copilot to write or review in the remaining exercises can be validated against the real schema before you run it.

---

## Summary

| What you did | What it gives you |
|---|---|
| Configured `.vscode/mcp.json` with HANA tools | Copilot connected to live HANA |
| Explored schema and remote sources | Clear picture of your database before you build on it |
| Validated SQL and DDL | No surprises when you run it for the first time |
| Learned HDI artifact types | Ready to write the vector table definition in Exercise 2 |

**Next**: Add the AI-enriched vector column to your HANA Cloud table.

Continue to [Exercise 2 – Extend & Persist in SAP HANA Cloud](../ex2/README.md)
