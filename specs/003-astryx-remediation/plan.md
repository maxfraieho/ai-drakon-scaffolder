# Plan 003 — Astryx Remediation (operational)

Status: DRAFT for Codex execution
Author: architect revision (post plan 002 / T-201..T-239)
Baseline commit: `78ad6efb`
Verification method: GitNexus MCP + live deployed HTML fetched from https://aidrakon.tech/ (`/` and `/diagrams`) + deployed `assets/astryx-*.css`.

This is an execution plan, not a Given-When-Then spec. Each task is `T-3XX: <action> — <file(s):lines> — <acceptance criteria>`. Execute in numeric order unless a task states otherwise.

---

## 0. КОРЕНЕВА ПРИЧИНА (root cause of "commit says done" vs "operator sees not done")

**The deploy is NOT the problem. The migration is partial by design.**

### 0.1 Deploy is current and healthy (disproves the deploy/sync/flag hypotheses)
- Local `HEAD` == `origin/main` == `78ad6efb`. HEAD is pushed (`git branch -r --contains HEAD` → `origin/main`).
- Live `/` and `/diagrams` return HTTP 200. Deployed HTML `<html>` tag = `<html lang="en" class="dark" data-astryx-theme="dark">` — matches `src/routes/__root.tsx:116` exactly → the deployed bundle IS built from current source.
- Deployed `assets/astryx-lF2A59GR.css` (5867 bytes) contains real tokens: `--astryx-color-brand` (19×), `--astryx-surface-page` (5×), `[data-astryx-theme="dark"]` block. → astryx.css IS built, injected (`__root.tsx:104`), and served.
- `.lovable/src` is in sync with `src/` (`diff -rq` → only `routes/api.knowledge-graph.ts` differs, a backend route, not UI). rsync gate held.
- `isAstryxShellEnabled()` (`WorkspaceShell.tsx:86-93`) returns `true` in prod: no `VITE_ASTRYX_SHELL` in any `.env`/`.env.example`; live `/diagrams` prerender renders `<header class="astryx-app-shell-header">` → the flag IS on in production.

**Conclusion: Cloudflare deployed the right commit, astryx_shell is enabled, astryx.css loads. None of the "why isn't it live" hypotheses hold.**

### 0.2 The actual root cause: migration touched 2 components, left the shell frame legacy
Plan 002 migrated exactly two components to Astryx tokens — `AstryxHeader.tsx` and `AstryxSideNav.tsx` — and mounted them behind `astryxShellEnabled`. Everything that WRAPS them still uses the legacy token system. Proof from live `/diagrams` DOM and source:

| Region | File:line | Token system in deployed DOM |
|--------|-----------|------------------------------|
| Shell root container | `WorkspaceShell.tsx:389` | legacy: `bg-[var(--bg-base)] text-[var(--text-primary)]` |
| Top header (when astryx on) | `WorkspaceShell.tsx:392` → `AstryxHeader.tsx:25` | astryx: `astryx-app-shell-header` |
| Left IconRail | `WorkspaceShell.tsx:650` | legacy: `bg-[var(--bg-surface)] border-[var(--border-subtle)]` |
| Sidebar `<aside>` chrome | `WorkspaceShell.tsx:698-700` | legacy: `bg-[var(--bg-surface)]` wrapping astryx `AstryxSideNav` content |
| DevCyclePanel / AgentStatusBar footer | `WorkspaceShell.tsx:719-720` | legacy: `bg-[var(--bg-surface)]`, `bg-[var(--bg-elevated)]` |
| Nav collapse strip | `WorkspaceShell.tsx:732` | legacy: `bg-[var(--bg-elevated)]` |
| Public landing (`/` logged-out) | `src/pages/LandingPage.tsx` | legacy + raw named colors, never migrated |
| All page bodies | `src/pages/*` | 10 pages still use raw named Tailwind colors (see 0.3) |

**Quantitative proof of partial migration:** across `src/`, astryx token references = **245**, legacy token references = **776**. ~76% of the UI is still legacy-tokened. The header+sidenav are an Astryx island inside a legacy shell → visually "no unified style" and "Astryx practically not applied," exactly as the operator reported.

