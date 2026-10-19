# Exercise 5 – Build, Deploy, and Connect Your AI Product Advisor Agent

This exercise is split into three parts. Each part builds on the last, and together they take your application from a local prototype to a live, user-facing AI tool inside Joule Studio.

| Part | What you do | End result |
|---|---|---|
| **A** | Write the AI advisor logic | An agent that answers service charge questions in plain language |
| **B** *(optional)* | Deploy your own app to Cloud Foundry | A live, personally deployed URL for your agent |
| **C** | Create a Joule Skill | Maya uses your agent directly from the Joule chat interface |

> **Note on Part B**: The session team has pre-deployed a shared CAP app that Part C uses. You can complete Part C and test Joule without doing Part B. Come back to Part B if you have time — it's a useful skill, but not a blocker.

> **Story context:**
> You have built hybrid search in Exercise 4. The search returns a list of matching service charges. But Maya doesn't want to send a customer a raw list — she needs a clear, confident written recommendation. In Part A you will build the AI layer that turns those results into a plain-English answer. In Part B you will make it live. In Part C you will put it in Maya's hands.

---

---

# Part A – Write the AI Agent

## What is an AI Agent?

An AI agent is a program that follows a loop:

```
Perceive  →  Retrieve  →  Reason  →  Respond
```

Your `askAdvisor` action follows exactly this loop:

1. **Perceive** — it receives a customer question
2. **Retrieve** — it searches HANA Cloud for the most relevant service charges using hybrid search
3. **Reason** — it sends those service charges plus the question to the AI, which writes a grounded answer
4. **Respond** — the answer is returned to the caller

The AI never invents service charges. It can only use what HANA returns. If HANA returns nothing relevant, the AI says so. That is what makes this a *grounded* agent — not a chatbot that guesses.

---

## What you will do in Part A

1. Import the AI Core helper into the service
2. Write the `askAdvisor` handler
3. Test the agent with real questions
4. Confirm it refuses to answer out-of-scope questions

---

## Step A1 – Import the AI Core Helper

1. Open [srv/product-service.js](../../srv/product-service.js).

2. Check that the following `require` line is at the very top of the file, below any other imports:

```js
const { chatCompletion } = require('./ai-core-client')
```

If it is already there from a previous step, skip ahead. If not, add it now.

3. Also make sure `db` is declared inside `init()`. You should already have this from Exercise 4:

```js
async init() {
  const s4 = await cds.connect.to('API_PRODUCT_SRV')
  const db = await cds.connect.to('db')
  ...
}
```

![product-service.js showing require imports and db connection line inside init()](images/prodservdb.png)

---

## Step A2 – Write the askAdvisor Handler

1. Still in [srv/product-service.js](../../srv/product-service.js), add the `askAdvisor` handler inside the `init()` method, after the `hybridSearch` handler.

```js
this.on('askAdvisor', async (req) => {
  const { question } = req.data
  const likePattern = `%${question}%`

  // Step 1 – Retrieve: search HANA for the most relevant service charges
  const products = await db.run(
    `SELECT TOP 3
       PRODUCT, PRODUCTTYPE, DESCRIPTION, BASEUNIT,
       ROUND(
         0.6 * COSINE_SIMILARITY(EMBEDDING, VECTOR_EMBEDDING(?, 'QUERY', 'SAP_GXY.20250407'))
         + 0.4 * CASE WHEN LOWER(DESCRIPTION) LIKE LOWER(?) THEN 1.0 ELSE 0.0 END
       , 4) AS HYBRID_SCORE
     FROM PRODUCTS_PRODUCTEXTENSION
     WHERE EMBEDDING IS NOT NULL
     ORDER BY HYBRID_SCORE DESC`,
    [question, likePattern]
  )

  // Step 2 – Reason: put the service charges into a context block for the AI
  const context = products.length > 0
    ? products.map((p, i) =>
        `Product ${i + 1}: ${p.PRODUCT} (Type: ${p.PRODUCTTYPE}, Unit: ${p.BASEUNIT})\n` +
        `Description: ${p.DESCRIPTION}`
      ).join('\n\n')
    : 'No matching service charges found in the catalog.'

  const messages = [
    {
      role: 'system',
      content: `You are a helpful service charge advisor for a logistics company.
