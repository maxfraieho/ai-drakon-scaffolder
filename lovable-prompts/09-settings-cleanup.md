# Lovable Prompt 9 — Settings Page Cleanup

**Priority: LOW — cosmetic polish only**

## Problem 1 — "Очистити локальний кеш" button too prominent

In `SettingsPage.tsx` (or the "Додаток" tab component), the clear-cache button is rendered as a **full-width red destructive button**. On mobile this is a mis-tap risk and visually dominates the entire settings card.

### Fix — make it a contained inline danger button

Replace:

```tsx
{/* Current: full-width red button */}
<Button variant="destructive" className="w-full ...">
  <TrashIcon ... />
  Очистити локальний кеш діаграм
</Button>
```

With a smaller, left-aligned danger button:

```tsx
<button
  type="button"
  onClick={handleClearCache}
  className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)]
             text-sm text-red-500 hover:text-red-400
             hover:bg-red-500/10 transition-colors duration-150
             active:scale-[0.96]
             focus-visible:ring-2 focus-visible:ring-red-400/50"
  style={{ touchAction: 'manipulation' }}
>
  <TrashIcon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
  Очистити кеш
</button>
```

Key changes:
- `inline-flex` instead of `w-full` — button is as wide as its content
- Text color is red, background is transparent by default (only red bg on hover)
- No solid red fill — danger is communicated by color without visual weight

## Problem 2 — Settings page large empty area below the form

In all three Settings tabs (GitHub, n8n, Додаток), there is a large black/white empty area below the form card. The page doesn't fill the viewport — it just stops after the form content.

### Fix — make the settings page fill the viewport

Find the outer page container in the Settings component. It likely wraps the tabs and the form. Add `min-h-[100dvh]` or use the Precision Dark background variable so the dark background extends to the bottom:

```tsx
{/* Settings page outer wrapper */}
<div className="min-h-[100dvh] bg-[var(--bg-base)] flex flex-col">
  {/* header with ← Діаграми + title */}
  <div className="flex-shrink-0 ...">...</div>

  {/* tab bar */}
  <div className="flex-shrink-0 ...">...</div>

  {/* form content */}
  <div className="flex-1 p-4 md:p-6">
    {/* existing form — unchanged */}
  </div>
</div>
```

This ensures the background extends to the bottom of the screen instead of stopping at the content boundary.

## DO NOT change

- Settings form fields or their validation
- GitHub token storage logic
- n8n webhook logic  
- The actual cache-clearing functionality
- Worker URL storage