### 0.3 Why the theme toggle "works incorrectly"
Three synchronization attributes, two token systems, plus theme-blind components:
- `theme-provider.tsx:21-23` sets **three** things on `<html>`: `data-theme` (legacy light key), `data-astryx-theme` (astryx key), and `.dark` class.
- Legacy tokens switch on `[data-theme="light"]` (`styles.css:198`) vs the `:root, .dark` default (`styles.css:117`).
- Astryx tokens switch on `[data-astryx-theme]` (`astryx.css:64` light / `astryx.css:94` dark).
- The static SSR shell (`__root.tsx:116`) hardcodes `class="dark" data-astryx-theme="dark"` but **omits `data-theme`**, and there is no pre-hydration inline script → first paint is always dark; light only applies after React hydration mutates the DOM.
- 10 page components use raw named Tailwind colors (`bg-slate-*`, `bg-gray-*`, `text-white`, etc.) that respond to **none** of the three attributes: `CodegenPage, KnowledgePage, GardenPage, NotebookLMPage, LandingPage, SettingsPage, LoginPage, GalleryPage, PipelineEditorPage, ProjectsPage`. Toggling theme flips the shell tokens but leaves these panels fixed → half-light/half-dark → "toggle broken."

### 0.4 Where the "unnecessary Astryx button" comes from
`src/components/astryx/AstryxHeader.tsx:34`: `<span className="astryx-badge primary">Astryx Framework</span>` — a hardcoded decorative badge in the header brand row. Confirmed in live `/diagrams` DOM. Not a button, but reads as a stray UI chip. Remove.

### 0.5 Navigation accessibility gap
When `astryxShellEnabled` is true, the mobile hamburger `Sheet` nav (`WorkspaceShell.tsx:399-431`) is rendered **only in the legacy header branch** (`:` side of the ternary at line 397). The Astryx branch (`AstryxHeader`) has top-nav `hidden md:flex` (`AstryxHeader.tsx:38`), IconRail `hidden lg:flex` (`:650`), sidebar `hidden lg:flex` (`:698`). Result: on viewports `< md` the Astryx shell exposes **no navigation at all** (no hamburger, no sidebar, no bottom bar), despite `main` reserving `pb-16` for a bottom bar that is never rendered (`:738`).

---

## 1. Astryx not actually applied (unify the shell frame onto Astryx tokens)

Goal: shell chrome (root, IconRail, aside, footers, collapse strip) uses Astryx tokens so header+sidenav no longer float on a legacy frame.

- **T-301: Migrate shell root container to Astryx surface** — `WorkspaceShell.tsx:389` — replace `bg-[var(--bg-base)] text-[var(--text-primary)]` with `bg-[var(--astryx-surface-page)] text-[var(--astryx-text-primary)]`. Acceptance: live `/diagrams` root `<div>` class references `--astryx-surface-page`; no `--bg-base` on the root div; page background matches AstryxHeader background in both themes.
- **T-302: Migrate left IconRail to Astryx tokens (astryx branch only)** — `WorkspaceShell.tsx:650-696` — swap `bg-[var(--bg-surface)]`, `border-[var(--border-subtle)]`, `text-[var(--text-secondary/muted)]`, `bg-[var(--accent-dim)] text-[var(--accent-amber)]`, `hover:bg-white/5` to Astryx equivalents (`--astryx-surface-elevated`, `--astryx-border-subtle`, `--astryx-text-secondary/muted`, `--astryx-color-brand-light`/`--astryx-color-brand`). Acceptance: no legacy `--bg-*`/`--accent-*`/`--border-subtle` tokens remain in IconRail JSX when `astryxShellEnabled`; active rail item uses `--astryx-color-brand`.
- **T-303: Migrate sidebar `<aside>` chrome to Astryx** — `WorkspaceShell.tsx:698-721` — replace `border-[var(--border-subtle)] bg-[var(--bg-surface)]` on the aside and inner dividers with `--astryx-border-subtle` / `--astryx-surface-elevated`. Acceptance: aside background equals `AstryxSideNav` background; no legacy token in the aside element.
- **T-304: Migrate collapse strip + evidence toggle** — `WorkspaceShell.tsx:723-735` and the evidence strip near `:743-749` — swap `bg-[var(--bg-elevated)]`, `hover:bg-[var(--accent-dim)]`, `text-[var(--accent-amber)]` to Astryx tokens. Acceptance: no legacy tokens in these two buttons.
- **T-305: Migrate DevCyclePanel + AgentStatusBar to Astryx tokens** — find via `grep -rn "var(--bg-\|var(--accent-\|var(--border-subtle)" src/components` in `DevCyclePanel` and `AgentStatusBar` components (imported at `WorkspaceShell.tsx:719-720`) — Acceptance: both footer components render with Astryx surface/border/text tokens; live `/diagrams` footer no longer shows `bg-[var(--bg-surface)]`/`bg-[var(--bg-elevated)]`.
- **T-306: Define missing Astryx shell tokens if absent** — `src/styles/astryx.css` — before T-301..T-305, verify `--astryx-surface-page`, `--astryx-surface-elevated`, `--astryx-border-subtle`, `--astryx-text-secondary`, `--astryx-text-muted`, `--astryx-color-brand-light` exist in BOTH the `[data-astryx-theme="astryx"]` (line 64) and `[data-astryx-theme="dark"]` (line 94) blocks. Add any missing token to both blocks with light+dark values. Acceptance: `grep` shows each token defined in both blocks; `npm run build` clean; token lint (`scripts/check-astryx-tokens.sh`) passes.

