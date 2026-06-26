[LOVABLE PROMPT — UI-4.1]

Create the N8N Automations page at /p/{slug}/automations.

Two views: LIST and EDITOR.

LIST VIEW (default):
- Table of saved automations: name, node count, N8N status (pushed/local), date
- [+ New Automation] button → switches to Editor view (blank)
- Click row → switches to Editor view (loads existing)

EDITOR VIEW — two panels:
- Left (65%): DrakonEditor canvas (use existing drakonwidget.js integration)
- Right (35%): N8NNodeSidebar (shown when :: n8n :: node is selected)

N8NNodeSidebar content:
- Shows when activeNodeId has content starting with ':: n8n ::'
- Dropdown: N8N Node Type (Webhook / HTTP Request / Telegram / Code / IF Condition)
- Dynamic fields based on selected type:
  Webhook: path (text), method (GET/POST select)
  HTTP Request: url (text), method select, body (textarea)
  Telegram: chatId (text), text (textarea)
  Code: jsCode (large textarea with monospace font)
- Credential field: text input "Credential name in N8N instance"

TOOLBAR (above canvas):
- [Export JSON] button
- [Push to N8N] button (disabled if N8N URL not configured in settings)
- Status: "Not pushed" / "Pushed to N8N ✓"

INTERACTION LOGIC:
<interaction_logic>
Step 1: Render DrakonEditor canvas
Step 2: User interacts with canvas
? User adds or selects a node with content starting with ':: n8n ::'?
  YES: Slide in N8NNodeSidebar (right panel)
       Load node configuration from nodeConfiguration state
  NO: Hide N8NNodeSidebar
? User modifies field in N8NNodeSidebar?
  YES: Update nodeConfiguration state for activeNodeId
       Update node content in DrakonIR state
? User clicks Export JSON?
  YES: POST /v1/compiler/n8n with { schema: currentDrakonIR, name: automationName }
       ? Compilation successful?
          YES: Trigger file download: workflow.json
          NO: Highlight erroneous nodes with red border
              Show error message below canvas
? User clicks Push to N8N?
  YES: POST /v1/compiler/n8n/push with { schema: currentDrakonIR, name, n8nUrl, n8nApiKey }
       ? Push successful?
          YES: Update status to "Pushed to N8N ✓" (green)
          NO: Show specific error (auth failed / connection refused)
</interaction_logic>

FILES TO CREATE:
- src/pages/N8NAutomationsPage.tsx
- src/components/n8n/N8NNodeSidebar.tsx
- src/components/n8n/AutomationListTable.tsx
