import re

p = "specs/003-astryx-remediation/plan.md"
s = open(p, encoding="utf-8").read()

old1 = "- **T-321: Migrate `LandingPage` to Astryx (or explicitly scope it out)** — `src/pages/LandingPage.tsx` — the logged-out `/` is fully legacy/named-color; either migrate to Astryx tokens or record an explicit decision that the public marketing page stays on a separate design. Acceptance: decision documented; if migrated, no named colors remain and it themes correctly."
new1 = "- **T-321: DECISION (operator, 2026-08-19): LandingPage stays a SEPARATE marketing design, NOT migrated to Astryx.** `src/pages/LandingPage.tsx` — do not touch its token system. Acceptance: no Astryx-migration edits to LandingPage.tsx in this plan; confirmed out of scope."
assert old1 in s, "T-321 not found"
s = s.replace(old1, new1)

old2 = "- **T-324: Retire or gate the `astryx_shell` flag** — `WorkspaceShell.tsx:85-93, 167` — with Astryx now the target, decide whether to remove the legacy header/sidebar branches (`:397-634`, `:707-717`) entirely or keep behind the flag for rollback. If removing, delete dead legacy nav config paths. Acceptance: decision recorded; if removed, `grep astryx_shell` shows only intentional references; bundle no longer ships both header implementations."
new2 = "- **T-324: DECISION (operator, 2026-08-19): RETIRE the `astryx_shell` flag COMPLETELY.** `WorkspaceShell.tsx:85-93, 167` — remove `isAstryxShellEnabled()`, the flag, and ALL legacy header/sidebar branches (`:397-634`, `:707-717`) — Astryx becomes the only shell, unconditionally. Delete dead legacy nav config if now orphaned (verify via GitNexus impact() before deleting). Acceptance: `grep -rn astryx_shell src/` returns nothing; `grep -rn astryxShellEnabled src/` returns nothing; single unconditional Astryx shell renders; vitest+build green."
assert old2 in s, "T-324 not found"
s = s.replace(old2, new2)

open(p, "w", encoding="utf-8").write(s)
print("OK")
