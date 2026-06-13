# DRAKON Suite — Product Strategy 2026

> Verified against codebase via GitNexus 2026-06-13.

---

## Two Services, One Ecosystem

### Garden Bloom — Knowledge Platform
**URL:** bloom.aidrakon.tech  
**Auth:** Single-owner password (OwnerAuthProvider + KV hash). No multi-user — intentional.  
**Core loop:** Notes → Tags → Graph → Access Zones → Archivist AI chat

What it does today (verified):
- Note editor (EditorPage) + knowledge graph (buildGraphFromNotes/buildStemMap)
- Access Zones with time-limited tokens (useZoneValidation, checkExpiration, revokeZone)
- Guest access via zone URL/QR — no auth required for guests (chatNotebookLMGuest)
- Archivist AI = NotebookLM proxy per zone (handleZoneNotebookLMChat)
- Chat history per zone (getZoneChats, handleZoneChats)
- DRAKON diagram editor (DrakonPage, EditorPage)
- Runtime overview (RuntimeOverview, BloomRuntimeHeader)
- Admin settings + owner password change (AdminSettingsPage, OwnerSettingsDialog)
- i18n: EN/UK/FR/DE/IT

**Target user:** Knowledge worker, researcher, consultant, solo dev, teacher.  
**Standalone value:** PKM + AI Q&A + shareable knowledge portals. No AI coding needed.

---

### AI-DRAKON — Agent Builder
**URL:** aidrakon.tech  
**Auth:** Multi-user Appwrite (fra.cloud.appwrite.io, PROJECT_ID: 6a23420a003a04b4997b)  
**Plan system:** `resolvePlan` (auth.ts) + `quotaMiddleware` (quota.ts)  
**Core loop:** GitHub repo → Agent → Pipeline → Deploy → MCP endpoint

What it does today (verified):
- Workspace with sidebar nav (WorkspaceShell)
- GitHub integration (GitHubAPI, githubHeaders)
- Agent creation and management (listAgents, getProjectPipeline, saveProjectPipeline)
- Pipeline editor with SSE execution (ExecutePipelineSSE, ExecuteProjectPipelineSSE)
- MCP server (handleMcp) — expose agents as MCP tools
- Knowledge zones (listKnowledgeZones, deleteKnowledgeZone) — gateway to Bloom
- Knowledge base CRUD (listKB, searchPatterns) — kb-crud.ts
- Architect agent: Python (architect-agent) + CF Worker (architect-agent-flue)
- Docs agent with DQL queries (dataview_route.py)
- Audit log (AuditLogEntry in Appwrite schema)
- Notes commit handler (HandleNotesCommit)

**Target user:** AI developer, SaaS builder, technical team.  
**Standalone value:** Build and deploy AI agents from GitHub + external data sources.

---

## Integration Bridge (Suite)

How the two services connect:
1. Bloom creates an Access Zone → generates zone token (ZoneSecret)
2. DRAKON stores ZoneSecret in Appwrite schema
3. DRAKON agent calls `GATEWAY_URL=https://garden-mcp.aidrakon.tech` with zone token
4. Archivist AI answers queries from the zone's notes

**The Suite user flow:**
```
Bloom: Create notes → Organize in zone → Enable Archivist
                                     ↓
DRAKON: Connect zone → Build agent → Pipeline uses zone as knowledge source
                                     ↓
         Deploy: MCP endpoint that answers from curated Bloom knowledge
```

---

## UX Design — Standalone vs. Integrated

### Standalone Bloom UX
- Enter at bloom.aidrakon.tech → owner login or guest zone URL
- Full PKM: write notes, tag, build graph, navigate with cycles
- Create zones → share QR → guests chat with Archivist
- No knowledge of DRAKON required
- DRAKON diagrams work as embedded flow editors (DrakonPage)

**Friction points to fix (Q3):**
- Zone dashboard needs overview page (currently per-zone navigation only)
- Zone analytics missing (chat count, popular notes, last access)
- "Connect to DRAKON" CTA missing from zone settings

### Standalone DRAKON UX
- Enter at aidrakon.tech → Appwrite login
- Connect GitHub repo → describe agent → run pipeline
- MCP endpoint auto-generated per agent
- Knowledge zones optional (can skip Bloom entirely)
- Quota enforced per plan tier

