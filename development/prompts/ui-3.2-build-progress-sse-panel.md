[LOVABLE PROMPT — UI-3.2]

Create BuildProgress page at /p/{slug}/playpipe/build.

Reads buildId from URL: /p/{slug}/playpipe/build?buildId=xxx

LAYOUT:
- Header: "Building {projectName}" + overall progress bar (completed/total)
- Grid of ComponentBuildCard (one per component)
- Bottom: status summary + [Stop All] button

ComponentBuildCard shows:
- Component name + description
- Status: pending | connecting | building | done | error
- When building: animated progress indicator + elapsed time
- When done: green checkmark + "View Output" link
- When error: red X + error message + [Retry] button

INTERACTION LOGIC:
<interaction_logic>
Step 1: Mount component, create EventSource to /v1/playpipe/build/{buildId}/stream
Step 2: Listen for incoming SSE message events
? Valid JSON message received?
  YES: Parse message
       ? event.action === 'status_update'?
          YES: Find component by event.componentId
               Update component status in local state
               Recalculate overall metrics (completed/total)
               Return to Step 2
          NO: ? event.action === 'error_halt'?
              YES: Mark component as 'error'
                   Store event.errorMessage in component state
                   Render Retry button for that component only
                   Return to Step 2
              NO: ? event.action === 'build_complete_global'?
                  YES: Close EventSource gracefully
                       Show success screen:
                       "All components built successfully"
                       [View Solution] [Commit to GitHub] buttons
                  NO: Return to Step 2
  NO: (ignore malformed messages) Return to Step 2

? SSE connection drops (onerror event)?
  YES: Wait 2 seconds, attempt reconnect (max 3 attempts)
       Show "Reconnecting..." indicator
       After 3 failed attempts: show "Connection lost" error + [Resume] button

? User clicks [Retry] on failed component?
  YES: POST /v1/playpipe/build/{buildId}/retry with { componentId }
       Reset that component's status to 'building'

? User clicks [Stop All]?
  YES: Show confirmation modal "Stop the build? Progress will be lost."
       On confirm: close EventSource, POST /v1/playpipe/build/{buildId}/stop
</interaction_logic>

FILES TO CREATE:
- src/pages/PlayPipeBuildPage.tsx
- src/components/playpipe/BuildProgress.tsx
- src/components/playpipe/ComponentBuildCard.tsx
