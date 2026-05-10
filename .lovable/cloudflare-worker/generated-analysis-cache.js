export const PRE_ANALYZED_ANALYSIS = {
  "generatedAt": "2026-05-10T01:43:36.916Z",
  "config": {
    "projectRoot": ".",
    "entryPaths": [
      "src",
      "cloudflare-worker"
    ],
    "includeGlobs": [
      "src/**/*.{ts,tsx,js,jsx}",
      "cloudflare-worker/**/*.{ts,tsx,js,jsx}"
    ],
    "excludeGlobs": [
      "node_modules/**",
      "dist/**",
      ".vinxi/**",
      ".wrangler/**"
    ]
  },
  "summary": {
    "totalFiles": 115,
    "totalFunctions": 180,
    "totalComponents": 72,
    "modules": [
      "cloudflare-worker",
      "src"
    ],
    "detectedFlows": [
      "auth-flow",
      "save-flow",
      "diagram-flow",
      "api-client-flow",
      "state-management-flow",
      "hooks-flow"
    ],
    "functions": [
      {
        "name": "getRouter",
        "filePath": "src/router.tsx",
        "params": [],
        "returnType": "import(\"@tanstack/router-core\").RouterCore<import(\"@tanstack/router-core\").Route<import(\"@tanstack/router-core\").Register, any, \"/\", \"/\", string, \"__root__\", undefined, {}, { queryClient: QueryClient; }, import(\"@tanstack/router-core\").AnyContext, import(\"@tanstack/router-core\").AnyContext, {}, undefined, import(\"./routeTree.gen\").RootRouteChildren, import(\"./routeTree.gen\").FileRouteTypes, unknown, unknown, undefined>, \"never\", false, import(\"@tanstack/history\").RouterHistory, Record<string, any>>",
        "isExported": true
      },
      {
        "name": "getServerEntry",
        "filePath": "src/server.ts",
        "params": [],
        "returnType": "Promise<ServerEntry>",
        "isExported": false
      },
      {
        "name": "brandedErrorResponse",
        "filePath": "src/server.ts",
        "params": [],
        "returnType": "Response",
        "isExported": false
      },
      {
        "name": "isCatastrophicSsrErrorBody",
        "filePath": "src/server.ts",
        "params": [
          "body",
          "responseStatus"
        ],
        "returnType": "boolean",
        "isExported": false
      },
      {
        "name": "normalizeCatastrophicSsrResponse",
        "filePath": "src/server.ts",
        "params": [
          "response"
        ],
        "returnType": "Promise<Response>",
        "isExported": false
      },
      {
        "name": "jsonResponse",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "data",
          "status",
          "extraHeaders"
        ],
        "returnType": "Response",
        "isExported": false
      },
      {
        "name": "corsResponse",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [],
        "returnType": "Response",
        "isExported": false
      },
      {
        "name": "errorResponse",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "message",
          "status",
          "details",
          "code"
        ],
        "returnType": "Response",
        "isExported": false
      },
      {
        "name": "b64urlEncodeJson",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "obj"
        ],
        "returnType": "string",
        "isExported": false
      },
      {
        "name": "b64urlDecodeJson",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "value"
        ],
        "returnType": "any",
        "isExported": false
      },
      {
        "name": "hmacSha256Raw",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "key",
          "message"
        ],
        "returnType": "Promise<Uint8Array<ArrayBuffer>>",
        "isExported": false
      },
      {
        "name": "hmacSha256Hex",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "key",
          "message"
        ],
        "returnType": "Promise<string>",
        "isExported": false
      },
      {
        "name": "sha256Hex",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "message"
        ],
        "returnType": "Promise<string>",
        "isExported": false
      },
      {
        "name": "hashPassword",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "password",
          "secret"
        ],
        "returnType": "Promise<string>",
        "isExported": false
      },
      {
        "name": "generateJWT",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "payload",
          "secret",
          "ttlMs"
        ],
        "returnType": "Promise<string>",
        "isExported": false
      },
      {
        "name": "verifyJWT",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "token",
          "secret"
        ],
        "returnType": "Promise<any>",
        "isExported": false
      },
      {
        "name": "verifyOwnerAuth",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "request",
          "env"
        ],
        "returnType": "Promise<any>",
        "isExported": false
      },
      {
        "name": "s3UriEncode",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "str"
        ],
        "returnType": "string",
        "isExported": false
      },
      {
        "name": "encodeS3KeyForPath",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "key"
        ],
        "returnType": "string",
        "isExported": false
      },
      {
        "name": "signS3Request",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "env",
          "method",
          "canonicalUri",
          "queryString",
          "payloadHash",
          "extraCanonicalHeaders"
        ],
        "returnType": "Promise<{ Authorization: string; 'x-amz-date': string; 'x-amz-content-sha256': any; }>",
        "isExported": false
      },
      {
        "name": "ensureMinioConfig",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "env"
        ],
        "returnType": "void",
        "isExported": false
      },
      {
        "name": "uploadToMinIO",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "env",
          "key",
          "content",
          "contentType"
        ],
        "returnType": "Promise<boolean>",
        "isExported": false
      },
      {
        "name": "getFromMinIO",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "env",
          "key"
        ],
        "returnType": "Promise<string | null>",
        "isExported": false
      },
      {
        "name": "deleteFromMinIO",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "env",
          "key"
        ],
        "returnType": "Promise<boolean>",
        "isExported": false
      },
      {
        "name": "listMinioKeys",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "env",
          "prefix"
        ],
        "returnType": "Promise<string[]>",
        "isExported": false
      },
      {
        "name": "handleDrakonValidateIr",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "request"
        ],
        "returnType": "Promise<Response>",
        "isExported": false
      },
      {
        "name": "safeArray",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "value"
        ],
        "returnType": "any[]",
        "isExported": false
      },
      {
        "name": "buildAnalysisSummary",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "requestBody"
        ],
        "returnType": "{ modules: string[]; totalFiles: number; totalFunctions: number; totalComponents: number; detectedFlows: string[]; functions: { name: string; filePath: string; params: string[]; returnType: string; isExported: boolean; }[]; components: { name: string; filePath: string; hasProps: boolean; }[]; hooks: { name: string; filePath: string; }[]; stores: { name: string; filePath: string; }[]; apiClients: { name: string; filePath: string; methods: string[]; }[]; classes: never[]; importGraph: { \"src/router.tsx\": string[]; \"src/routeTree.gen.ts\": string[]; \"src/server.ts\": string[]; \"src/start.ts\": string[]; \"src/vite-env.d.ts\": never[]; \"cloudflare-worker/worker-mcp-drakon.js\": string[]; \"src/app/AppRouter.tsx\": string[]; \"src/components/DrakonEditor.tsx\": string[]; \"src/components/DrakonViewer.tsx\": string[]; \"src/components/FormatInspector.tsx\": string[]; \"src/components/theme-provider.tsx\": never[]; \"src/context/AuthContext.tsx\": string[]; \"src/hooks/use-mobile.tsx\": string[]; \"src/hooks/use-require-auth.tsx\": string[]; \"src/hooks/useDrakonDiagram.ts\": string[]; \"src/hooks/useLocale.ts\": string[]; \"src/lib/api.ts\": string[]; \"src/lib/auth.ts\": never[]; \"src/lib/client-config.ts\": never[]; \"src/lib/diagram-storage.ts\": string[]; \"src/lib/error-capture.ts\": never[]; \"src/lib/error-page.ts\": never[]; \"src/lib/http.ts\": never[]; \"src/lib/utils.ts\": string[]; \"src/pages/CredentialsPage.tsx\": never[]; \"src/pages/DiagramsPage.tsx\": string[]; \"src/pages/EditorPage.tsx\": string[]; \"src/pages/LoginPage.tsx\": string[]; \"src/pages/ModelsPage.tsx\": never[]; \"src/pages/NotFound.tsx\": string[]; \"src/pages/ObservabilityPage.tsx\": never[]; \"src/pages/OverviewPage.tsx\": never[]; \"src/pages/ProvidersPage.tsx\": never[]; \"src/pages/ProxiesPage.tsx\": never[]; \"src/pages/RoutingPage.tsx\": never[]; \"src/pages/SettingsPage.tsx\": never[]; \"src/routes/__root.tsx\": string[]; \"src/routes/diagrams.tsx\": string[]; \"src/routes/editor.$id.tsx\": string[]; \"src/routes/index.index.tsx\": string[]; \"src/routes/index.tsx\": string[]; \"src/routes/login.tsx\": string[]; \"src/store/useDiagramStore.ts\": string[]; \"src/types/analysis.ts\": never[]; \"src/types/api.ts\": never[]; \"src/types/drakon.ts\": never[]; \"src/types/drakonwidget.d.ts\": never[]; \"src/components/app/AppLayout.tsx\": string[]; \"src/components/app/InlineError.tsx\": string[]; \"src/components/app/LanguageSwitcher.tsx\": never[]; \"src/components/app/PageSkeleton.tsx\": never[]; \"src/components/drakon/DrakonCanvas.tsx\": never[]; \"src/components/ui/accordion.tsx\": string[]; \"src/components/ui/alert-dialog.tsx\": string[]; \"src/components/ui/alert.tsx\": string[]; \"src/components/ui/aspect-ratio.tsx\": string[]; \"src/components/ui/avatar.tsx\": string[]; \"src/components/ui/badge.tsx\": string[]; \"src/components/ui/breadcrumb.tsx\": string[]; \"src/components/ui/button.tsx\": string[]; \"src/components/ui/calendar.tsx\": string[]; \"src/components/ui/card.tsx\": string[]; \"src/components/ui/carousel.tsx\": string[]; \"src/components/ui/chart.tsx\": string[]; \"src/components/ui/checkbox.tsx\": string[]; \"src/components/ui/collapsible.tsx\": string[]; \"src/components/ui/command.tsx\": string[]; \"src/components/ui/context-menu.tsx\": string[]; \"src/components/ui/dialog.tsx\": string[]; \"src/components/ui/drawer.tsx\": string[]; \"src/components/ui/dropdown-menu.tsx\": string[]; \"src/components/ui/form.tsx\": string[]; \"src/components/ui/hover-card.tsx\": string[]; \"src/components/ui/input-otp.tsx\": string[]; \"src/components/ui/input.tsx\": string[]; \"src/components/ui/label.tsx\": string[]; \"src/components/ui/menubar.tsx\": string[]; \"src/components/ui/navigation-menu.tsx\": string[]; \"src/components/ui/pagination.tsx\": string[]; \"src/components/ui/popover.tsx\": string[]; \"src/components/ui/progress.tsx\": string[]; \"src/components/ui/radio-group.tsx\": string[]; \"src/components/ui/resizable.tsx\": string[]; \"src/components/ui/scroll-area.tsx\": string[]; \"src/components/ui/select.tsx\": string[]; \"src/components/ui/separator.tsx\": string[]; \"src/components/ui/sheet.tsx\": string[]; \"src/components/ui/sidebar.tsx\": string[]; \"src/components/ui/skeleton.tsx\": string[]; \"src/components/ui/slider.tsx\": string[]; \"src/components/ui/sonner.tsx\": string[]; \"src/components/ui/switch.tsx\": string[]; \"src/components/ui/table.tsx\": string[]; \"src/components/ui/tabs.tsx\": string[]; \"src/components/ui/textarea.tsx\": string[]; \"src/components/ui/toggle-group.tsx\": string[]; \"src/components/ui/toggle.tsx\": string[]; \"src/components/ui/tooltip.tsx\": string[]; \"src/lib/drakon/adapter.ts\": string[]; \"src/lib/drakon/i18n.ts\": string[]; \"src/lib/drakon/pseudocode.ts\": never[]; \"src/lib/drakon/themeAdapter.ts\": string[]; \"src/lib/drakon/types.ts\": string[]; \"src/lib/htse/diagram-to-ir.ts\": string[]; \"src/lib/htse/ir-examples.ts\": string[]; \"src/lib/htse/ir-helpers.ts\": string[]; \"src/lib/htse/ir-schema.ts\": string[]; \"src/lib/htse/ir-to-diagram.ts\": string[]; \"src/lib/htse/ir-types.ts\": never[]; \"src/lib/htse/ir-validator-client.ts\": string[]; \"src/lib/htse/ir-validator-core.ts\": string[]; \"src/lib/i18n/types.ts\": never[]; \"src/lib/htse/__tests__/ir-validator-integration.test.ts\": string[]; \"src/lib/htse/__tests__/ir-validator.test.ts\": string[]; }; leafModules: string[]; hubModules: string[]; }",
        "isExported": false
      },
      {
        "name": "handleAnalysisCodebase",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "request"
        ],
        "returnType": "Promise<Response>",
        "isExported": false
      },
      {
        "name": "handleAnalysisGetJob",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "jobId"
        ],
        "returnType": "Promise<Response>",
        "isExported": false
      },
      {
        "name": "handleAnalysisListJobs",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [],
        "returnType": "Promise<Response>",
        "isExported": false
      },
      {
        "name": "normalizeDiagramPayload",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "body",
          "folderSlug",
          "diagramId"
        ],
        "returnType": "{ id: any; name: string; folderId: any; createdAt: any; updatedAt: string; diagram: any; }",
        "isExported": false
      },
      {
        "name": "handleAuthLogin",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "request",
          "env"
        ],
        "returnType": "Promise<Response>",
        "isExported": false
      },
      {
        "name": "handleDrakonCommit",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "request",
          "env"
        ],
        "returnType": "Promise<Response>",
        "isExported": false
      },
      {
        "name": "handleDrakonGet",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "folderSlug",
          "diagramId",
          "env"
        ],
        "returnType": "Promise<Response>",
        "isExported": false
      },
      {
        "name": "handleDrakonDelete",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "folderSlug",
          "diagramId",
          "env"
        ],
        "returnType": "Promise<Response>",
        "isExported": false
      },
      {
        "name": "handleDrakonList",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "folderSlug",
          "env"
        ],
        "returnType": "Promise<Response>",
        "isExported": false
      },
      {
        "name": "getMcpTools",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [],
        "returnType": "({ name: string; description: string; inputSchema: { type: string; properties: { folderSlug: { type: string; }; diagramId?: undefined; diagram?: undefined; ir?: undefined; }; required: string[]; }; } | { name: string; description: string; inputSchema: { type: string; properties: { folderSlug: { type: string; }; diagramId: { type: string; }; diagram?: undefined; ir?: undefined; }; required: string[]; }; } | { name: string; description: string; inputSchema: { type: string; properties: { folderSlug: { type: string; }; diagramId: { type: string; }; diagram: { type: string; }; ir?: undefined; }; required: string[]; }; } | { name: string; description: string; inputSchema: { type: string; properties: { ir: { type: string; }; folderSlug?: undefined; diagramId?: undefined; diagram?: undefined; }; required: string[]; }; })[]",
        "isExported": false
      },
      {
        "name": "toolResultJson",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "data"
        ],
        "returnType": "{ content: { type: string; text: string; }[]; }",
        "isExported": false
      },
      {
        "name": "handleMcp",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [
          "request",
          "env"
        ],
        "returnType": "Promise<Response>",
        "isExported": false
      },
      {
        "name": "handleHealth",
        "filePath": "cloudflare-worker/worker-mcp-drakon.js",
        "params": [],
        "returnType": "Promise<Response>",
        "isExported": false
      },
      {
        "name": "ProtectedRoute",
        "filePath": "src/app/AppRouter.tsx",
        "params": [
          "{ children }"
        ],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": false
      },
      {
        "name": "AppRouter",
        "filePath": "src/app/AppRouter.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element | null",
        "isExported": true
      },
      {
        "name": "EditorRouteAdapter",
        "filePath": "src/app/AppRouter.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": false
      },
      {
        "name": "createEmptyDiagram",
        "filePath": "src/components/DrakonEditor.tsx",
        "params": [
          "t"
        ],
        "returnType": "DrakonDiagram",
        "isExported": false
      },
      {
        "name": "DrakonEditor",
        "filePath": "src/components/DrakonEditor.tsx",
        "params": [
          "{\n  diagram,\n  diagramId,\n  folderSlug,\n  height = 500,\n  isNew = false,\n  onSaved,\n  className,\n}"
        ],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "NewDrakonDialog",
        "filePath": "src/components/DrakonEditor.tsx",
        "params": [
          "{ folderSlug, trigger, onCreated }"
        ],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "DrakonViewer",
        "filePath": "src/components/DrakonViewer.tsx",
        "params": [
          "{\n  diagram,\n  diagramId,\n  height = 400,\n  initialZoom = 4000,\n  className,\n}"
        ],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "inferFieldType",
        "filePath": "src/components/FormatInspector.tsx",
        "params": [
          "key",
          "value"
        ],
        "returnType": "FieldType",
        "isExported": false
      },
      {
        "name": "validateField",
        "filePath": "src/components/FormatInspector.tsx",
        "params": [
          "type",
          "value"
        ],
        "returnType": "string | null",
        "isExported": false
      },
      {
        "name": "coerceValue",
        "filePath": "src/components/FormatInspector.tsx",
        "params": [
          "type",
          "input"
        ],
        "returnType": "unknown",
        "isExported": false
      },
      {
        "name": "ColorInput",
        "filePath": "src/components/FormatInspector.tsx",
        "params": [
          "{ value, onChange, error }"
        ],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": false
      },
      {
        "name": "FieldRow",
        "filePath": "src/components/FormatInspector.tsx",
        "params": [
          "{ fieldKey, value, onChange, isCustom }"
        ],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": false
      },
      {
        "name": "FormatInspector",
        "filePath": "src/components/FormatInspector.tsx",
        "params": [
          "{ open, title, style, onConfirm, onCancel }"
        ],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "useTheme",
        "filePath": "src/components/theme-provider.tsx",
        "params": [],
        "returnType": "{ theme: ThemeMode; setTheme: (_theme: ThemeMode) => void; }",
        "isExported": true
      },
      {
        "name": "AuthProvider",
        "filePath": "src/context/AuthContext.tsx",
        "params": [
          "{ children }"
        ],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "useAuth",
        "filePath": "src/context/AuthContext.tsx",
        "params": [],
        "returnType": "AuthContextValue",
        "isExported": true
      },
      {
        "name": "useIsMobile",
        "filePath": "src/hooks/use-mobile.tsx",
        "params": [],
        "returnType": "boolean",
        "isExported": true
      },
      {
        "name": "useRequireAuth",
        "filePath": "src/hooks/use-require-auth.tsx",
        "params": [
          "children"
        ],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "normalizeDiagram",
        "filePath": "src/hooks/useDrakonDiagram.ts",
        "params": [
          "folderSlug",
          "data"
        ],
        "returnType": "Diagram",
        "isExported": false
      },
      {
        "name": "useDrakonDiagram",
        "filePath": "src/hooks/useDrakonDiagram.ts",
        "params": [
          "folderSlug",
          "diagramId"
        ],
        "returnType": "import(\"@tanstack/react-query\").UseQueryResult<Diagram, Error>",
        "isExported": true
      },
      {
        "name": "useSaveDrakonDiagram",
        "filePath": "src/hooks/useDrakonDiagram.ts",
        "params": [
          "folderSlug"
        ],
        "returnType": "import(\"@tanstack/react-query\").UseMutationResult<{ success: boolean; diagram: Diagram; }, Error, SaveInput, unknown>",
        "isExported": true
      },
      {
        "name": "useDeleteDrakonDiagram",
        "filePath": "src/hooks/useDrakonDiagram.ts",
        "params": [
          "folderSlug"
        ],
        "returnType": "import(\"@tanstack/react-query\").UseMutationResult<{ success: boolean; }, Error, string, unknown>",
        "isExported": true
      },
      {
        "name": "getDiagramStorageKey",
        "filePath": "src/hooks/useDrakonDiagram.ts",
        "params": [
          "diagramId"
        ],
        "returnType": "string",
        "isExported": false
      },
      {
        "name": "useLocale",
        "filePath": "src/hooks/useLocale.ts",
        "params": [],
        "returnType": "{ locale: string; t: Translations; }",
        "isExported": true
      },
      {
        "name": "parseResponse",
        "filePath": "src/lib/api.ts",
        "params": [
          "response"
        ],
        "returnType": "Promise<T>",
        "isExported": false
      },
      {
        "name": "headers",
        "filePath": "src/lib/api.ts",
        "params": [],
        "returnType": "{ Authorization: string; \"Content-Type\": string; }",
        "isExported": false
      },
      {
        "name": "getAccessToken",
        "filePath": "src/lib/auth.ts",
        "params": [],
        "returnType": "string | null",
        "isExported": true
      },
      {
        "name": "setAccessToken",
        "filePath": "src/lib/auth.ts",
        "params": [
          "token"
        ],
        "returnType": "void",
        "isExported": true
      },
      {
        "name": "clearAccessToken",
        "filePath": "src/lib/auth.ts",
        "params": [],
        "returnType": "void",
        "isExported": true
      },
      {
        "name": "resolveClientEndpoints",
        "filePath": "src/lib/client-config.ts",
        "params": [
          "origin"
        ],
        "returnType": "ClientEndpoints",
        "isExported": true
      },
      {
        "name": "readDiagramsFromStorage",
        "filePath": "src/lib/diagram-storage.ts",
        "params": [],
        "returnType": "Diagram[]",
        "isExported": true
      },
      {
        "name": "writeDiagramsToStorage",
        "filePath": "src/lib/diagram-storage.ts",
        "params": [
          "diagrams"
        ],
        "returnType": "void",
        "isExported": true
      },
      {
        "name": "upsertDiagramInStorage",
        "filePath": "src/lib/diagram-storage.ts",
        "params": [
          "diagram"
        ],
        "returnType": "void",
        "isExported": true
      },
      {
        "name": "removeDiagramFromStorage",
        "filePath": "src/lib/diagram-storage.ts",
        "params": [
          "diagramId"
        ],
        "returnType": "void",
        "isExported": true
      },
      {
        "name": "record",
        "filePath": "src/lib/error-capture.ts",
        "params": [
          "error"
        ],
        "returnType": "void",
        "isExported": false
      },
      {
        "name": "consumeLastCapturedError",
        "filePath": "src/lib/error-capture.ts",
        "params": [],
        "returnType": "unknown",
        "isExported": true
      },
      {
        "name": "renderErrorPage",
        "filePath": "src/lib/error-page.ts",
        "params": [],
        "returnType": "string",
        "isExported": true
      },
      {
        "name": "httpRequest",
        "filePath": "src/lib/http.ts",
        "params": [
          "input",
          "options"
        ],
        "returnType": "Promise<TResponse>",
        "isExported": true
      },
      {
        "name": "cn",
        "filePath": "src/lib/utils.ts",
        "params": [
          "inputs"
        ],
        "returnType": "string",
        "isExported": true
      },
      {
        "name": "slugify",
        "filePath": "src/lib/utils.ts",
        "params": [
          "value"
        ],
        "returnType": "string",
        "isExported": true
      },
      {
        "name": "CredentialsPage",
        "filePath": "src/pages/CredentialsPage.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "DiagramsPage",
        "filePath": "src/pages/DiagramsPage.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "EditorPage",
        "filePath": "src/pages/EditorPage.tsx",
        "params": [
          "{ diagramId }"
        ],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "LoginPage",
        "filePath": "src/pages/LoginPage.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "ModelsPage",
        "filePath": "src/pages/ModelsPage.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "NotFound",
        "filePath": "src/pages/NotFound.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "ObservabilityPage",
        "filePath": "src/pages/ObservabilityPage.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "OverviewPage",
        "filePath": "src/pages/OverviewPage.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "ProvidersPage",
        "filePath": "src/pages/ProvidersPage.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "ProxiesPage",
        "filePath": "src/pages/ProxiesPage.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "RoutingPage",
        "filePath": "src/pages/RoutingPage.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "SettingsPage",
        "filePath": "src/pages/SettingsPage.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "NotFoundComponent",
        "filePath": "src/routes/__root.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": false
      },
      {
        "name": "ErrorComponent",
        "filePath": "src/routes/__root.tsx",
        "params": [
          "{ error, reset }"
        ],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": false
      },
      {
        "name": "RootShell",
        "filePath": "src/routes/__root.tsx",
        "params": [
          "{ children }"
        ],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": false
      },
      {
        "name": "RootComponent",
        "filePath": "src/routes/__root.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": false
      },
      {
        "name": "DiagramsRoute",
        "filePath": "src/routes/diagrams.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": false
      },
      {
        "name": "EditorRoute",
        "filePath": "src/routes/editor.$id.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": false
      },
      {
        "name": "IndexAliasRoute",
        "filePath": "src/routes/index.index.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": false
      },
      {
        "name": "Index",
        "filePath": "src/routes/index.tsx",
        "params": [],
        "returnType": "null",
        "isExported": false
      },
      {
        "name": "LoginRoute",
        "filePath": "src/routes/login.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": false
      },
      {
        "name": "AppLayout",
        "filePath": "src/components/app/AppLayout.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "InlineError",
        "filePath": "src/components/app/InlineError.tsx",
        "params": [
          "{\n  title = \"Something went wrong\",\n  message = \"Please try again.\",\n  onRetry,\n}"
        ],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "LanguageSwitcher",
        "filePath": "src/components/app/LanguageSwitcher.tsx",
        "params": [
          "{ value = \"uk\", onChange }"
        ],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "PageSkeleton",
        "filePath": "src/components/app/PageSkeleton.tsx",
        "params": [],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "DrakonCanvas",
        "filePath": "src/components/drakon/DrakonCanvas.tsx",
        "params": [
          "{ diagramId }"
        ],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "AlertDialogHeader",
        "filePath": "src/components/ui/alert-dialog.tsx",
        "params": [
          "{ className, ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "AlertDialogFooter",
        "filePath": "src/components/ui/alert-dialog.tsx",
        "params": [
          "{ className, ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "Badge",
        "filePath": "src/components/ui/badge.tsx",
        "params": [
          "{ className, variant, ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": true
      },
      {
        "name": "BreadcrumbSeparator",
        "filePath": "src/components/ui/breadcrumb.tsx",
        "params": [
          "{ children, className, ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "BreadcrumbEllipsis",
        "filePath": "src/components/ui/breadcrumb.tsx",
        "params": [
          "{ className, ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "Calendar",
        "filePath": "src/components/ui/calendar.tsx",
        "params": [
          "{\n  className,\n  classNames,\n  showOutsideDays = true,\n  captionLayout = \"label\",\n  buttonVariant = \"ghost\",\n  formatters,\n  components,\n  ...props\n}"
        ],
        "returnType": "React.JSX.Element",
        "isExported": true
      },
      {
        "name": "CalendarDayButton",
        "filePath": "src/components/ui/calendar.tsx",
        "params": [
          "{\n  className,\n  day,\n  modifiers,\n  ...props\n}"
        ],
        "returnType": "React.JSX.Element",
        "isExported": true
      },
      {
        "name": "useCarousel",
        "filePath": "src/components/ui/carousel.tsx",
        "params": [],
        "returnType": "CarouselContextProps",
        "isExported": false
      },
      {
        "name": "useChart",
        "filePath": "src/components/ui/chart.tsx",
        "params": [],
        "returnType": "ChartContextProps",
        "isExported": false
      },
      {
        "name": "getPayloadConfigFromPayload",
        "filePath": "src/components/ui/chart.tsx",
        "params": [
          "config",
          "payload",
          "key"
        ],
        "returnType": "({ label?: React.ReactNode; icon?: React.ComponentType; } & ({ color?: string; theme?: never; } | { color?: never; theme: Record<keyof typeof THEMES, string>; })) | undefined",
        "isExported": false
      },
      {
        "name": "ChartStyle",
        "filePath": "src/components/ui/chart.tsx",
        "params": [
          "{ id, config }"
        ],
        "returnType": "React.JSX.Element | null",
        "isExported": false
      },
      {
        "name": "CommandDialog",
        "filePath": "src/components/ui/command.tsx",
        "params": [
          "{ children, ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "CommandShortcut",
        "filePath": "src/components/ui/command.tsx",
        "params": [
          "{ className, ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "ContextMenuShortcut",
        "filePath": "src/components/ui/context-menu.tsx",
        "params": [
          "{ className, ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "DialogHeader",
        "filePath": "src/components/ui/dialog.tsx",
        "params": [
          "{ className, ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "DialogFooter",
        "filePath": "src/components/ui/dialog.tsx",
        "params": [
          "{ className, ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "Drawer",
        "filePath": "src/components/ui/drawer.tsx",
        "params": [
          "{\n  shouldScaleBackground = true,\n  ...props\n}"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "DrawerHeader",
        "filePath": "src/components/ui/drawer.tsx",
        "params": [
          "{ className, ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "DrawerFooter",
        "filePath": "src/components/ui/drawer.tsx",
        "params": [
          "{ className, ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "DropdownMenuShortcut",
        "filePath": "src/components/ui/dropdown-menu.tsx",
        "params": [
          "{ className, ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "FormField",
        "filePath": "src/components/ui/form.tsx",
        "params": [
          "{\n  ...props\n}"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "useFormField",
        "filePath": "src/components/ui/form.tsx",
        "params": [],
        "returnType": "{ invalid: boolean; isDirty: boolean; isTouched: boolean; isValidating: boolean; error?: import(\"react-hook-form\").FieldError; id: string; name: string; formItemId: string; formDescriptionId: string; formMessageId: string; }",
        "isExported": false
      },
      {
        "name": "MenubarMenu",
        "filePath": "src/components/ui/menubar.tsx",
        "params": [
          "{ ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": true
      },
      {
        "name": "MenubarGroup",
        "filePath": "src/components/ui/menubar.tsx",
        "params": [
          "{ ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": true
      },
      {
        "name": "MenubarPortal",
        "filePath": "src/components/ui/menubar.tsx",
        "params": [
          "{ ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": true
      },
      {
        "name": "MenubarRadioGroup",
        "filePath": "src/components/ui/menubar.tsx",
        "params": [
          "{ ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": true
      },
      {
        "name": "MenubarSub",
        "filePath": "src/components/ui/menubar.tsx",
        "params": [
          "{ ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": true
      },
      {
        "name": "MenubarShortcut",
        "filePath": "src/components/ui/menubar.tsx",
        "params": [
          "{ className, ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "Pagination",
        "filePath": "src/components/ui/pagination.tsx",
        "params": [
          "{ className, ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "PaginationLink",
        "filePath": "src/components/ui/pagination.tsx",
        "params": [
          "{ className, isActive, size = \"icon\", ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "PaginationPrevious",
        "filePath": "src/components/ui/pagination.tsx",
        "params": [
          "{\n  className,\n  ...props\n}"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "PaginationNext",
        "filePath": "src/components/ui/pagination.tsx",
        "params": [
          "{ className, ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "PaginationEllipsis",
        "filePath": "src/components/ui/pagination.tsx",
        "params": [
          "{ className, ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "ResizablePanelGroup",
        "filePath": "src/components/ui/resizable.tsx",
        "params": [
          "{ className, ...props }"
        ],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": false
      },
      {
        "name": "ResizableHandle",
        "filePath": "src/components/ui/resizable.tsx",
        "params": [
          "{\n  withHandle,\n  className,\n  ...props\n}"
        ],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": false
      },
      {
        "name": "SheetHeader",
        "filePath": "src/components/ui/sheet.tsx",
        "params": [
          "{ className, ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "SheetFooter",
        "filePath": "src/components/ui/sheet.tsx",
        "params": [
          "{ className, ...props }"
        ],
        "returnType": "React.JSX.Element",
        "isExported": false
      },
      {
        "name": "useSidebar",
        "filePath": "src/components/ui/sidebar.tsx",
        "params": [],
        "returnType": "SidebarContextProps",
        "isExported": true
      },
      {
        "name": "Skeleton",
        "filePath": "src/components/ui/skeleton.tsx",
        "params": [
          "{ className, ...props }"
        ],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": true
      },
      {
        "name": "Toaster",
        "filePath": "src/components/ui/sonner.tsx",
        "params": [
          "{ ...props }"
        ],
        "returnType": "import(\"react\").JSX.Element",
        "isExported": false
      },
      {
        "name": "loadDrakonWidget",
        "filePath": "src/lib/drakon/adapter.ts",
        "params": [],
        "returnType": "Promise<void>",
        "isExported": true
      },
      {
        "name": "createWidget",
        "filePath": "src/lib/drakon/adapter.ts",
        "params": [],
        "returnType": "DrakonWidget",
        "isExported": true
      },
      {
        "name": "createDrakonTranslate",
        "filePath": "src/lib/drakon/i18n.ts",
        "params": [
          "drakon"
        ],
        "returnType": "(text: string) => string",
        "isExported": true
      },
      {
        "name": "getDrakonLabels",
        "filePath": "src/lib/drakon/i18n.ts",
        "params": [
          "drakon"
        ],
        "returnType": "{ yes: any; no: any; end: any; exit: any; branch: any; }",
        "isExported": true
      },
      {
        "name": "loadDrakongen",
        "filePath": "src/lib/drakon/pseudocode.ts",
        "params": [],
        "returnType": "Promise<void>",
        "isExported": false
      },
      {
        "name": "diagramToPseudocode",
        "filePath": "src/lib/drakon/pseudocode.ts",
        "params": [
          "diagramJson",
          "name",
          "language"
        ],
        "returnType": "Promise<string>",
        "isExported": true
      },
      {
        "name": "diagramToTree",
        "filePath": "src/lib/drakon/pseudocode.ts",
        "params": [
          "diagramJson",
          "name",
          "language"
        ],
        "returnType": "Promise<string>",
        "isExported": true
      },
      {
        "name": "pseudocodeToMarkdown",
        "filePath": "src/lib/drakon/pseudocode.ts",
        "params": [
          "pseudocode",
          "diagramName"
        ],
        "returnType": "string",
        "isExported": true
      },
      {
        "name": "getGardenDrakonTheme",
        "filePath": "src/lib/drakon/themeAdapter.ts",
        "params": [
          "isDark"
        ],
        "returnType": "DrakonConfigTheme",
        "isExported": true
      },
      {
        "name": "parseDrakonDirective",
        "filePath": "src/lib/drakon/types.ts",
        "params": [
          "text"
        ],
        "returnType": "DrakonBlockParams | null",
        "isExported": true
      },
      {
        "name": "mapDiagramAccessToIrAccess",
        "filePath": "src/lib/htse/diagram-to-ir.ts",
        "params": [
          "access"
        ],
        "returnType": "\"public\" | \"private\"",
        "isExported": false
      },
      {
        "name": "mapDiagramFlag1ToIrFlag1",
        "filePath": "src/lib/htse/diagram-to-ir.ts",
        "params": [
          "flag1"
        ],
        "returnType": "boolean | undefined",
        "isExported": false
      },
      {
        "name": "mapDiagramBranchIdToIrBranchId",
        "filePath": "src/lib/htse/diagram-to-ir.ts",
        "params": [
          "branchId"
        ],
        "returnType": "string | undefined",
        "isExported": false
      },
      {
        "name": "parseItemStyle",
        "filePath": "src/lib/htse/diagram-to-ir.ts",
        "params": [
          "style"
        ],
        "returnType": "Record<string, unknown>",
        "isExported": false
      },
      {
        "name": "mapDrakonTypeToIrType",
        "filePath": "src/lib/htse/diagram-to-ir.ts",
        "params": [
          "type"
        ],
        "returnType": "IrItemType",
        "isExported": false
      },
      {
        "name": "mapDiagramItemToIrItem",
        "filePath": "src/lib/htse/diagram-to-ir.ts",
        "params": [
          "item"
        ],
        "returnType": "IrItem",
        "isExported": false
      },
      {
        "name": "parseDiagramParams",
        "filePath": "src/lib/htse/diagram-to-ir.ts",
        "params": [
          "params"
        ],
        "returnType": "string[]",
        "isExported": false
      },
      {
        "name": "convertDiagramToIr",
        "filePath": "src/lib/htse/diagram-to-ir.ts",
        "params": [
          "diagram"
        ],
        "returnType": "IrDiagram",
        "isExported": true
      },
      {
        "name": "cleanString",
        "filePath": "src/lib/htse/ir-helpers.ts",
        "params": [
          "value"
        ],
        "returnType": "string | undefined",
        "isExported": false
      },
      {
        "name": "isValidIrItem",
        "filePath": "src/lib/htse/ir-helpers.ts",
        "params": [
          "item"
        ],
        "returnType": "boolean",
        "isExported": true
      },
      {
        "name": "normalizeIr",
        "filePath": "src/lib/htse/ir-helpers.ts",
        "params": [
          "payload"
        ],
        "returnType": "IrDiagram",
        "isExported": true
      },
      {
        "name": "getItemById",
        "filePath": "src/lib/htse/ir-helpers.ts",
        "params": [
          "ir",
          "id"
        ],
        "returnType": "IrItem | undefined",
        "isExported": true
      },
      {
        "name": "validateIrPayload",
        "filePath": "src/lib/htse/ir-schema.ts",
        "params": [
          "payload"
        ],
        "returnType": "{ success: boolean; data?: IrDiagram; error?: string; }",
        "isExported": true
      },
      {
        "name": "mapIrAccessToDiagramAccess",
        "filePath": "src/lib/htse/ir-to-diagram.ts",
        "params": [
          "access"
        ],
        "returnType": "DrakonDiagram",
        "isExported": false
      },
      {
        "name": "mapIrFlag1ToDiagramFlag1",
        "filePath": "src/lib/htse/ir-to-diagram.ts",
        "params": [
          "flag1"
        ],
        "returnType": "number | undefined",
        "isExported": false
      },
      {
        "name": "mapIrBranchIdToDiagramBranchId",
        "filePath": "src/lib/htse/ir-to-diagram.ts",
        "params": [
          "branchId"
        ],
        "returnType": "number | undefined",
        "isExported": false
      },
      {
        "name": "mapIrItemToDrakonItem",
        "filePath": "src/lib/htse/ir-to-diagram.ts",
        "params": [
          "item"
        ],
        "returnType": "DrakonItem",
        "isExported": false
      },
      {
        "name": "convertIrToDiagram",
        "filePath": "src/lib/htse/ir-to-diagram.ts",
        "params": [
          "ir"
        ],
        "returnType": "DrakonDiagram",
        "isExported": true
      },
      {
        "name": "headers",
        "filePath": "src/lib/htse/ir-validator-client.ts",
        "params": [],
        "returnType": "{ Authorization: string; \"Content-Type\": string; }",
        "isExported": false
      },
      {
        "name": "validateIrRemote",
        "filePath": "src/lib/htse/ir-validator-client.ts",
        "params": [
          "ir"
        ],
        "returnType": "Promise<ValidationResult>",
        "isExported": true
      },
      {
        "name": "isObject",
        "filePath": "src/lib/htse/ir-validator-core.ts",
        "params": [
          "value"
        ],
        "returnType": "boolean",
        "isExported": true
      },
      {
        "name": "normalizeIr",
        "filePath": "src/lib/htse/ir-validator-core.ts",
        "params": [
          "ir"
        ],
        "returnType": "IrDiagram",
        "isExported": true
      },
      {
        "name": "validateIrDeterministic",
        "filePath": "src/lib/htse/ir-validator-core.ts",
        "params": [
          "irPayload"
        ],
        "returnType": "ValidationResult",
        "isExported": true
      }
    ],
    "components": [
      {
        "name": "ProtectedRoute",
        "filePath": "src/app/AppRouter.tsx",
        "hasProps": true
      },
      {
        "name": "AppRouter",
        "filePath": "src/app/AppRouter.tsx",
        "hasProps": false
      },
      {
        "name": "EditorRouteAdapter",
        "filePath": "src/app/AppRouter.tsx",
        "hasProps": false
      },
      {
        "name": "DrakonEditor",
        "filePath": "src/components/DrakonEditor.tsx",
        "hasProps": true
      },
      {
        "name": "NewDrakonDialog",
        "filePath": "src/components/DrakonEditor.tsx",
        "hasProps": true
      },
      {
        "name": "DrakonViewer",
        "filePath": "src/components/DrakonViewer.tsx",
        "hasProps": true
      },
      {
        "name": "ColorInput",
        "filePath": "src/components/FormatInspector.tsx",
        "hasProps": true
      },
      {
        "name": "FieldRow",
        "filePath": "src/components/FormatInspector.tsx",
        "hasProps": true
      },
      {
        "name": "FormatInspector",
        "filePath": "src/components/FormatInspector.tsx",
        "hasProps": true
      },
      {
        "name": "AuthProvider",
        "filePath": "src/context/AuthContext.tsx",
        "hasProps": true
      },
      {
        "name": "useRequireAuth",
        "filePath": "src/hooks/use-require-auth.tsx",
        "hasProps": true
      },
      {
        "name": "CredentialsPage",
        "filePath": "src/pages/CredentialsPage.tsx",
        "hasProps": false
      },
      {
        "name": "DiagramsPage",
        "filePath": "src/pages/DiagramsPage.tsx",
        "hasProps": false
      },
      {
        "name": "EditorPage",
        "filePath": "src/pages/EditorPage.tsx",
        "hasProps": true
      },
      {
        "name": "LoginPage",
        "filePath": "src/pages/LoginPage.tsx",
        "hasProps": false
      },
      {
        "name": "ModelsPage",
        "filePath": "src/pages/ModelsPage.tsx",
        "hasProps": false
      },
      {
        "name": "NotFound",
        "filePath": "src/pages/NotFound.tsx",
        "hasProps": false
      },
      {
        "name": "ObservabilityPage",
        "filePath": "src/pages/ObservabilityPage.tsx",
        "hasProps": false
      },
      {
        "name": "OverviewPage",
        "filePath": "src/pages/OverviewPage.tsx",
        "hasProps": false
      },
      {
        "name": "ProvidersPage",
        "filePath": "src/pages/ProvidersPage.tsx",
        "hasProps": false
      },
      {
        "name": "ProxiesPage",
        "filePath": "src/pages/ProxiesPage.tsx",
        "hasProps": false
      },
      {
        "name": "RoutingPage",
        "filePath": "src/pages/RoutingPage.tsx",
        "hasProps": false
      },
      {
        "name": "SettingsPage",
        "filePath": "src/pages/SettingsPage.tsx",
        "hasProps": false
      },
      {
        "name": "NotFoundComponent",
        "filePath": "src/routes/__root.tsx",
        "hasProps": false
      },
      {
        "name": "ErrorComponent",
        "filePath": "src/routes/__root.tsx",
        "hasProps": true
      },
      {
        "name": "RootShell",
        "filePath": "src/routes/__root.tsx",
        "hasProps": true
      },
      {
        "name": "RootComponent",
        "filePath": "src/routes/__root.tsx",
        "hasProps": false
      },
      {
        "name": "DiagramsRoute",
        "filePath": "src/routes/diagrams.tsx",
        "hasProps": false
      },
      {
        "name": "EditorRoute",
        "filePath": "src/routes/editor.$id.tsx",
        "hasProps": false
      },
      {
        "name": "IndexAliasRoute",
        "filePath": "src/routes/index.index.tsx",
        "hasProps": false
      },
      {
        "name": "Index",
        "filePath": "src/routes/index.tsx",
        "hasProps": false
      },
      {
        "name": "LoginRoute",
        "filePath": "src/routes/login.tsx",
        "hasProps": false
      },
      {
        "name": "AppLayout",
        "filePath": "src/components/app/AppLayout.tsx",
        "hasProps": false
      },
      {
        "name": "InlineError",
        "filePath": "src/components/app/InlineError.tsx",
        "hasProps": true
      },
      {
        "name": "LanguageSwitcher",
        "filePath": "src/components/app/LanguageSwitcher.tsx",
        "hasProps": true
      },
      {
        "name": "PageSkeleton",
        "filePath": "src/components/app/PageSkeleton.tsx",
        "hasProps": false
      },
      {
        "name": "DrakonCanvas",
        "filePath": "src/components/drakon/DrakonCanvas.tsx",
        "hasProps": true
      },
      {
        "name": "AlertDialogHeader",
        "filePath": "src/components/ui/alert-dialog.tsx",
        "hasProps": true
      },
      {
        "name": "AlertDialogFooter",
        "filePath": "src/components/ui/alert-dialog.tsx",
        "hasProps": true
      },
      {
        "name": "Badge",
        "filePath": "src/components/ui/badge.tsx",
        "hasProps": true
      },
      {
        "name": "BreadcrumbSeparator",
        "filePath": "src/components/ui/breadcrumb.tsx",
        "hasProps": true
      },
      {
        "name": "BreadcrumbEllipsis",
        "filePath": "src/components/ui/breadcrumb.tsx",
        "hasProps": true
      },
      {
        "name": "Calendar",
        "filePath": "src/components/ui/calendar.tsx",
        "hasProps": true
      },
      {
        "name": "CalendarDayButton",
        "filePath": "src/components/ui/calendar.tsx",
        "hasProps": true
      },
      {
        "name": "ChartStyle",
        "filePath": "src/components/ui/chart.tsx",
        "hasProps": true
      },
      {
        "name": "CommandDialog",
        "filePath": "src/components/ui/command.tsx",
        "hasProps": true
      },
      {
        "name": "CommandShortcut",
        "filePath": "src/components/ui/command.tsx",
        "hasProps": true
      },
      {
        "name": "ContextMenuShortcut",
        "filePath": "src/components/ui/context-menu.tsx",
        "hasProps": true
      },
      {
        "name": "DialogHeader",
        "filePath": "src/components/ui/dialog.tsx",
        "hasProps": true
      },
      {
        "name": "DialogFooter",
        "filePath": "src/components/ui/dialog.tsx",
        "hasProps": true
      },
      {
        "name": "Drawer",
        "filePath": "src/components/ui/drawer.tsx",
        "hasProps": true
      },
      {
        "name": "DrawerHeader",
        "filePath": "src/components/ui/drawer.tsx",
        "hasProps": true
      },
      {
        "name": "DrawerFooter",
        "filePath": "src/components/ui/drawer.tsx",
        "hasProps": true
      },
      {
        "name": "DropdownMenuShortcut",
        "filePath": "src/components/ui/dropdown-menu.tsx",
        "hasProps": true
      },
      {
        "name": "FormField",
        "filePath": "src/components/ui/form.tsx",
        "hasProps": true
      },
      {
        "name": "MenubarMenu",
        "filePath": "src/components/ui/menubar.tsx",
        "hasProps": true
      },
      {
        "name": "MenubarGroup",
        "filePath": "src/components/ui/menubar.tsx",
        "hasProps": true
      },
      {
        "name": "MenubarPortal",
        "filePath": "src/components/ui/menubar.tsx",
        "hasProps": true
      },
      {
        "name": "MenubarRadioGroup",
        "filePath": "src/components/ui/menubar.tsx",
        "hasProps": true
      },
      {
        "name": "MenubarSub",
        "filePath": "src/components/ui/menubar.tsx",
        "hasProps": true
      },
      {
        "name": "MenubarShortcut",
        "filePath": "src/components/ui/menubar.tsx",
        "hasProps": true
      },
      {
        "name": "Pagination",
        "filePath": "src/components/ui/pagination.tsx",
        "hasProps": true
      },
      {
        "name": "PaginationLink",
        "filePath": "src/components/ui/pagination.tsx",
        "hasProps": true
      },
      {
        "name": "PaginationPrevious",
        "filePath": "src/components/ui/pagination.tsx",
        "hasProps": true
      },
      {
        "name": "PaginationNext",
        "filePath": "src/components/ui/pagination.tsx",
        "hasProps": true
      },
      {
        "name": "PaginationEllipsis",
        "filePath": "src/components/ui/pagination.tsx",
        "hasProps": true
      },
      {
        "name": "ResizablePanelGroup",
        "filePath": "src/components/ui/resizable.tsx",
        "hasProps": true
      },
      {
        "name": "ResizableHandle",
        "filePath": "src/components/ui/resizable.tsx",
        "hasProps": true
      },
      {
        "name": "SheetHeader",
        "filePath": "src/components/ui/sheet.tsx",
        "hasProps": true
      },
      {
        "name": "SheetFooter",
        "filePath": "src/components/ui/sheet.tsx",
        "hasProps": true
      },
      {
        "name": "Skeleton",
        "filePath": "src/components/ui/skeleton.tsx",
        "hasProps": true
      },
      {
        "name": "Toaster",
        "filePath": "src/components/ui/sonner.tsx",
        "hasProps": true
      }
    ],
    "hooks": [
      {
        "name": "useTheme",
        "filePath": "src/components/theme-provider.tsx"
      },
      {
        "name": "useAuth",
        "filePath": "src/context/AuthContext.tsx"
      },
      {
        "name": "useIsMobile",
        "filePath": "src/hooks/use-mobile.tsx"
      },
      {
        "name": "useRequireAuth",
        "filePath": "src/hooks/use-require-auth.tsx"
      },
      {
        "name": "useDrakonDiagram",
        "filePath": "src/hooks/useDrakonDiagram.ts"
      },
      {
        "name": "useSaveDrakonDiagram",
        "filePath": "src/hooks/useDrakonDiagram.ts"
      },
      {
        "name": "useDeleteDrakonDiagram",
        "filePath": "src/hooks/useDrakonDiagram.ts"
      },
      {
        "name": "useLocale",
        "filePath": "src/hooks/useLocale.ts"
      },
      {
        "name": "useCarousel",
        "filePath": "src/components/ui/carousel.tsx"
      },
      {
        "name": "useChart",
        "filePath": "src/components/ui/chart.tsx"
      },
      {
        "name": "useFormField",
        "filePath": "src/components/ui/form.tsx"
      },
      {
        "name": "useSidebar",
        "filePath": "src/components/ui/sidebar.tsx"
      }
    ],
    "stores": [
      {
        "name": "generated-analysis-cache",
        "filePath": "cloudflare-worker/generated-analysis-cache.js"
      },
      {
        "name": "useDiagramStore",
        "filePath": "src/store/useDiagramStore.ts"
      }
    ],
    "apiClients": [
      {
        "name": "api",
        "filePath": "src/lib/api.ts",
        "methods": [
          "login",
          "generate",
          "commit",
          "getDiagram",
          "listDiagrams",
          "deleteDiagram",
          "analyzeCodebase",
          "getAnalysisJob",
          "listAnalysisJobs"
        ]
      },
      {
        "name": "api",
        "filePath": "src/types/api.ts",
        "methods": []
      },
      {
        "name": "ir-validator-client",
        "filePath": "src/lib/htse/ir-validator-client.ts",
        "methods": [
          "validateIrRemote"
        ]
      }
    ],
    "classes": [],
    "importGraph": {
      "src/router.tsx": [
        "@tanstack/react-query",
        "@tanstack/react-router",
        "./routeTree.gen"
      ],
      "src/routeTree.gen.ts": [
        "./routes/__root",
        "./routes/login",
        "./routes/diagrams",
        "./routes/index",
        "./routes/index.index",
        "./routes/editor.$id",
        "./router.tsx",
        "./start.ts"
      ],
      "src/server.ts": [
        "./lib/error-capture",
        "./lib/error-capture",
        "./lib/error-page"
      ],
      "src/start.ts": [
        "@tanstack/react-start",
        "./lib/error-page"
      ],
      "src/vite-env.d.ts": [],
      "cloudflare-worker/generated-analysis-cache.js": [],
      "cloudflare-worker/worker-mcp-drakon.js": [
        "../src/lib/htse/ir-validator-core",
        "./generated-analysis-cache"
      ],
      "src/app/AppRouter.tsx": [
        "react",
        "react-router-dom",
        "@/components/ui/sonner",
        "@/pages/DiagramsPage",
        "@/pages/EditorPage",
        "@/pages/LoginPage",
        "@/pages/NotFound"
      ],
      "src/components/DrakonEditor.tsx": [
        "react",
        "@/components/theme-provider",
        "@/lib/utils",
        "lucide-react",
        "@/assets/drakon/action.png",
        "@/assets/drakon/question.png",
        "@/assets/drakon/select.png",
        "@/assets/drakon/case.png",
        "@/assets/drakon/foreach.png",
        "@/assets/drakon/branch.png",
        "@/assets/drakon/insertion.png",
        "@/assets/drakon/comment.png",
        "@/assets/drakon/sinput.png",
        "@/assets/drakon/soutput.png",
        "@/assets/drakon/timer.png",
        "@/assets/drakon/pause.png",
        "@/assets/drakon/duration.png",
        "@/assets/drakon/process.png",
        "@/assets/drakon/input.png",
        "@/assets/drakon/output.png",
        "@/assets/drakon/silhouette.png",
        "@/assets/drakon/shelf.png",
        "@/assets/drakon/end.png",
        "@/assets/drakon/ctrl-start.png",
        "@/assets/drakon/ctrl-end.png",
        "@/assets/drakon/par.png",
        "@/assets/drakon/parblock.png",
        "@/assets/drakon/group-duration.png",
        "@/assets/drakon/group-duration-r.png",
        "@/assets/drakon/link.png",
        "@/components/ui/button",
        "@/components/ui/input",
        "@/components/ui/label",
        "@/components/ui/dialog",
        "@/lib/utils",
        "@/components/ui/tooltip",
        "@/components/ui/scroll-area",
        "@/lib/drakon/adapter",
        "@/lib/drakon/themeAdapter",
        "@/hooks/useDrakonDiagram",
        "@/hooks/useLocale",
        "@/lib/drakon/pseudocode",
        "@/lib/drakon/i18n",
        "@/components/FormatInspector",
        "@/types/drakonwidget"
      ],
      "src/components/DrakonViewer.tsx": [
        "react",
        "@/components/theme-provider",
        "lucide-react",
        "@/lib/utils",
        "@/lib/drakon/adapter",
        "@/lib/drakon/themeAdapter",
        "@/lib/drakon/i18n",
        "@/hooks/useLocale",
        "@/components/ui/button",
        "@/components/ui/dialog",
        "@/types/drakonwidget"
      ],
      "src/components/FormatInspector.tsx": [
        "react",
        "@/components/ui/dialog",
        "@/components/ui/button",
        "@/components/ui/input",
        "@/components/ui/switch",
        "@/components/ui/label",
        "@/components/ui/badge",
        "@/components/ui/scroll-area",
        "@/components/ui/collapsible",
        "@/components/ui/select",
        "lucide-react",
        "@/lib/utils"
      ],
      "src/components/theme-provider.tsx": [],
      "src/context/AuthContext.tsx": [
        "react"
      ],
      "src/hooks/use-mobile.tsx": [
        "react"
      ],
      "src/hooks/use-require-auth.tsx": [
        "react",
        "react-router-dom",
        "@/components/app/PageSkeleton",
        "@/context/AuthContext"
      ],
      "src/hooks/useDrakonDiagram.ts": [
        "@tanstack/react-query",
        "sonner",
        "@/lib/api",
        "@/lib/diagram-storage",
        "@/store/useDiagramStore",
        "@/types/drakon"
      ],
      "src/hooks/useLocale.ts": [
        "@/lib/i18n/types"
      ],
      "src/lib/api.ts": [
        "@/types/drakon",
        "@/types/analysis"
      ],
      "src/lib/auth.ts": [],
      "src/lib/client-config.ts": [],
      "src/lib/diagram-storage.ts": [
        "@/types/drakon"
      ],
      "src/lib/error-capture.ts": [],
      "src/lib/error-page.ts": [],
      "src/lib/http.ts": [],
      "src/lib/utils.ts": [
        "clsx",
        "tailwind-merge"
      ],
      "src/pages/CredentialsPage.tsx": [],
      "src/pages/DiagramsPage.tsx": [
        "react",
        "@tanstack/react-router",
        "date-fns",
        "lucide-react",
        "sonner",
        "@/components/ui/alert-dialog",
        "@/components/ui/badge",
        "@/components/ui/button",
        "@/components/ui/card",
        "@/components/ui/collapsible",
        "@/components/ui/dialog",
        "@/components/ui/input",
        "@/components/ui/label",
        "@/components/ui/select",
        "@/components/ui/textarea",
        "@/lib/api",
        "@/lib/diagram-storage",
        "@/store/useDiagramStore",
        "@/types/analysis",
        "@/types/drakon"
      ],
      "src/pages/EditorPage.tsx": [
        "react",
        "@tanstack/react-router",
        "sonner",
        "@/components/DrakonEditor",
        "@/components/ui/badge",
        "@/components/ui/button",
        "@/components/ui/input",
        "@/lib/diagram-storage",
        "@/store/useDiagramStore",
        "@/types/drakon"
      ],
      "src/pages/LoginPage.tsx": [
        "react",
        "@tanstack/react-router",
        "sonner",
        "@/components/ui/button",
        "@/components/ui/card",
        "@/components/ui/input",
        "@/components/ui/label",
        "@/lib/api"
      ],
      "src/pages/ModelsPage.tsx": [],
      "src/pages/NotFound.tsx": [
        "react-router-dom"
      ],
      "src/pages/ObservabilityPage.tsx": [],
      "src/pages/OverviewPage.tsx": [],
      "src/pages/ProvidersPage.tsx": [],
      "src/pages/ProxiesPage.tsx": [],
      "src/pages/RoutingPage.tsx": [],
      "src/pages/SettingsPage.tsx": [],
      "src/routes/__root.tsx": [
        "@tanstack/react-query",
        "@tanstack/react-router",
        "../styles.css?url"
      ],
      "src/routes/diagrams.tsx": [
        "@tanstack/react-router",
        "@/pages/DiagramsPage"
      ],
      "src/routes/editor.$id.tsx": [
        "@tanstack/react-router",
        "@/pages/EditorPage"
      ],
      "src/routes/index.index.tsx": [
        "@tanstack/react-router"
      ],
      "src/routes/index.tsx": [
        "@tanstack/react-router",
        "react"
      ],
      "src/routes/login.tsx": [
        "@tanstack/react-router",
        "@/pages/LoginPage"
      ],
      "src/store/useDiagramStore.ts": [
        "zustand",
        "@/lib/api",
        "@/lib/diagram-storage",
        "@/types/drakon"
      ],
      "src/types/analysis.ts": [],
      "src/types/api.ts": [],
      "src/types/drakon.ts": [],
      "src/types/drakonwidget.d.ts": [],
      "src/components/app/AppLayout.tsx": [
        "react-router-dom",
        "@/components/app/LanguageSwitcher"
      ],
      "src/components/app/InlineError.tsx": [
        "@/components/ui/button"
      ],
      "src/components/app/LanguageSwitcher.tsx": [],
      "src/components/app/PageSkeleton.tsx": [],
      "src/components/drakon/DrakonCanvas.tsx": [],
      "src/components/ui/accordion.tsx": [
        "react",
        "@radix-ui/react-accordion",
        "lucide-react",
        "@/lib/utils"
      ],
      "src/components/ui/alert-dialog.tsx": [
        "react",
        "@radix-ui/react-alert-dialog",
        "@/lib/utils",
        "@/components/ui/button"
      ],
      "src/components/ui/alert.tsx": [
        "react",
        "class-variance-authority",
        "@/lib/utils"
      ],
      "src/components/ui/aspect-ratio.tsx": [
        "@radix-ui/react-aspect-ratio"
      ],
      "src/components/ui/avatar.tsx": [
        "react",
        "@radix-ui/react-avatar",
        "@/lib/utils"
      ],
      "src/components/ui/badge.tsx": [
        "react",
        "class-variance-authority",
        "@/lib/utils"
      ],
      "src/components/ui/breadcrumb.tsx": [
        "react",
        "@radix-ui/react-slot",
        "lucide-react",
        "@/lib/utils"
      ],
      "src/components/ui/button.tsx": [
        "react",
        "@radix-ui/react-slot",
        "class-variance-authority",
        "@/lib/utils"
      ],
      "src/components/ui/calendar.tsx": [
        "react",
        "lucide-react",
        "react-day-picker",
        "@/lib/utils",
        "@/components/ui/button"
      ],
      "src/components/ui/card.tsx": [
        "react",
        "@/lib/utils"
      ],
      "src/components/ui/carousel.tsx": [
        "react",
        "embla-carousel-react",
        "lucide-react",
        "@/lib/utils",
        "@/components/ui/button"
      ],
      "src/components/ui/chart.tsx": [
        "react",
        "recharts",
        "@/lib/utils"
      ],
      "src/components/ui/checkbox.tsx": [
        "react",
        "@radix-ui/react-checkbox",
        "lucide-react",
        "@/lib/utils"
      ],
      "src/components/ui/collapsible.tsx": [
        "@radix-ui/react-collapsible"
      ],
      "src/components/ui/command.tsx": [
        "react",
        "@radix-ui/react-dialog",
        "cmdk",
        "lucide-react",
        "@/lib/utils",
        "@/components/ui/dialog"
      ],
      "src/components/ui/context-menu.tsx": [
        "react",
        "@radix-ui/react-context-menu",
        "lucide-react",
        "@/lib/utils"
      ],
      "src/components/ui/dialog.tsx": [
        "react",
        "@radix-ui/react-dialog",
        "lucide-react",
        "@/lib/utils"
      ],
      "src/components/ui/drawer.tsx": [
        "react",
        "vaul",
        "@/lib/utils"
      ],
      "src/components/ui/dropdown-menu.tsx": [
        "react",
        "@radix-ui/react-dropdown-menu",
        "lucide-react",
        "@/lib/utils"
      ],
      "src/components/ui/form.tsx": [
        "react",
        "@radix-ui/react-label",
        "@radix-ui/react-slot",
        "react-hook-form",
        "@/lib/utils",
        "@/components/ui/label"
      ],
      "src/components/ui/hover-card.tsx": [
        "react",
        "@radix-ui/react-hover-card",
        "@/lib/utils"
      ],
      "src/components/ui/input-otp.tsx": [
        "react",
        "input-otp",
        "lucide-react",
        "@/lib/utils"
      ],
      "src/components/ui/input.tsx": [
        "react",
        "@/lib/utils"
      ],
      "src/components/ui/label.tsx": [
        "react",
        "@radix-ui/react-label",
        "class-variance-authority",
        "@/lib/utils"
      ],
      "src/components/ui/menubar.tsx": [
        "react",
        "@radix-ui/react-menubar",
        "lucide-react",
        "@/lib/utils"
      ],
      "src/components/ui/navigation-menu.tsx": [
        "react",
        "@radix-ui/react-navigation-menu",
        "class-variance-authority",
        "lucide-react",
        "@/lib/utils"
      ],
      "src/components/ui/pagination.tsx": [
        "react",
        "lucide-react",
        "@/lib/utils",
        "@/components/ui/button"
      ],
      "src/components/ui/popover.tsx": [
        "react",
        "@radix-ui/react-popover",
        "@/lib/utils"
      ],
      "src/components/ui/progress.tsx": [
        "react",
        "@radix-ui/react-progress",
        "@/lib/utils"
      ],
      "src/components/ui/radio-group.tsx": [
        "react",
        "@radix-ui/react-radio-group",
        "lucide-react",
        "@/lib/utils"
      ],
      "src/components/ui/resizable.tsx": [
        "lucide-react",
        "react-resizable-panels",
        "@/lib/utils"
      ],
      "src/components/ui/scroll-area.tsx": [
        "react",
        "@radix-ui/react-scroll-area",
        "@/lib/utils"
      ],
      "src/components/ui/select.tsx": [
        "react",
        "@radix-ui/react-select",
        "lucide-react",
        "@/lib/utils"
      ],
      "src/components/ui/separator.tsx": [
        "react",
        "@radix-ui/react-separator",
        "@/lib/utils"
      ],
      "src/components/ui/sheet.tsx": [
        "react",
        "@radix-ui/react-dialog",
        "class-variance-authority",
        "lucide-react",
        "@/lib/utils"
      ],
      "src/components/ui/sidebar.tsx": [
        "react",
        "@radix-ui/react-slot",
        "class-variance-authority",
        "lucide-react",
        "@/hooks/use-mobile",
        "@/lib/utils",
        "@/components/ui/button",
        "@/components/ui/input",
        "@/components/ui/separator",
        "@/components/ui/sheet",
        "@/components/ui/skeleton",
        "@/components/ui/tooltip"
      ],
      "src/components/ui/skeleton.tsx": [
        "@/lib/utils"
      ],
      "src/components/ui/slider.tsx": [
        "react",
        "@radix-ui/react-slider",
        "@/lib/utils"
      ],
      "src/components/ui/sonner.tsx": [
        "sonner"
      ],
      "src/components/ui/switch.tsx": [
        "react",
        "@radix-ui/react-switch",
        "@/lib/utils"
      ],
      "src/components/ui/table.tsx": [
        "react",
        "@/lib/utils"
      ],
      "src/components/ui/tabs.tsx": [
        "react",
        "@radix-ui/react-tabs",
        "@/lib/utils"
      ],
      "src/components/ui/textarea.tsx": [
        "react",
        "@/lib/utils"
      ],
      "src/components/ui/toggle-group.tsx": [
        "react",
        "@radix-ui/react-toggle-group",
        "class-variance-authority",
        "@/lib/utils",
        "@/components/ui/toggle"
      ],
      "src/components/ui/toggle.tsx": [
        "react",
        "@radix-ui/react-toggle",
        "class-variance-authority",
        "@/lib/utils"
      ],
      "src/components/ui/tooltip.tsx": [
        "react",
        "@radix-ui/react-tooltip",
        "@/lib/utils"
      ],
      "src/lib/drakon/adapter.ts": [
        "@/types/drakonwidget"
      ],
      "src/lib/drakon/i18n.ts": [
        "@/lib/i18n/types"
      ],
      "src/lib/drakon/pseudocode.ts": [],
      "src/lib/drakon/themeAdapter.ts": [
        "@/types/drakonwidget"
      ],
      "src/lib/drakon/types.ts": [
        "@/types/drakonwidget"
      ],
      "src/lib/htse/diagram-to-ir.ts": [
        "@/types/drakonwidget",
        "./ir-types"
      ],
      "src/lib/htse/ir-examples.ts": [
        "./ir-types"
      ],
      "src/lib/htse/ir-helpers.ts": [
        "./ir-schema",
        "./ir-types"
      ],
      "src/lib/htse/ir-schema.ts": [
        "zod",
        "./ir-types"
      ],
      "src/lib/htse/ir-to-diagram.ts": [
        "@/types/drakonwidget",
        "./ir-types"
      ],
      "src/lib/htse/ir-types.ts": [],
      "src/lib/htse/ir-validator-client.ts": [
        "./ir-types"
      ],
      "src/lib/htse/ir-validator-core.ts": [
        "./ir-types"
      ],
      "src/lib/i18n/types.ts": [],
      "src/lib/htse/__tests__/ir-validator-integration.test.ts": [
        "vitest",
        "../ir-types"
      ],
      "src/lib/htse/__tests__/ir-validator.test.ts": [
        "vitest",
        "../ir-validator-core"
      ]
    },
    "leafModules": [
      "cloudflare-worker/generated-analysis-cache.js",
      "src/components/app/LanguageSwitcher.tsx",
      "src/components/app/PageSkeleton.tsx",
      "src/components/drakon/DrakonCanvas.tsx",
      "src/components/theme-provider.tsx",
      "src/lib/auth.ts",
      "src/lib/client-config.ts",
      "src/lib/drakon/pseudocode.ts",
      "src/lib/error-capture.ts",
      "src/lib/error-page.ts",
      "src/lib/htse/ir-types.ts",
      "src/lib/http.ts",
      "src/lib/i18n/types.ts",
      "src/pages/CredentialsPage.tsx",
      "src/pages/ModelsPage.tsx",
      "src/pages/ObservabilityPage.tsx",
      "src/pages/OverviewPage.tsx",
      "src/pages/ProvidersPage.tsx",
      "src/pages/ProxiesPage.tsx",
      "src/pages/RoutingPage.tsx",
      "src/pages/SettingsPage.tsx",
      "src/types/analysis.ts",
      "src/types/api.ts",
      "src/types/drakon.ts",
      "src/types/drakonwidget.d.ts",
      "src/vite-env.d.ts"
    ],
    "hubModules": [
      "src/components/DrakonEditor.tsx",
      "src/pages/DiagramsPage.tsx",
      "src/components/FormatInspector.tsx",
      "src/components/ui/sidebar.tsx",
      "src/components/DrakonViewer.tsx",
      "src/pages/EditorPage.tsx",
      "src/routeTree.gen.ts",
      "src/pages/LoginPage.tsx"
    ]
  },
  "plannedDiagrams": [
    {
      "name": "auth-flow",
      "description": "Authentication flow detected from login/logout/auth-related functions and modules.",
      "scope": "flow",
      "estimatedComplexity": "medium"
    },
    {
      "name": "api-client-flow",
      "description": "API client interaction flow based on exported API methods and dependency graph.",
      "scope": "flow",
      "estimatedComplexity": "medium"
    },
    {
      "name": "state-management-flow",
      "description": "State management flow inferred from store/slice patterns (Zustand/Redux/Jotai style).",
      "scope": "flow",
      "estimatedComplexity": "medium"
    },
    {
      "name": "ProtectedRoute-flow",
      "description": "UI interaction flow centered around component ProtectedRoute.",
      "scope": "flow",
      "estimatedComplexity": "medium"
    },
    {
      "name": "AppRouter-flow",
      "description": "UI interaction flow centered around component AppRouter.",
      "scope": "flow",
      "estimatedComplexity": "medium"
    },
    {
      "name": "EditorRouteAdapter-flow",
      "description": "UI interaction flow centered around component EditorRouteAdapter.",
      "scope": "flow",
      "estimatedComplexity": "medium"
    },
    {
      "name": "DrakonEditor-flow",
      "description": "UI interaction flow centered around component DrakonEditor.",
      "scope": "flow",
      "estimatedComplexity": "high"
    },
    {
      "name": "NewDrakonDialog-flow",
      "description": "UI interaction flow centered around component NewDrakonDialog.",
      "scope": "flow",
      "estimatedComplexity": "high"
    },
    {
      "name": "DrakonViewer-flow",
      "description": "UI interaction flow centered around component DrakonViewer.",
      "scope": "flow",
      "estimatedComplexity": "high"
    }
  ]
};