Answer the customer's question using ONLY the service charge catalog entries below.
If the answer is not in the service charge catalog, politely say you don't have that information.
Always include the charge code when you make a recommendation.
Never invent or guess service charge names, codes, or specifications.

Service charge catalog:
${context}`
    },
    {
      role: 'user',
      content: question
    }
  ]

  // Step 3 – Respond: return the AI's answer
  const answer = await chatCompletion(messages)
  return { answer }
})
```

2. Save the file (**Ctrl+S** / **Cmd+S**).

![product-service.js showing the complete askAdvisor handler](images/askadvisor.png)

> **What do the two `?` placeholders do?**
> The first `?` is the search text for `VECTOR_EMBEDDING` — HANA converts it to a vector inline, same as in Exercise 4. The second `?` is the raw text for the `LIKE` keyword match. Both are passed safely as query parameters.

---

## Step A3 – Restart and Test the Agent

1. Check your terminal — if `cds watch --profile hybrid` is already running, press **Ctrl+C** to stop it. Then run:

```bash
cds watch --profile hybrid
```

![Terminal showing cds watch running with connect to db > hana in the log](images/cdswatch.png)

2. Open a **second terminal tab** and send the first test question:

```bash
curl -X POST http://localhost:4004/odata/v4/product/askAdvisor \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the demurrage charges for a container held at port?"}'
```

You should get back a plain-English answer that includes a specific charge code, like:

```json
{ "answer": "The demurrage charges for a container held at port are covered under Product 236 (Demurrage/Detention Charges)." }
```

![BAS test.http showing askAdvisor response with a grounded charge recommendation](images/askresp.png)

3. Try a second question to test a different type of query:

```bash
curl -X POST http://localhost:4004/odata/v4/product/askAdvisor \
  -H "Content-Type: application/json" \
  -d '{"question": "Which port handling charges apply to air freight shipments?"}'
```

![Terminal showing askAdvisor response for a second test question](images/curlnewa3.png)

---

## Step A4 – Test What the Agent Will Not Answer

Ask something completely outside the service charge catalog:

```bash
curl -X POST http://localhost:4004/odata/v4/product/askAdvisor \
  -H "Content-Type: application/json" \
  -d '{"question": "Which port handling charges apply to air freight shipments?"}'
```

The advisor should politely decline — something like:
> *"I'm sorry, but I don't have that information."*

![Terminal showing advisor declining out-of-scope air freight question](images/a4.png)

> **Why does this matter?**
> The AI is grounded in your HANA data. It does not search the internet. It does not guess. If the question has no match in HANA, the system message instructs the AI to say so. This is the difference between a reliable business tool and a chatbot that makes things up.

---

## Part A Summary

You now have a working AI service charge advisor agent. It:
- Uses HANA Cloud's hybrid search to find the 3 most relevant service charges for any question
- Sends those service charges as context to the LLM via SAP AI Core
- Returns a grounded, catalog-accurate answer in plain language
- Refuses to answer questions outside the service charge catalog

**Next**: Make this agent available on a public URL so Joule Studio can call it.

---

---

# Part B – Deploy Your Agent to Cloud Foundry

## Why Deploy?

Right now your agent runs on `localhost:4004`. Only you can reach it from this BAS workspace. Joule Studio is a cloud service — it cannot call `localhost`. To connect your agent to Joule, it needs to be deployed to Cloud Foundry with a public HTTPS URL.

Deploying also means the agent is always available — not just when you have `cds watch` running in a terminal.

---

## What you will do in Part B

