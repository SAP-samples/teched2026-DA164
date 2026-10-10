# DA164 - Build AI Agents and Applications Natively on SAP HANA Cloud

## Description

This repository contains the material for the SAP TechEd 2026 hands-on session **DA164 – Build AI Agents and Applications Natively on SAP HANA Cloud**.

---

## The Problem

Maya is a Freight Pricing Specialist at **GlobalFreight AG**, a logistics company that runs SAP S/4HANA Cloud. GlobalFreight offers international freight and shipping services, and maintains a catalog of hundreds of service charge codes in S/4HANA — everything from basic freight rates to port handling fees, customs documentation charges, dangerous goods surcharges, and detention fees.

Every day Maya handles 20–30 customer inquiries like these:

> *"I have a container arriving at port — it's oversized and contains hazardous chemicals. What charges apply?"*
> *"We need to book a flat-rate freight shipment with insurance. What's covered?"*
> *"Can you explain what demurrage means and when it kicks in?"*

**The current situation:**

- S/4HANA search only works with exact charge codes and keywords. A customer asking about *"extra fees for late container pickup"* gets nothing — unless they already know the code "Demurrage/Detention Charges".
- Every complex inquiry lands in Maya's inbox. She manually scans through service codes, checks rate sheets, and confirms combinations.
- Average time for a complex multi-charge quote: **30–45 minutes**.
- The company has a strict **clean core policy** — no custom code modifications inside S/4HANA. Any extension must be built outside.

This costs Maya's team hours every day and delays quotes for customers.

---

## The Solution You Will Build

In this session you will build the application that solves Maya's problem: an **Intelligent Service Charge Advisor** on SAP BTP that connects to S/4HANA data, enriches it with AI capabilities inside SAP HANA Cloud, and answers service charge questions in seconds.

By the end of the session:

| Before | After |
|---|---|
| Manual keyword search in S/4HANA charge codes | Natural-language search across service charge meanings |
| 30–45 minutes per complex inquiry | Answer in seconds, grounded in real S/4HANA data |
| Requires an expert to know all the charge codes | AI advisor available to any team member, anytime |
| S/4HANA core modifications blocked | Extension built entirely on BTP — clean core maintained |

**Clean core principle**: the S/4HANA system is never modified. All AI and extension logic lives in your CAP app on BTP.

---

## Scenario

You are building a side-by-side extension for GlobalFreight AG. The app:

1. **Reads** service charge master data from S/4HANA via a BTP Destination — no core modifications
2. **Stores** an enriched copy in SAP HANA Cloud with extra AI fields
3. **Generates** semantic embeddings so HANA understands the *meaning* of each service charge
4. **Searches** using hybrid text + vector search — finds *"fees for late container pickup"* even if "Demurrage" doesn't appear in the query
5. **Advises** with a RAG-based AI that gives Maya specific charge recommendations in plain language
6. **Exposes** everything as AI tools via MCP — available in Joule Studio and AI coding assistants

The stack you will work with:

| Layer | Technology |
|---|---|
| Application framework | SAP Cloud Application Programming Model (CAP / CDS) |
| SAP backend (read-only) | SAP S/4HANA Cloud — Product Master API via SAP Business Accelerator Hub |
| BTP connectivity | BTP Destination Service |
| Database & vector store | SAP HANA Cloud + Vector Engine |
| AI models & embeddings | SAP AI Core via SAP Generative AI Hub |
| AI tool protocol | Model Context Protocol (MCP) via HANA agents + `@cap-js/mcp` |
| Development environment | SAP Business Application Studio (BAS) |

## Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      SAP BTP (your extension)                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                     CAP Application                      │    │
│  │  ┌──────────────┐  ┌────────────────┐  ┌────────────┐  │    │
│  │  │  Product API  │  │ Hybrid Search  │  │ AI Advisor │  │    │
│  │  │  (OData/REST) │  │  (text+vector) │  │   (RAG)    │  │    │
│  │  └──────┬───────┘  └───────┬────────┘  └─────┬──────┘  │    │
│  │         │                  │                  │          │    │
│  │  ┌──────▼──────────────────▼──────────────────▼──────┐  │    │
│  │  │           SAP HANA Cloud                          │  │    │
│  │  │  Product extension table  +  Vector Engine        │  │    │
│  │  └───────────────────────────────────────────────────┘  │    │
│  └────────────┬─────────────────────────┬───────────────────┘   │
│               │ BTP Destination          │ SAP AI Core           │
└───────────────┼──────────────────────────┼───────────────────────┘
                │                          │
     ┌──────────▼──────────┐   ┌──────────▼──────────┐
     │  SAP S/4HANA Cloud  │   │  SAP GenAI Hub       │
     │  Product Master API │   │  Embedding + Chat LLM│
     └─────────────────────┘   └─────────────────────┘