---

## 2. Remove the unnecessary "Astryx" badge

- **T-307: Delete the "Astryx Framework" badge** — `src/components/astryx/AstryxHeader.tsx:34` — remove `<span className="astryx-badge primary">Astryx Framework</span>` (and the now-empty wrapping flex gap if it collapses). Acceptance: live `/diagrams` header no longer contains the string `Astryx Framework`; brand row shows only logo + "AI-DRAKON Studio"; vitest + build green.

---

## 3. Unify visual style across migrated vs non-migrated pages

Goal: eliminate the two-token-system split; page bodies stop using raw named colors.

- **T-308: Migrate the 10 named-color pages to Astryx tokens** — `src/pages/{CodegenPage,KnowledgePage,GardenPage,NotebookLMPage,SettingsPage,GalleryPage,PipelineEditorPage,ProjectsPage}.tsx` (LandingPage handled in T-311, LoginPage handled in T-312) — replace raw `bg-slate-*`, `bg-gray-*`, `bg-zinc-*`, `bg-neutral-*`, `text-white`, `text-gray-*`, `text-slate-*` with Astryx surface/text tokens. Acceptance: `grep -rlnE "bg-(slate|gray|zinc|neutral)-|text-white\b|text-(slate|gray)-" src/pages/{those 8}` returns empty; each page background/text visibly follows theme toggle.
- **T-309: Add a named-color lint gate** — extend `scripts/check-astryx-tokens.sh` (or add `scripts/check-named-colors.sh`) to fail on raw named Tailwind colors under `src/pages` and `src/components/{astryx,workspace}` — Acceptance: script exits non-zero on a seeded `bg-slate-800`; wired into the same CI step as the hex lint; documented in `specs/003-astryx-remediation/plan.md` follow-up.
- **T-310: Cross-page visual parity check** — after T-308, compare `/diagrams` (migrated) and `/settings`, `/codegen`, `/notebooks` — Acceptance: shared surface background token identical across pages (`--astryx-surface-page`); no page renders a hard `#0f1419`/`#ffffff` panel that ignores theme.

---

## 4. Fix theme toggling

- **T-311: Add a pre-hydration theme script + emit `data-theme` in the SSR shell** — `src/routes/__root.tsx:116-118` — (a) add `data-theme="dark"` alongside the existing `class="dark" data-astryx-theme="dark"` so all three legacy/astryx keys ship consistently; (b) inject an inline `<script>` in `<head>` (before `<HeadContent/>`) that reads the persisted theme from the same storage `theme-provider` uses (`readSettings().app.theme`, storage key per `src/lib/settings-storage.ts`) and sets `class`, `data-theme`, `data-astryx-theme` on `document.documentElement` before first paint. Acceptance: hard-reload while theme=light shows no dark flash; `<html>` in a light session has `data-theme="light" data-astryx-theme="astryx"` and no `dark` class; no React hydration attribute warning in console.
- **T-312: Verify theme-provider writes all three attributes atomically** — `src/components/theme-provider.tsx:16-24` — confirm `applyThemeToDOM` is the single source setting `data-theme`, `data-astryx-theme`, `.dark`; ensure `system` resolves and re-applies on `prefers-color-scheme` change (add a `matchMedia` change listener if missing). Acceptance: toggling dark↔light↔system flips ALL of shell, header, sidenav, and every T-308 page in one paint; OS theme change updates a `system`-mode session live.
- **T-313: Decouple astryx dark selector from the legacy `.dark` class** — `src/styles/astryx.css:94` — the astryx dark block keys on `[data-astryx-theme="dark"], .dark`; keep `.dark` only as a transitional alias, and confirm astryx tokens no longer depend on the legacy class once T-311/T-312 land. Acceptance: removing the `.dark` alias (in a scratch test) still themes astryx correctly via `data-astryx-theme`; documented, alias removal deferred to a follow-up task if risky.
- **T-314: Regression — the 10 pages theme correctly** — depends on T-308, T-311, T-312 — Acceptance: manual toggle on each of the 10 pages shows full light/dark switch with no fixed-color panels.

---

## 5. Navigation accessibility

