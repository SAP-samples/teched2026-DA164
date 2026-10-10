# Exercise – AI-Assisted HANA Development with GitHub Copilot *(Optional)*

> **Prerequisite**: This exercise requires a **GitHub account** with access to GitHub Copilot. If you do not have one, skip to [Exercise 2](../ex2/README.md).

Maya's developer colleague **Alex** is about to extend the HANA Cloud database, write vector SQL, and wire up remote sources for S/4HANA data. Before writing a single line of DDL, Alex gives GitHub Copilot **live access to the HANA instance** using the `@sap/hana-tooling-mcp-server`. From this point on, Copilot knows the real schema, can validate SQL before it runs, and can deploy HDI artifacts directly from a chat command.

This exercise is **optional** — once configured, the HANA Tools MCP server will assist you throughout all remaining exercises.

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
| 1 | Create `.vscode/mcp.json` with server configuration | ~5 min |
| 2 | Verify GitHub Copilot loads the HANA tools | ~3 min |
| 3 | Explore your HANA schema and S/4HANA remote source | ~5 min |
| 4 | Validate SQL with AI before running it | ~5 min |
| 5 | Understand HDI artifact types for the next exercise | ~2 min |

---

## Step 1 – Configure the HANA Tools MCP Server

GitHub Copilot in BAS reads MCP server definitions from `.vscode/mcp.json` in your project root.

1. In BAS, make sure you are in the project root:

```bash
cd ~/projects/teched2026-DA164
```

2. Create a new file `.vscode/mcp.json` (create the `.vscode/` folder if it does not exist):

```bash
mkdir -p .vscode
```

3. Open `.vscode/mcp.json` and paste the following — replacing every `<placeholder>` with your HANA Cloud values from [`resources/workshop-info.md`](../../resources/workshop-info.md):

```json
{
  "servers": {
    "hana-tools": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@sap/hana-tooling-mcp-server"],
      "env": {
        "HANA_HOST": "<your-host>.hanacloud.ondemand.com",
        "HANA_PORT": "443",
        "HANA_USER": "<your-hana-user>",
        "HANA_PASSWORD": "<your-hana-password>",
        "HANA_SCHEMA": "<your-hana-schema>"
      }
    }
  }
}
```

4. Save the file.

> **Where do these values come from?**
> Find your HANA Cloud credentials in [`resources/workshop-info.md`](../../resources/workshop-info.md) under **HANA Cloud**. These are the same host and user you will use throughout the workshop.
>
> **Security note:** `.vscode/mcp.json` is gitignored by BAS for workspace-scoped files. Never commit credentials to git.

> 📸 **Screenshot here**: `.vscode/mcp.json` open in BAS with all five environment variables filled in.

---

## Step 2 – Verify the Tools Load in GitHub Copilot

1. Open **GitHub Copilot Chat** in BAS. You can do this by:
   - Clicking the Copilot icon in the left sidebar, or
   - Using the keyboard shortcut `Ctrl+Alt+I`

2. Make sure you are in **Agent mode** (not Ask or Edit). Look for the mode selector at the bottom of the chat input and choose **Agent**.

> 📸 **Screenshot here**: GitHub Copilot Chat open in BAS, showing the Agent mode selected.

3. Click the tools icon (⊕ or wrench icon) next to the chat input. You should see a section called **hana-tools** with tools listed under it.

> 📸 **Screenshot here**: The tools panel showing the `hana-tools` section with entries like `validateSqlStatement`, `listRemoteSources`, `deploy_artifacts`, etc.

> **If the tools do not appear:** Right-click `.vscode/mcp.json` and choose **Restart MCP Server**. If Node.js is not installed, run `nvm use 20` in the BAS terminal first.

4. Type this message to confirm the connection:

```
List the tools you have available from hana-tools
```

Copilot should respond with the tool names and their descriptions.

> 📸 **Screenshot here**: Copilot's response listing all available hana-tools with descriptions.

---

## Step 3 – Explore Your HANA Schema and S/4HANA Remote Source

Now put the tools to work. These questions are designed to give you a picture of your database before you start building on it.

### What is already in your HANA schema?

Type in Copilot Agent chat:

```
What tables exist in my HANA schema? Give me their names and a one-line description of each.
```