```

## Requirements

- Access to an **SAP BTP subaccount** (provided for the session)
- **SAP Business Application Studio** (BAS) provisioned in the subaccount
- Access to **SAP HANA Cloud** (session-provided HDI container binding)
- **SAP AI Core** with SAP Generative AI Hub enabled (session-provided credentials)
- An **API key** for the SAP Business Accelerator Hub sandbox (session-provided)
- Basic familiarity with JavaScript/Node.js and REST APIs

## Exercises

Work through the exercises in order. Each builds directly on the previous one — and each step gets Maya closer to her answer.

- [Getting Started](exercises/ex0/README.md) *(~15 min)*
  - Set up your development environment in BAS
  - Clone the starter project and configure credentials

- [Exercise 1 – Clean Core & Side-by-Side Extensibility](exercises/ex1/README.md) *(~25 min)*
  - Understand the clean core principle and side-by-side extension pattern
  - Create a BTP Destination to the SAP S/4HANA Cloud Product API
  - Call the Product Master API from CAP without touching S/4HANA

- [Exercise 2 – Extend & Persist in SAP HANA Cloud](exercises/ex2/README.md) *(~20 min)*
  - Define a local product extension table in CDS
  - Replicate product data from S/4HANA into HANA Cloud
  - Add extension fields for AI-generated content

- [Exercise 3 – Enrich Products with AI Embeddings](exercises/ex3/README.md) *(~25 min)*
  - Explore your data in HANA Database Explorer
  - Add a vector column to the extension table
  - Generate and store embeddings using SAP AI Core

- [Exercise 4 – Hybrid Search: Full-Text + Semantic](exercises/ex4/README.md) *(~25 min)*
  - Combine HANA's `CONTAINS` full-text search with `COSINE_SIMILARITY` vector search
  - Expose hybrid search as a CAP action
  - Compare keyword search vs semantic search vs hybrid

- [Exercise 5 – Build, Deploy, and Connect Your AI Product Advisor Agent](exercises/ex5/README.md) *(~30 min)*
  - Implement Retrieval-Augmented Generation over your HANA product data
  - Call an LLM via SAP Generative AI Hub with retrieved context
  - Ask free-form questions answered from real S/4HANA product data — and expose the advisor as a Joule Skill

## Optional Exercises

- [Optional – AI-Assisted HANA Development with GitHub Copilot *(requires GitHub account)*](exercises/ex-hana-tools/README.md) *(~20 min)*
  - Configure `@sap/hana-tooling-mcp-server` in BAS so GitHub Copilot has live HANA access
  - Explore your schema and S/4HANA remote source from a chat window
  - Validate SQL and learn HDI artifact types before you write a single line of DDL

- [Optional – Expose Your CAP App as an MCP Server](exercises/ex7/README.md) *(~20 min)*
  - Install `@cap-js/mcp` and annotate `ProductService` with `@mcp`
  - Connect an AI assistant to your deployed CAP app
  - Use natural language to run hybrid search and query the advisor — one package, one annotation

## Contributing
Please read the [CONTRIBUTING.md](./CONTRIBUTING.md) to understand the contribution guidelines.

## Code of Conduct
Please read the [SAP Open Source Code of Conduct](https://github.com/SAP-samples/.github/blob/main/CODE_OF_CONDUCT.md).

## How to obtain support

Support for the content in this repository is available during the actual time of the online session for which this content has been designed. Otherwise, you may request support via the [Issues](../../issues) tab.

## License
Copyright (2026) SAP SE or an SAP affiliate company and teched2026-DA164 contributors. Please see our [LICENSE](LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available [via the REUSE tool](https://api.reuse.software/info/github.com/SAP/teched2026-DA164).