- **T-315: Restore mobile navigation in the Astryx shell** — `WorkspaceShell.tsx:391-397` and `AstryxHeader.tsx:38` — render a mobile nav for `astryxShellEnabled` (either: hoist the hamburger `Sheet` from the legacy branch `:399-431` so it renders in BOTH branches, or add an Astryx-styled `Sheet`/bottom tab bar). The `main` already reserves `pb-16 lg:pb-0` (`:738`) — either fill it with a bottom tab bar or remove the dead padding. Acceptance: on a `< md` viewport, `/diagrams` exposes a working nav control reaching all `ASTRYX_NAV_ITEMS`; no route is unreachable on mobile.
- **T-316: Add `aria-label` to Astryx navs** — `AstryxSideNav.tsx:15` (`<nav>` has no label) and `AstryxHeader.tsx:38` (`<nav>` has no label) — add `aria-label` (e.g. "Основна навігація" / "Верхня навігація"). Acceptance: axe/lighthouse reports no "navigation landmark without label"; each `<nav>` is distinguishable.
- **T-317: Make disabled IconRail items non-focusable and announced** — `WorkspaceShell.tsx:656-671` — disabled rail entries are `<div>` with `cursor-not-allowed`; add `aria-disabled="true"` and ensure they are not in tab order, keep the tooltip reason. Acceptance: keyboard tab skips disabled rail items; screen reader announces disabled state.
- **T-318: Keyboard + focus-visible pass on Astryx nav/header** — `AstryxHeader.tsx`, `AstryxSideNav.tsx` — verify all `astryx-button`/`astryx-top-nav-item` have visible focus rings via Astryx focus token; add `:focus-visible` styles in `astryx.css` if missing. Acceptance: every header/sidenav control is reachable and visibly focusable by keyboard.
- **T-319: `data-testid` / semantic attributes on new/edited components** — per CLAUDE.md Astryx guideline — add `data-variant`, `data-size`, `data-testid` to Astryx buttons/nav items edited in this plan. Acceptance: new components expose the three agent-readiness attributes.

---

## 6. Logic problems (not only UI)

- **T-320: Fix landing/hydration flash on `/`** — `src/routes/index.tsx:14-31` and `__root.tsx:146-151` — two independent `hydrated` gates (`index.tsx` and `__root.tsx`) plus `isPublicLanding` recompute cause a `PageSkeleton` → `LandingPage`/`ProjectsPage` flip and a chrome/no-chrome swap on every load. Consolidate the auth/hydration decision into one source (route loader or a shared hook) so chrome visibility and landing choice resolve once. Acceptance: logged-in reload of `/` shows no skeleton→landing→projects flicker; `hideChrome` and the index component agree on first committed render.
- **T-321: Migrate `LandingPage` to Astryx (or explicitly scope it out)** — `src/pages/LandingPage.tsx` — the logged-out `/` is fully legacy/named-color; either migrate to Astryx tokens or record an explicit decision that the public marketing page stays on a separate design. Acceptance: decision documented; if migrated, no named colors remain and it themes correctly.
- **T-322: Migrate `LoginPage`** — `src/pages/LoginPage.tsx` — rendered under the `astryx-migrated` chrome-less wrapper (`__root.tsx:160`) but body uses named colors. Acceptance: login page uses Astryx tokens; themes correctly.
- **T-323: Audit remaining logic defects via GitNexus** — run `query({search_query:"authentication guard route redirect"})` and `impact({target:"isAstryxShellEnabled", direction:"upstream"})` before edits; enumerate any additional logic issues (e.g. `astryx_shell` localStorage override still lets a user disable the shell and land on the un-migrated legacy header — decide whether to retire the flag now that Astryx is default). Acceptance: written list of confirmed logic defects appended here with file:line; flag-retirement decision recorded.
- **T-324: Retire or gate the `astryx_shell` flag** — `WorkspaceShell.tsx:85-93, 167` — with Astryx now the target, decide whether to remove the legacy header/sidebar branches (`:397-634`, `:707-717`) entirely or keep behind the flag for rollback. If removing, delete dead legacy nav config paths. Acceptance: decision recorded; if removed, `grep astryx_shell` shows only intentional references; bundle no longer ships both header implementations.

---

## Execution guardrails (per CLAUDE.md)
- Run `impact({target, direction:"upstream"})` before editing `WorkspaceShell`, `AstryxHeader`, `AstryxSideNav`, `theme-provider`, `__root`; report blast radius; WorkspaceShell is a hub — expect HIGH.
- Run `detect_changes({scope:"compare", base_ref:"main"})` before each commit; confirm only intended symbols/flows changed.
- After any `src/` edit, `rsync -av --delete src/ .lovable/src/` before build/commit (Cloudflare builds from `.lovable`).
- Gates per task: `scripts/check-astryx-tokens.sh` (0 violations), named-color lint (T-309), `cd .lovable && npx vitest run` green, `npm run build` clean.
- Suggested order: T-306 → T-301..T-305 (shell frame) → T-307 (badge) → T-311..T-314 (theme) → T-308..T-310 (pages) → T-315..T-319 (a11y) → T-320..T-324 (logic). Theme fix (T-311/T-312) is the highest-leverage single change for the operator's most visible complaint.