**Friction points to fix (Q3):**
- Zone connection UX (ZoneCreationDialog) is complex — needs guided setup
- No pipeline templates for first-time users
- Billing not wired (resolvePlan + quotaMiddleware exist but no Stripe integration)

### Integrated Suite UX
- SSO vision: DRAKON JWT carries Bloom owner token → auto-login to Bloom from DRAKON
- "Open in Bloom" button in /knowledge page → authenticated Bloom session
- "Build Agent from Zone" button in Bloom zone settings → opens DRAKON with zone pre-wired
- Zone health indicator in DRAKON (Archivist ready/pending/failed badge)

**What needs to be built for Suite UX:**
1. DRAKON → Bloom deep link with token passthrough
2. Bloom → DRAKON "Create Agent" button
3. Zone health polling in DRAKON /knowledge page
4. Shared session cookie or token exchange endpoint

---

## Pricing Strategy

### Recommended Tiers

| Tier | Price | What's Included | Target |
|------|-------|-----------------|--------|
| **Free** | $0 | Bloom: 3 zones, 100 notes, no Archivist AI. DRAKON: 1 agent, 10 pipeline runs/mo | Try before buy |
| **Bloom** | $9/mo | All Bloom: unlimited zones, unlimited notes, Archivist AI, DRAKON diagrams, zone sharing | Knowledge workers |
| **Builder** | $19/mo | All DRAKON: unlimited agents, GitHub, pipelines, 5 zone connections, MCP endpoints | AI developers |
| **Suite** | $29/mo | Bloom + Builder + unlimited zone connections + SSO + priority support | Teams building AI products |

### Pricing Rationale
- Free → Bloom funnel: users discover value in PKM, convert to $9. Clear.
- Free → DRAKON: 1 agent is useful enough to demo, not enough to build on. Converts to $19.
- Suite at $29 (was $24): Bloom=$9 + DRAKON=$19 = $28 standalone. Suite at $29 = barely better math but adds SSO + unlimited zones — sells on the integration story, not just price.
- "Best Value" badge stays on Suite — it's true for teams.

### What NOT to do:
- Don't make Suite $24 — it signals Bloom is worth only $5, which undervalues the knowledge platform.
- Don't require Suite for basic zone connections — that blocks trial. Allow 1-2 connections on Builder.

---

## Roadmap Q3-Q4 2026

### Garden Bloom
- [ ] Zone dashboard page (all zones overview, stats, last Archivist activity)
- [ ] Zone analytics (chat count, popular notes, guest sessions)
- [ ] Zone templates (Research, Product Spec, Meeting Notes)
- [ ] "Create Agent from Zone" deep link to DRAKON
- [ ] Public zone pages (SEO-friendly, no auth needed, Archivist limited)
- [ ] Zone expiry notifications (email when zone expires)

### AI-DRAKON
- [ ] Pipeline templates (Starter Agent, GitHub Code Q&A, Knowledge Agent)
- [ ] Zone connection guided setup (replace ZoneCreationDialog with wizard)
- [ ] Zone health indicator in /knowledge (Archivist ready/failed/none)
- [ ] Billing integration (Stripe → resolvePlan → quota enforcement)
- [ ] Usage dashboard (API calls, pipeline runs, zone queries per agent)
- [ ] DRAKON → Bloom SSO link (token passthrough)

### Cross-Service
- [ ] Shared token exchange endpoint (Bloom owner token ↔ DRAKON ZoneSecret)
- [ ] "Open in Bloom" from DRAKON /knowledge
- [ ] Unified billing portal (one subscription → both services)
- [ ] Suite onboarding flow (connect Bloom account to DRAKON workspace)

---

## Tech Constraints

- Bloom is single-owner by design (OwnerAuthProvider) — NOT changing this. Multi-user via zones (guests).
- DRAKON is multi-user (Appwrite) — plan enforcement via `resolvePlan` + `quotaMiddleware` already in place, needs Stripe webhook.
- Both on Cloudflare Pages + Workers — no server infra to manage.
- Bloom worker handles auth + zone token validation inline.
- NotebookLM = internal implementation detail. NEVER surface in UI. Archivist is the brand.