1. Update `mta.yaml` to reference your existing services
2. Check `package.json` for production settings
3. Build the MTA archive
4. Deploy to Cloud Foundry
5. Verify the live endpoint with a curl command

---

## Step B1 – Update mta.yaml

Your project already has an `mta.yaml` generated by the Full Stack Cloud Application template. You need to replace its content with a version that references your existing services correctly.

> The template-generated file creates a new HDI container and may include XSUAA bindings — neither of which you want here. Your HDI container already exists from Exercise 2, and this workshop does not use XSUAA authentication.

1. Open `mta.yaml` at the **project root**.

2. Replace the entire content with the following. **Replace every `<USER-NUMBER>`** with your 3-digit seat number (e.g. `da164-042@...` → `042`):

```yaml
_schema-version: 3.3.0
ID: da164-product-advisor-<USER-NUMBER>
version: 1.0.0
description: "DA164 Product Advisor"
parameters:
  enable-parallel-deployments: true
build-parameters:
  before-all:
    - builder: custom
      commands:
        - npm ci
        - npx cds build --production
modules:
  - name: da164-product-advisor-<USER-NUMBER>-srv
    type: nodejs
    path: gen/srv
    parameters:
      instances: 1
      buildpack: nodejs_buildpack
    build-parameters:
      builder: npm-ci
    provides:
      - name: srv-api
        properties:
          srv-url: ${default-url}
    requires:
      - name: da164-hdi-<USER-NUMBER>
      - name: ai-extended

resources:
  - name: da164-hdi-<USER-NUMBER>
    type: org.cloudfoundry.existing-service
  - name: ai-extended
    type: org.cloudfoundry.existing-service
```

3. Save the file.

![mta.yaml open in BAS showing the updated content with existing-service resources](images/mtayaml.png)

> **Why `org.cloudfoundry.existing-service`?**
> Both `da164-hdi-<USER-NUMBER>` and `ai-extended` already exist in the CF space — created by the session team. Referencing them as `existing-service` tells MTA to bind your app to them without trying to create or manage them. There is no HDI schema deployer module here because the schema was already deployed in Exercise 2.

---

## Step B2 – Check package.json

Before building, make sure your `package.json` is set up correctly for production.

1. Open [package.json](../../package.json).

2. In the `"scripts"` section, make sure `"start"` is set to `"cds-serve"` (not `"cds serve"`):

```json
"scripts": {
  "start": "cds-serve",
  "watch": "cds watch"
},
```

3. Check that `"cds"` → `"requires"` does **not** contain an `"xsuaa"` entry. The Full Stack Cloud Application template sometimes adds this. If you see a block like the one below, **remove the entire `"xsuaa"` block**:

```json
"xsuaa": {
  "kind": "xsuaa"
}
```

4. Add an `"auth"` entry to `"cds"` → `"requires"` to tell CAP not to require JWT tokens in production:

```json
"requires": {
  "auth": {
    "kind": "dummy"
  },
  "API_PRODUCT_SRV": { ... },
  "db": { ... }
}
```

> **Why is this needed?** When `NODE_ENV=production`, CAP automatically switches to `jwt` authentication, which requires an XSUAA service binding. Since this workshop does not use XSUAA, adding `"auth": { "kind": "dummy" }` explicitly overrides that default and lets all requests through.

5. Save `package.json`.

![package.json showing cds.requires with auth dummy and no xsuaa](images/npmscripts.png)

---

## Step B3 – Build the MTA Archive

Run the MTA build tool to compile the project into a deployable archive:

```bash
npx mbt build
```

This runs `npm ci` and `npx cds build --production` (which compiles your CDS models into `gen/`), then packages everything into a single `.mtar` file inside `mta_archives/`.

The build takes about a minute. When it finishes you will see something like:

```
[2026-...] INFO Cloud MTA Build Tool version 1.x.x
[2026-...] INFO generating the "Makefile_20261019...mtar" file...
[2026-...] INFO done
```

