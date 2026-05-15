Design two non-modal panels for AI-DRAKON — a DRAKON visual programming IDE used by software architects. Dense, utilitarian, zero decoration. Expert users only.

---

DESIGN SYSTEM (strict — do not deviate):
Background base: #0a0b0e
Background surface: #111318
Background elevated (inputs): #191c23
Border subtle: rgba(255,255,255,0.08)
Border default: rgba(255,255,255,0.12)
Text primary: rgba(255,255,255,0.92)
Text secondary: rgba(255,255,255,0.55)
Text muted: rgba(255,255,255,0.28)
Accent (amber): #f59e0b — ONLY for primary CTAs and active state
Error: #ef4444
Success: #22c55e
Code text: rgba(180,220,160,0.90)
Font UI: IBM Plex Sans, 12–13px
Font code/labels: JetBrains Mono, 11–12px
Border radius: 4px on buttons/inputs, 0px on panel containers
No gradients. No shadows. No glow. No illustrations.

---

PANEL 1: Code Analysis — "Аналіз коду"
Position: right-side column, width 380px, full viewport height
Appears when user clicks "Аналізувати код" in toolbar

Frame 1.1 — IDLE
- Header bar (height 40px): monospaced label "АНАЛІЗ КОДУ" uppercase left, small "Код → IR" muted right, ✕ ghost button far right
- Divider (1px, border subtle)
- Code textarea: bg #191c23, border rgba(255,255,255,0.08), monospace 11px, min 8 lines, placeholder "# Вставте Python-код"
- Below textarea: file path input (small, 1 line, placeholder "module.py"), language label "python" (static, muted, uppercase)
- CTA: "Аналізувати" full-width button, bg #f59e0b, text black, height 36px, JetBrains Mono

Frame 1.2 — RUNNING
- Same layout, textarea + inputs opacity 0.4, non-interactive
- Button replaced with: spinner (amber, 16px) + "Аналізується… 12s" monospaced muted
- Below: slim status line (1 row, bg #191c23, border-left 2px amber): "CC: 7 · рівень: primitive" — appears after 2s

Frame 1.3 — DONE
- Input section collapses to 2 visible lines of code + "↕ розгорнути" text link
- Result section below:
  - Section label: "РЕЗУЛЬТАТ" uppercase monospaced muted 10px
  - List of function rows. Each row (height 32px, border-bottom subtle):
    · Left: function name in JetBrains Mono 12px
    · Middle: "CC: 4" muted small
    · Right: status chip — "✓ valid" in #22c55e or "2 помилки" in #ef4444
    · Far right: "↓ Імпортувати" ghost button (appears on hover only)
  - If errors: below affected row, indented red text 11px monospaced
- Footer: "Новий аналіз" ghost button full-width, border-top subtle

Frame 1.4 — ERROR
- Textarea stays visible
- Error card below button: border-left 3px #ef4444, bg #191c23, message text red 12px, "Повторити" ghost button right

---

PANEL 2: Code Generation — "Генерувати код"
Position: bottom drawer, full width of diagram editor, height 280px
Appears when user clicks "Генерувати код" in toolbar

Frame 2.1 — IDLE
- Header row (height 40px): label "ГЕНЕРУВАТИ КОД" monospaced uppercase left, ✕ ghost button right
- Language selector row: 3 segments ["Python" | "TypeScript" | "JavaScript"] — inline buttons, active = bg #f59e0b text black, inactive = ghost with muted text, height 28px, border 1px rgba(255,255,255,0.10)
- Description input: 1 row, bg #191c23, placeholder "Опис поведінки (необов'язково)"
- Bottom row: muted hint "10–30 секунд" left, "Генерувати" amber button right (height 34px, JetBrains Mono)

Frame 2.2 — RUNNING
- Inputs dimmed opacity 0.4
- Button area: spinner + "Генерується… 8s" text + amber chip "ітерація 1/3" (badge, bg rgba(245,158,11,0.12), border amber 1px, text amber, 10px monospaced)

Frame 2.3 — DONE
- Code block fills most of panel height: bg #0a0b0e, border 1px rgba(255,255,255,0.08), border-radius 4px, overflow-y scroll, max-height 180px
- Code text: JetBrains Mono 11px, color rgba(180,220,160,0.90)
- Top-right of code block: "⎘ Копіювати" ghost button (11px monospaced, stays visible)
- Below code: left = syntax chip ("syntax: ✓" green or "syntax: 2 помилок" red), right = "Перегенерувати" ghost small + "Закрити" text link

---

CONSTRAINTS:
- No modals. No popovers. No tooltips on main actions.
- No empty-state illustrations.
- No rounded corners > 4px on panels themselves.
- Both panels must coexist with a diagram canvas without covering it.
- Mobile: panels become full-height bottom sheets (85dvh). Out of scope for this design.
