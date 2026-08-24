# Architectural Deep Research: Organizational AI-Workforce Platform

**Source**: Gemini Spark (Google's new research tool), first pass
**Date**: 2026-08-24
**Status**: FIRST RESULT — Q intends a larger/deeper research pass later for comparison
against this one. This document is a candidate answer, not yet adopted into ADR-0026 or
any spec. Treat as input to be weighed against the later research, not as a settled
decision.

**Document Target**: Architectural detailing and grounding for `ai-drakon-scaffolder`
(ADR-0026 & SDD extension)

---

## 1. Resolution of ADR-0026 Open Questions (Q1–Q4)

### Q1. Client Bootstrap Path (Mass User vs. Termux)

* **The Problem**: While Termux + CLI provides a powerful prototyping runtime for developers, mass-market workers (factory technicians, electricians, building superintendents) cannot manage Linux packages, environment variables, or shell environments.
* **Proposed Architecture**: **Progressive Web App (PWA) with Edge-Driven Durable Sessions & WebContainer/WASM Runtime**.
* **Mechanisms in Codebase**:
  * **Cloudflare Workers + Durable Objects**: Each active worker agent session binds to a lightweight Cloudflare Worker / Durable Object acting as the agent's execution sidecar.
  * **Client Layer**: An installable, offline-capable PWA built with React + Vite + TanStack Router (extending the current frontend stack). The client stores active tasks and cached knowledge locally via IndexedDB.
  * **Voice/Chat Interface**: Utilizes native browser Web Speech / MediaRecorder APIs for multimodal voice input, bypassing terminal interaction entirely.
  * **Bridge to Advanced Runtimes**: For edge environments requiring localized offline tool execution, lightweight WASM runtimes or local background workers run inside the PWA sandbox. Native wrapper builds (Capacitor/Tauri) are introduced only as thin packaging for push notifications and background sync.

---

### Q2. Personal vs. Organizational Knowledge-Base Boundaries

* **The Problem**: Deciding what data remains private to the individual worker versus what is indexed into the organization-wide shared memory, while respecting the hard tenant boundaries of ADR-0025.
* **Proposed Architecture**: **Two-Tier Partitioned Storage with Cryptographic Scoping**.
* **Mechanisms in Codebase**:
  * **Tier 1 (Personal Workspace Partition)**: Worker notes, draft observations, raw voice transcripts, and scratchpad tasks reside in a personal user partition (`tenant_users_private` in Cloudflare D1 / Appwrite). This data is strictly queryable only by the worker's own agent instance.
  * **Tier 2 (Shared Organizational Corpus)**: Promoted Field Decision Records (FDRs), approved Standard Operating Procedures (SOPs), and diagrammatic workflows reside in the tenant-wide knowledge repository (indexed via vector storage/MemPalace and GitNexus semantic graph).
  * **Tenant Boundary Invariant**: Cross-tenant data sharing remains strictly blocked at the D1/Worker middleware layer by tenant ID scoping (`tenantId` prefix on all vector embeddings and relational rows).

```
+-------------------------------------------------------------------------+
| Tenant Boundary (ADR-0025 Hard Isolation)                               |
|                                                                         |
|  +-----------------------------------+  +----------------------------+  |
|  | Shared Organizational Knowledge   |  | Hierarchy & RBAC Index     |  |
|  | (SOPs, Promoted FDRs, DRAKON IR)  |  | (Departments / Teams)      |  |
|  +-----------------+-----------------+  +--------------+-------------+  |
|                    ^                                   |                |
|                    | Promoted & Approved               | Scoped Access  |
|                    | Knowledge                         v                |
|  +-----------------+-------------------------------------------------+  |
|  | Personal Worker Knowledge Partition (Private D1 / Local Cache)   |  |
|  | - Raw logs & voice transcripts                                    |  |
|  | - Draft observations & personal shortcuts                         |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

---

### Q3. AI-Supervisor Granularity & Context Topology

* **The Problem**: A single monolithic supervisor agent loses operational nuance, while one supervisor per individual worker creates state fragmentation and excessive LLM invocation costs.
* **Proposed Architecture**: **Hierarchical Role-Bound Agent Specs (Inherited Harness Specs)**.
* **Mechanisms in Codebase**:
  * Supervisors are instantiated at the **Team / Sub-Unit node** in the organizational graph (e.g., one per brigade or department).
  * Harness Specs (Slice 3.4a/4.4) define the supervisor's scoped tool grants (e.g., inventory catalog, shift scheduling, safety clearance).
  * When a worker requests materials or escalates an issue, their personal agent delegates to the **Unit Supervisor Agent**, which inherits the organizational policies (4-Gate Policy Engine, ADR-0020) and has visibility only across its assigned sub-unit.

---

### Q4. Generalization Beyond Industrial Vocabulary

* **The Problem**: Words like "shift", "brigade", and "workshop" feel unnatural in office, legal, or residential property contexts.
* **Proposed Architecture**: **Abstract Core Entities with Domain Lexicon Overlays**.
* **Mechanisms in Codebase**: The internal schema operates exclusively on domain-agnostic primitive entities. The UI and LLM system prompts apply domain-specific localization dictionaries:

| Abstract Core Primitive | Industrial Archetype | Residential / Property Archetype | Office / Knowledge Team Archetype |
| --- | --- | --- | --- |
| **`OrgUnit`** | Workshop / Shop Floor | Building / Residential Complex | Department / Division |
| **`TeamPod`** | Brigade / Crew | Service Team (Plumbing/HVAC) | Squad / Working Group |
| **`ParticipantRole`** | Technician / Machinist | Maintenance / Concierge | Specialist / Analyst |
| **`DutyCycle`** | Shift / Roster | On-Call / Dispatch Window | Workday / Sprint Phase |
| **`CoordinatorAgent`** | Shift Supervisor | Property Dispatcher | Project Coordinator |
| **`OperationalRecord`** | Tool/Machine Log | Maintenance Ticket & Log | Decision Record / Memo |

---

## 2. Organizational Hierarchy Shape (Resolving Q6)

### Recommendation: Nested Sub-Groups within a Tenant

#### Tradeoff Analysis

| Evaluation Metric | Option A: Nested Tenants (Sub-Tenants) | Option B: Nested Sub-Groups within Single Tenant (**Recommended**) |
| --- | --- | --- |
| **Billing & Quota Management** | High complexity; requires cross-tenant invoice aggregation and distributed license metering. | **Simple & Direct**; monthly active participant counter dynamically aggregates over the single tenant root. |
| **Tenant Isolation (ADR-0025)** | High risk of policy dilution; requires building cross-tenant delegation holes into hard isolation boundaries. | **Preserves Invariant**; tenant boundary remains absolute at the perimeter; intra-tenant permissions use standard RBAC. |
| **Shared Knowledge Retrieval** | Requires complex federated search across multiple tenant vector stores. | **Unified Index**; vector search scopes query by `org_unit_path` prefix (`/root/dep_1/team_2`). |
| **Recursive Expansion** | Fragile cascading tenant lifecycle management. | **Simple Tree Traversal**; participants invite child members based on structural node permissions. |

---

### Access & Visibility Control Flow (DRAKON-Describable Logic)

```
[Start: Access Request]
       |
       v
<Question: Same Tenant Boundary (ADR-0025)?>
       |
      +- Yes -------- No -> [Action: Deny - Return 403 Forbidden] -> (End)
       |
       v
<Question: Requester is Tenant Owner/Admin?>
       |
      +- Yes -> [Action: Grant Full Visibility & Action Rights] -> (End)
      +- No
       |
       v
<Question: Target Resource in Requester's Subtree (Path Prefix Match)?>
       |
      +- Yes -> <Question: Action Allowed by Role HarnessSpec (ADR-0022)?>
      |                |
      |               +- Yes -> [Action: Grant Access & Log Audit Trail] -> (End)
      |               +- No  -> [Action: Deny - Insufficient Role Scope] -> (End)
      |
      +- No -> <Question: Explicit Delegate / Cross-Unit Grant Exists?>
                       |
                      +- Yes -> [Action: Grant Scoped Access & Log Audit] -> (End)
                      +- No  -> [Action: Deny - Out of Subtree Scope]     -> (End)
```

---

## 3. Core Recurring-Loop: "Worker Duty Cycle"

The cyclic workflow of a worker operating on duty, interacting with their personal AI agent and the Unit Coordinator, structured for compilation to `.drakon.json` IR:

```
[Branch: Start Duty Cycle]
       |
[Action: Initialize Local Session & Fetch Active Tasks]
       |
       +----------------------------------------------------+
       |                                                    |
       v                                                    |
<Question: Uncompleted Tasks in Queue?>                     |
       |                                                    |
      +- Yes -> [Action: Select Next Priority Task]         |
      +- No  -> [Action: Request Dispatch from Coordinator] |
       |                                                    |
       v                                                    |
[Action: Execute Task Action / Guided Step]                 |
       |                                                    |
       v                                                    |
<Question: Materials, Tools, or Authorization Required?>    |
       |                                                    |
      +- Yes -> [Action: Transmit Resource Request to AI Coordinator]
      |                |
      |         [Action: Coordinator Evaluates Policy & Inventory]
      |                |
      |         <Question: Request Approved?>
      |                |
      |               +- Yes -> [Action: Receive Tool/Material Clearance]
      |               +- No  -> [Action: Receive Alternative / Escalation]
      |                |
      |                v
      +- No  -> (Continue)
       |
       v
<Question: New Operational Problem / Insight Discovered?>
       |
      +- Yes -> [Action: Record Local Field Observation (Voice/Text)]
      +- No  -> (Continue)
       |
       v
[Action: Submit Task Progress / Completion Report]
       |
       v
<Question: Duty Cycle / Shift Completed?>
       |
      +- No  -----------------------------------------------+ (Loop back)
      +- Yes
       |
       v
[Action: Trigger End-of-Duty Knowledge Processing Pipeline]
       |
[Action: Terminate Session & Export Status Metrics]
       |
     (End)
```

---

## 4. Knowledge-Base Authoring and Promotion Flow

To maintain simplicity for non-technical users, knowledge capture must be semi-automated and frictionless:

```
+-----------------------------------------------------------------------------+
| 1. Field Observation Capture (Worker Client)                                |
|    Worker submits unstructured input (e.g. voice memo: "Valve 4B sticks     |
|    when pressure reaches 6 bar; applied graphite lubricant to resolve").    |
+-----------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
| 2. Agent Structuring (Worker AI Agent)                                      |
|    Agent formats raw input into a lightweight Field Decision Record (FDR):  |
|    - Context / Symptom                                                      |
|    - Root Cause / Anomaly                                                   |
|    - Action Taken / Workaround                                              |
|    - Outcome / Recommendations                                              |
+-----------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
| 3. Semantic Verification & 4-Gate Policy Check (Coordinator Agent)          |
|    - Policy Gate: Verify no safety/security violations                      |
|    - Confidence Gate: Check uniqueness against existing Org Knowledge base  |
+-----------------------------------------------------------------------------+
                                      |
                         +------------+------------+
                         |                         |
              [Low-Risk / Routine]        [Process / SOP Change]
                         |                         |
                         v                         v
+-----------------------------------+  +--------------------------------------+
| 4A. Auto-Index Local Memory       |  | 4B. Human-in-the-Loop Review Queue   |
|     Immediately searchable by     |  |     Unit Lead / Supervisor receives  |
|     immediate team/brigade.       |  |     one-click approve/reject card.   |
+-----------------------------------+  +------------------+-------------------+
                                                          |
                                                    (On Approved)
                                                          |
                                                          v
                                       +--------------------------------------+
                                       | 5. Promotion to Shared Knowledge     |
                                       |    Compiled into canonical Tenant    |
                                       |    Knowledge Graph & DRAKON SOP.     |
                                       +--------------------------------------+
```

---

## 5. Vocabulary Stress-Test: Dual Worked Example

Below is a direct comparison illustrating how the identical underlying state machine and data model support both an industrial plant and a residential condominium complex without internal branching or code changes:

```
+------------------------------------+------------------------------------+
| Manufacturing Factory Scenario     | Multi-Apartment Building Scenario  |
+------------------------------------+------------------------------------+
| Tenant:                            | Tenant:                            |
| "Nordic Precision Machining Ltd."  | "Helvetia Residence Association"   |
|                                    |                                    |
| OrgUnit (L1):                      | OrgUnit (L1):                      |
| "Assembly Workshop 2"              | "Building B (Apartments 1-40)"     |
|                                    |                                    |
| TeamPod (L2):                      | TeamPod (L2):                      |
| "CNC Milling Brigade A"            | "Plumbing & Heating Maintenance"   |
|                                    |                                    |
| ParticipantRole:                   | ParticipantRole:                   |
| "Senior Machinist (Oleg)"          | "Building Superintendent (Marc)"   |
|                                    |                                    |
| DutyCycle Trigger:                 | DutyCycle Trigger:                 |
| "Morning Shift (06:00 - 14:00)"    | "On-Call Duty Window (Mon-Wed)"    |
|                                    |                                    |
| Assigned Task:                     | Assigned Task:                     |
| "Mill Batch #402 Titanium Flanges" | "Resolve Water Pressure Drop Apt 12|
|                                    |                                    |
| Tool/Resource Request:             | Tool/Resource Request:             |
| "Request 8mm Carbide End Mill"     | "Request Main Riser Valve Key"     |
|                                    |                                    |
| Recorded Field Observation:        | Recorded Field Observation:        |
| "Coolant mix ratio requires 8% for | "Pressure regulator in basement B2 |
| titanium alloys to avoid chatter"  | binds if adjusted counter-clockwise|
|                                    |                                    |
| Promoted Knowledge Record:         | Promoted Knowledge Record:         |
| Standard Operating Procedure (SOP) | Property Maintenance Notice & SOP  |
+------------------------------------+------------------------------------+
```

---

## 6. SDD, ADR, and DRAKON-IR Methodology Adaptations

### 1. From Architectural ADRs to Field Decision Records (FDRs)

* **Current State**: ADRs are markdown documents authored by software engineers covering technical system choices (status, context, decision, consequences).
* **Required Adaptation**: Introduce **Field Decision Records (FDR)** / **Operational Decision Records (ODR)**:
  * Lightweight JSON/Markdown schemas designed to be generated autonomously by AI from unstructured human speech or chat.
  * Fields: `id`, `timestamp`, `orgUnitId`, `authorRole`, `triggerSymptom`, `actionTaken`, `validationStatus`.

---

### 2. Extending DRAKON IR for Operational Workflows

* **Current State**: DRAKON IR (`0012-bidirectional-drakon-ir.md`) models programmatic control flow (functions, loops, branches, AST compilation to JS/Python).
* **Required Adaptation**: Operational workflow modeling requires first-class support for:
  * **Human Wait States / Asynchronous Suspension**: Pausing execution until physical work is completed.
  * **Resource Reservation & Tool Claims**: Claiming physical equipment or materials as part of an action node.
  * **Role-Bound Routing**: Dispatching specific branches to designated participant roles rather than executing in-process.

---

### 3. Adapting the 4-Gate Policy Engine (ADR-0020)

* **Current State**: Evaluates code generation tasks for Safety, Policy, Confidence, and Cost.
* **Required Adaptation**: Evaluate operational tasks:
  * **Safety Gate**: Verifies compliance with physical safety guidelines (e.g., verifying lockout/tagout procedures or municipal building safety rules).
  * **Policy Gate**: Verifies worker permissions and inventory authorization thresholds.
  * **Confidence Gate**: Assesses ambiguity in field logs before automatic knowledge base indexing.
  * **Cost Gate**: Enforces rate limits on third-party LLM API calls and resource procurement requests.

---

## Summary for Architectural Planning

1. **Architecture Model**: Single Tenant with Recursive Sub-Unit Trees (`OrgUnit` / `TeamPod`) maintains hard tenant isolation (ADR-0025) while simplifying hierarchical billing and access delegation.
2. **Client Strategy**: Offline-ready Progressive Web Apps (PWA) backed by Cloudflare Worker Durable Objects provide seamless mobile experiences for non-technical workers without requiring terminal environments.
3. **Knowledge Engine**: Voice/chat interactions are automatically compiled by personal AI agents into lightweight Field Decision Records (FDRs) and promoted to shared organizational memory via human-in-the-loop validation queues.
4. **Unified Primitives**: Standardizing on domain-agnostic primitives ensures full operational compatibility across industrial plants, residential complexes, and service organizations.

---

## Claude's initial read (not a verification pass — flagging for later comparison)

Not yet cross-checked against the codebase the way this session verified other research
inputs tonight (e.g. the ADR-0019 fact-check before Slice 4.4). Worth checking, when the
second (larger) research pass is compared against this one:

- **Q2's `tenant_users_private` table name** is invented, not an existing table — fine for
  a proposal, but flag it as new schema, not something already there.
- **Q2's "vector storage/MemPalace and GitNexus semantic graph"** — MemPalace and GitNexus
  are this session's OWN tooling (used to investigate/build the codebase), not existing
  application-layer infrastructure the deployed product uses for its own knowledge base.
  Reusing them as the PRODUCT's knowledge engine (not just a dev-tool) is a real, bigger
  architectural claim than this document treats it as — worth scrutinizing in the next
  pass rather than accepting at face value.
- **Option B (nested sub-groups within one tenant) matches this session's own instinct**
  in ADR-0026 (same conclusion Claude flagged as the lower-risk option relative to
  ADR-0025's hard isolation guarantee) — a real point of agreement between independent
  reasoning, worth noting when comparing against the second research pass.
- **The 4-Gate Policy Engine adaptation (§6.3)** is grounded correctly — ADR-0020's four
  gates (safety/policy/confidence/cost) are real and already implemented, this is a
  plausible reuse.