![Terminal showing npx mbt build completing successfully with mtar file created](images/mbtbuild.png)

---

## Step B4 – Deploy to Cloud Foundry

1. Make sure you are logged in to Cloud Foundry. If your session has expired since Exercise 2, log in again using SSO:

```bash
cf login -a https://api.cf.eu10-005.hana.ondemand.com --sso
```

The terminal displays a URL to get a one-time passcode. Open it in your browser, copy the passcode, and paste it back into the terminal. Then select org `da164` and space `dev`.

![Terminal showing the cf login --sso command with the passcode URL](../ex2/images/cflogin.png)

![Browser showing the temporary passcode](../ex2/images/temppasscode.png)

![Terminal after pasting the passcode and selecting org/space — login succeeded](../ex2/images/pastepasscode.png)

![Terminal showing org and space selection](../ex2/images/chooseorg.png)

> If you are still logged in from Exercise 2, skip this step and go straight to step 2.

2. Deploy the archive. Replace `<USER-NUMBER>` with your 3-digit seat number:

```bash
cf deploy mta_archives/da164-product-advisor-<USER-NUMBER>_1.0.0.mtar
```

CF reads the archive, deploys your Node.js module, and binds both services. This takes **2–3 minutes**. You will see lines like `Uploading application...`, `Staging application...`, and finally `Application started and available at`.

3. When it finishes, look for the **route** in the output:

```
Application "da164-product-advisor-<USER-NUMBER>-srv" started and available at:
da164-dev-da164-product-advisor-<USER-NUMBER>-srv.cfapps.eu10-005.hana.ondemand.com
```

Copy this URL — you will need it in the next step.

> **Can't find the URL?** Run this in the BAS terminal — replace `<USER-NUMBER>` with your 3-digit seat number:
> ```bash
> cf app da164-product-advisor-<USER-NUMBER>-srv
> ```
> The `routes:` line in the output shows your app's public URL.

![Terminal showing cf deploy completed with the app route URL](images/cfdeploy.png)

---

## Step B5 – Verify the Live Endpoint

Test that your deployed agent is reachable and responding:

```bash
curl -X POST https://<YOUR-APP-ROUTE>/odata/v4/product/askAdvisor \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the demurrage charges for delayed container pickup?"}'
```

Replace `<YOUR-APP-ROUTE>` with the URL from the previous step.

You should get back an AI-generated answer from a live cloud URL.

![Terminal showing curl command with live HTTPS URL and the AI answer in the response](images/curlcommand6.png)

> **Troubleshooting — 400 Bad Request:**
> This almost always means XSUAA authentication is active. Check that `package.json` has no `"xsuaa"` block in `cds.requires`, and run `cf env da164-product-advisor-<USER-NUMBER>-srv` to confirm no XSUAA service appears in `VCAP_SERVICES`.

> **Troubleshooting — 500 error or no response:**
> Run `cf logs da164-product-advisor-<USER-NUMBER>-srv --recent` to see what went wrong. The most common cause is `ai-extended` missing from `mta.yaml` resources — without it, the app has no AI Core credentials.

---

## Part B Summary

Your agent is now:
- Deployed to Cloud Foundry with a public HTTPS URL
- Connected to your HANA Cloud HDI container and SAP AI Core via CF service bindings

> **Note — `CAP_PRODUCT_ADVISOR` is pre-configured for you**: The session team has already set up a BTP Destination called `CAP_PRODUCT_ADVISOR` pointing to a shared, pre-deployed CAP app. The CAP service is live and its OData model has been activated, so when you select the destination in Step C4 and click the refresh icon, the service operations (`askAdvisor`, `hybridSearch`, `getProducts`, `syncProducts`) will load automatically — you are not activating anything yourself, you are simply connecting to a service that is already running. Your personal deployed app (from Part B) is great for your own testing; the shared instance is what Joule Studio will call.