> Copilot calls `getHanaDocumentation` and queries your live schema. It should return the tables that the HDI container has deployed so far (likely just base CAP tables from Exercise 0 at this point).

> 📸 **Screenshot here**: Copilot's response listing your current HANA tables by name.

---

### What S/4HANA data is available via remote source?

```
List the available remote sources on my HANA instance and describe what they expose.
```

> Copilot calls `listRemoteSources` → connects to HANA → returns the SDA/SDI remote sources configured. You should see the S/4HANA remote source (configured before the session).

> 📸 **Screenshot here**: Copilot's response listing the remote sources, including the S/4HANA connector.

```
Explore the S/4HANA remote source. What product-related objects (tables or views) are available?
```

> Copilot calls `exploreRemoteSource` and browses the objects. This is the same remote source your CAP app will use in Exercise 2 via a virtual table.

> 📸 **Screenshot here**: Copilot listing S/4HANA objects, including the product-related API views.

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

> 📸 **Screenshot here**: Copilot's response showing either a "valid" result or a clear explanation of the error.

### Test SQL for a REAL_VECTOR column

This is the column you will create in Exercise 2. Ask Copilot to validate the DDL:

```
Is the following SQL valid for adding a vector column in SAP HANA Cloud?
ALTER TABLE PRODUCTS_PRODUCTEXTENSION ADD (EMBEDDING REAL_VECTOR(1536))
```

> Copilot validates the syntax and confirms whether `REAL_VECTOR(1536)` is the correct type. If you have any doubts about HANA vector syntax, this is the fastest way to check.

> 📸 **Screenshot here**: Copilot confirming the REAL_VECTOR syntax is valid in SAP HANA Cloud.

### Ask HANA documentation a question

```
What indexes can I create on a REAL_VECTOR column in SAP HANA Cloud? What is the difference between HNSW and IVF?
```

> Copilot calls `getHanaDocumentation` → searches the HANA SQL Reference → returns an accurate, up-to-date answer from the actual documentation.

> 📸 **Screenshot here**: Copilot's answer about REAL_VECTOR indexing, citing HANA SQL Reference content.

---

## Step 5 – Understand HDI Artifact Types

Before you write the vector table definition in Exercise 2, ask Copilot to explain the artifact type you will use:

```
I need to add a new column to an existing HDI table definition. 
What artifact type should I use — .hdbtable or .hdbmigrationtable?
What is the difference?
```

> Copilot calls `getHdiArtifactContext` with the relevant artifact type and returns the syntax rules, JSON schema, and the key differences. This is the exact question you will face when you open the exercise file.

> 📸 **Screenshot here**: Copilot explaining the difference between `.hdbtable` and `.hdbmigrationtable`, with the recommendation for this workshop.

```
Show me the post-creation checklist for a .hdbmigrationtable artifact.
```

> Copilot calls `getHdiArtifactVerificationChecklist` → returns the required companion files and common mistakes. Keep this in mind for Exercise 2.

> 📸 **Screenshot here**: Copilot's checklist including companion file requirements and common .hdbmigrationtable mistakes.

---

## Bonus – Deploy an Artifact from Chat

If you want to try the full HDI lifecycle integration:

```
Set the project directory to ~/projects/teched2026-DA164 and show me the current artifact status.
```

> Copilot calls `set_project_directory` (loads credentials from `.env`) then `get_artifact_status` (compares your local workspace files against what is deployed in the HDI container). Any differences show up as undeployed or changed artifacts.

> 📸 **Screenshot here**: Copilot's status report showing which artifacts are deployed vs. undeployed in the HDI container.

---

## What Just Happened

```
GitHub Copilot (BAS Agent Mode)
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

Your AI coding assistant now has the same live HANA knowledge that a DBA would have. Every SQL statement you ask Copilot to write or review in the remaining exercises can be validated against the real schema before you run it.

---

## Summary

| What you did | What it gives you |
|---|---|
| Configured `.vscode/mcp.json` | GitHub Copilot connected to live HANA |
| Explored schema and remote sources | Clear picture of your database before you build on it |
| Validated SQL and DDL | No surprises when you run it for the first time |
| Learned HDI artifact types | Ready to write the vector table definition in Exercise 2 |

**Next**: Add the AI-enriched vector column to your HANA Cloud table.

Continue to [Exercise 2 – Extend & Persist in SAP HANA Cloud](../ex2/README.md)
