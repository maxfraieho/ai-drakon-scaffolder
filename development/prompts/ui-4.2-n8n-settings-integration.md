[LOVABLE PROMPT — UI-4.2]

Implement the N8N Integration section in the existing SettingsPage.tsx.
The section already exists as a placeholder — fill it with real functionality.

N8N SETTINGS SECTION CONTENT:

Status indicator at top:
- N8NConnectionStatus component:
  - 'unconfigured' → gray dot "Not configured"
  - 'connected'    → green dot "Connected to {n8nUrl}"
  - 'error'        → red dot "Connection failed"

Form fields (use react-hook-form):
  N8N Instance URL: text input, placeholder "https://your-n8n.instance.com"
    validation: must be valid URL starting with https://
  API Key: password input (toggle show/hide)
    info text: "Found in N8N → Settings → API → Create API Key"
  Webhook Base URL: text input (optional, auto-fills from Instance URL if empty)

[Test Connection] button:
  - Shows spinner when clicked
  - GET {n8nUrl}/api/v1/workflows with header X-N8N-API-KEY: {apiKey}
  - On 200: show "✓ Connected. Found {count} workflows." (green toast)
  - On 401: show "✗ Invalid API key" (red toast)
  - On network error: show "✗ Cannot reach N8N instance" (red toast)

[Save Settings] button:
  - Saves to Appwrite project settings or localStorage (project-specific)
  - Updates N8NConnectionStatus immediately

INTERACTION LOGIC:
<interaction_logic>
Step 1: Load saved N8N config from project settings on mount
? Config exists?
  YES: Pre-fill form fields, run background connection test
  NO: Show empty form
? User clicks Test Connection?
  YES: Validate URL and key fields locally first
       ? Local validation passes?
          YES: Show loading spinner, GET {n8nUrl}/api/v1/workflows
               ? HTTP 200?
                  YES: Set status to 'connected', show workflow count
                  NO: Set status to 'error', show specific error message
          NO: Show inline field validation errors
? User clicks Save Settings?
  YES: Zod validate all fields
       Save to project-scoped storage
       Show success toast "N8N settings saved"
</interaction_logic>

FILES TO MODIFY:
- src/pages/SettingsPage.tsx (fill existing N8N section placeholder)

FILES TO CREATE:
- src/components/n8n/N8NConnectionStatus.tsx