**Next**: Create a Joule Skill so Maya can use your agent directly from the Joule chat interface.

---

---

# Part C – Create a Joule Skill to Use Your Agent

## What is a Joule Skill?

A **Joule Skill** is a custom capability you add to Joule Studio. When a user says something that matches the skill's purpose, Joule runs the skill — which can call a backend system, process the result, and reply to the user in a structured format.

In this exercise you will create a Joule Skill that:
1. Takes a service charge question from the user
2. Calls your CAP `askAdvisor` action via the `CAP_PRODUCT_ADVISOR` destination
3. Returns the AI-generated answer as a Joule chat message

This is the final step that puts the entire system in Maya's hands. She opens Joule, types a customer question about freight charges, and the answer comes back instantly — powered by HANA Cloud's vector engine, SAP AI Core, and your CAP service running on BTP.

---

## What you will do in Part C

1. Open the SAP Build Lobby
2. Create a new Joule Skill project
3. Create the skill and add the advisor action
4. Configure the input and the destination
5. Add a Send Message component to display the answer
6. Save, release, and deploy the skill
7. Test Maya asking a service charge question in Joule

---

## Step C1 – Open the SAP Build Lobby

1. Go to [https://da164.eu10.build.cloud.sap/lobby](https://da164.eu10.build.cloud.sap/lobby) and log in with your BTP credentials.

![SAP Build Lobby home page](images/buildlobby.png)

---

## Step C2 – Create a New Joule Skill Project

1. Click the **Create** button in the top area of the lobby.

2. A dialog opens asking what you want to build. Click the **Joule Agent and Skill** tile.

![Create Project dialog with Joule Agent and Skill tile selected](images/createjouleskill1.png)

3. Fill in the project details:

| Field | Value |
|---|---|
| **Name** | `DA164 Service Charge Advisor` |
| **Description** | `Answers customer service charge questions using AI and SAP HANA Cloud data` |

![Project creation form showing Name and Description fields filled in](images/agentdesc.png)

4. Click **Review**, then **Create**. SAP Build creates the project and opens it.

![Newly created Joule Skill project open](images/newagenttab.png)

---

## Step C3 – Create the Skill Inside the Project

After the project is created, you need to create the skill itself inside the project.

1. Click the **Create** dropdown button inside the project and select **Joule Skill**.

![Create dropdown inside the project showing Joule Skill option](images/createjouleskillinside.png)

3. Give your skill a name and a description that tells Joule when to use it:

| Field | Value |
|---|---|
| **Name** | `askServiceChargeAdvisor` |
| **Description** | `Use this skill when the user asks about freight charges, container fees, or service charge recommendations` |

> The description is important — Joule reads it to decide whether this skill matches the user's intent. Make it as descriptive as possible.

![Skill creation form showing Name, Identifier, and Description fields](images/jouleskillinfo.png)

4. Click **Create**.

![Empty skill flow canvas](images/emptycanva.png)

---

## Step C4 – Add the askAdvisor Action

Now you will add a step that calls your CAP `askAdvisor` action. This involves two parts: creating the action project, then adding it to the skill.

### Part 1 – Create the Action Project

1. On the skill flow canvas, click **+** to add a new step.

2. From the step type list, choose **Call Action**.

![Step type list with Call Action highlighted](images/choosecallaction.png)

3. A panel opens showing available actions. No actions exist yet — click **Start by creating a Blank Call Action**.

![Call Action panel showing no available actions](images/browseallaction.png)

4. The **Choose an API Source** dialog opens. Select **SAP Cloud Application Programming Model**.

5. Select the **CAP_PRODUCT_ADVISOR** destination. In the **Resource Path** field enter `/odata/v4/product` and click the refresh icon.

![CAP_PRODUCT_ADVISOR destination selected with API methods loaded](images/CAPaction.png)

> The service operations appear because the shared CAP app behind this destination is already deployed and active. You do not need to activate anything — just select and proceed.

6. Expand **Service Operations** and click **POST — Invoke action askAdvisor**.

![Service Operations showing askAdvisor highlighted](images/selectinvoke.png)

7. Give the action project a name:

| Field | Value |
|---|---|
| **Project Name** | `DA164 CAP Product Advisor` |
| **Description** | `Calls the askAdvisor action on the CAP service charge advisor` |

Click **Add**.

![Action project name form filled in](images/createdaction.png)

---

### Part 2 – Release the Action Project

The action project must be released before it can be used in the skill.

1. Go back to the **SAP Build Lobby**. Find the **DA164 CAP Product Advisor** project and open it.

2. Click **Release**.

![Action project open showing Release button](images/release.png)

3. Confirm the release in the dialog that appears.

![Release confirmation dialog](images/wantoublish.png)

4. The project status changes to **Published**.

![Action project showing Published status](images/published.png)

---

### Part 3 – Add the Action to the Skill

1. Go back to your Joule Skill. Click **+** on the canvas again and choose **Call Action**.

2. The **Browse All Actions** panel now shows your action. Select **askAdvisor**.

![Browse All Actions showing askAdvisor available](images/askadvisoraction.png)

3. The action step is added to the canvas.

![Skill canvas with askAdvisor action step added](images/actionadded.png)

---

## Step C5 – Configure the Input Parameter

After the action is added to the canvas, you need to:
1. Create a destination variable for the action
2. Define a `question` input on the skill trigger
3. Map that input to the action's `question` field

### Part 1 – Create a Destination Variable

1. Open the **Variables** panel in the skill editor (tab or icon on the left of the canvas).

2. Create a new variable:

| Field | Value |
|---|---|
| **Name** | `destCAP` |
| **Type** | Destination |
| **Identifier** | `CAP_PRODUCT_ADVISOR` |

![Variables panel showing destCAP destination variable](images/createdestvariable.png)

After saving, the variable appears in the variables list.

![Destination variable destCAP added to the variables list](images/addeddest.png)

3. Go back to the **Invoke action askAdvisor** step on the canvas. In the **Destination Variable** field, select **destCAP**.

![Action step with destCAP selected as destination variable](images/chooseinvoke.png)

---

### Part 2 – Define the Skill Input on the Trigger

1. Click the **Trigger** node ("When a scenario is called") on the canvas to open its configuration.

2. The **Configure Skill Inputs** dialog opens. Click **Add Input**.

3. Fill in the row:

| Field | Value |
|---|---|
| **Name** | `question` |
| **Identifier** | `question` |
| **Description** | `Question for the service charge advisor` |
| **Type** | String |
| **Required** | ✅ checked |

![Configure Skill Inputs dialog with question input defined](images/configinput.png)

4. Click **Apply**.

---

### Part 3 – Map the Input to the Action

1. Click on the **Invoke action askAdvisor** step on the canvas. Open the **Inputs** tab in the right panel.

2. Click the **binding icon** (`>>`) next to the `question` field. The **Skill Content** picker opens.

3. Under **Skill Inputs**, select **question**.

![Skill Content picker showing question input bound to the action](images/invokeinput.png)

---

## Step C6 – Add a Send Response Step

After the action runs successfully, you need to send the AI answer back to the user in Joule.

1. On the flow canvas, click the **`+`** button on the **Success 2XX** branch below the **Invoke action askAdvisor** step.

2. A panel opens with response options. Choose **Send Response**.

![Send Response options panel](images/sendresponse2xx.png)

3. Select **Send Message**.

![Send Message step added to the skill canvas](images/sendmessage.png)

4. Click **Open Message Editor**. The **Message Configuration** dialog opens.

5. Change **Message Type** from "Illustrated Message" to **Text**.

6. Click the **`<>`** binding icon on the **Text** field to open the Data Mapping panel.

7. Navigate to **context → joule_action_... → result → answer** and select **answer**.

The Text field fills with the expression `${context.joule_action_...result.answer}`. The Preview on the right shows `${answer}`.

![Message Configuration with Text type and answer output bound](images/messageconfigresponse.png)

8. Click **Save**.

---

## Step C7 – Save, Release, and Deploy

1. Click **Save** (top right) to save the skill. The asterisk `*` next to the skill name disappears.

2. Click **Release** → confirm to create version **1.0.0**.

![Green release confirmation banner showing version 1.0.0 released](images/released.png)

3. The version page opens. Click **Deploy**.

4. The **Choose an Environment** panel opens. Select **shared** and click **Deploy**.

![Choose an Environment panel with shared environment selected](images/deploy.png)

5. A **Define Variables** dialog appears. The destination variable `CAP_PRODUCT_ADVISOR` is shown — confirm it is set to `CAP_PRODUCT_ADVISOR` and click **Deploy**.

![Define Variables dialog showing CAP_PRODUCT_ADVISOR destination](images/choosevarfordeploy.png)

6. A **Deploying...** spinner appears while the skill is being activated.

![Deploying spinner](images/deploying.png)

7. The status changes to **Deployed** and **Active**.

![Project overview showing version Deployed and Active](images/deployed.png)

---

## Step C8 – Test Maya's New Tool in Joule

The Joule chat is available directly inside SAP Build — click the **Joule icon** (sparkle icon) in the left sidebar to open the chat panel.

1. Type the first test question exactly as Maya would:

```
What charges apply for a dangerous goods shipment in a 40ft container?
```

![Joule chat showing dangerous goods question with grounded service charge answer](images/joule1.png)

3. Try a second question:

```
Which charges apply to air freight shipments?
```

![Joule chat showing air freight question with structured charge list](images/joule2.png)

4. Try an out-of-scope question to confirm the advisor stays grounded:

```
What is the current fuel surcharge rate for transpacific routes?
```

The advisor correctly responds that live rate data is not available — it does not invent a number. Joule may handle this at the base model level before the skill is invoked, but in both cases no fabricated rate appears.

![Joule responding to out-of-scope transpacific rate question without fabricating data](images/joule3.png)

---

## Part C Summary

You have just completed the full loop:

```
Maya types a question in Joule
        │
        ▼
Joule Skill (SAP Build)
        │  POST /odata/v4/product/askAdvisor
        ▼
CAP ProductService on Cloud Foundry
        │  hybrid search (keyword + semantic)
        ▼
SAP HANA Cloud — REAL_VECTOR(1536) column
        │  top 3 products returned
        ▼
SAP AI Core (LLM)
        │  grounded answer generated
        ▼
Answer appears in Maya's Joule chat
```

---

---

## Exercise 5 – Complete Summary

| Part | What you built | Key technology |
|---|---|---|
| A | AI agent that answers service charge questions in plain language | SAP AI Core, RAG pattern, HANA hybrid search |
| B | Deployed the agent to Cloud Foundry with a live HTTPS URL | MTA build tool, `cf deploy`, BTP service bindings |
| C | Joule Skill that puts the agent in Maya's Joule chat interface | Joule Studio, SAP Build, HTTP Action |

You have now built and deployed a complete, production-pattern AI agent:
- It reads real service charge data from S/4HANA (Exercise 1)
- It stores and extends that data in HANA Cloud (Exercise 2)
- It understands service charge descriptions through AI embeddings (Exercise 3)
- It finds the right service charges using hybrid search (Exercise 4)
- It reasons over those service charges and gives grounded answers (Exercise 5A)
- It runs on BTP as a live cloud service (Exercise 5B)
- It is available to end users inside Joule Studio (Exercise 5C)

Maya's 2–3 day problem is now a 3-second interaction.

*Back to [Session Overview](../../README.md) | Continue to [Exercise 6 – Expose Your CAP App as an MCP Server](../ex6/README.md)*
