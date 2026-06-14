# Lovable Prompt 10 — MinIO Tab in Settings

**Priority: MEDIUM — adds MinIO storage configuration UI**

## Context

The Cloudflare Worker (`drakon-mcp-worker`) supports MinIO S3-compatible storage.
Worker `/health` endpoint already returns `storage: { endpoint, bucket, ssl }`.
This prompt adds a UI tab to view and configure MinIO settings.

## Files to modify

- `src/types/settings.ts` — add `minio` to `AppSettings`
- `src/lib/settings-storage.ts` — add defaults + `getMinioConfig()`
- `src/routes/settings.tsx` — add MinIO tab

---

## Step 1 — src/types/settings.ts

Add `minio` field to `AppSettings`:

```ts
export type AppSettings = {
  github: { owner: string; repo: string; branch: string; token: string };
  n8n: { baseUrl: string; apiKey: string; webhookUrl: string; enabled: boolean };
  app: { workerUrl: string; defaultFolder: string; theme: "light" | "dark" | "system" };
  minio: {
    endpoint: string;
    bucket: string;
    accessKey: string;
  };
};
```

---

## Step 2 — src/lib/settings-storage.ts

Add to `DEFAULT_SETTINGS`:
```ts
minio: { endpoint: "", bucket: "", accessKey: "" },
```

In `readSettings()` return block, add:
```ts
minio: {
  endpoint: isObject(parsed) && isObject((parsed as any).minio) && typeof (parsed as any).minio.endpoint === "string"
    ? (parsed as any).minio.endpoint : "",
  bucket: isObject(parsed) && isObject((parsed as any).minio) && typeof (parsed as any).minio.bucket === "string"
    ? (parsed as any).minio.bucket : "",
  accessKey: isObject(parsed) && isObject((parsed as any).minio) && typeof (parsed as any).minio.accessKey === "string"
    ? (parsed as any).minio.accessKey : "",
},
```

Add export function after `getN8nConfig`:
```ts
export function getMinioConfig(): AppSettings["minio"] {
  return readSettings().minio;
}
```

---

## Step 3 — src/routes/settings.tsx

### 3a. State variables (add after `isCheckingN8n`):
```tsx
const [isLoadingMinio, setIsLoadingMinio] = useState(false);
const [minioStatus, setMinioStatus] = useState<ConnectionStatus>({ type: "idle", text: "Не перевірено" });
```

### 3b. Add `fetchWorkerHealth` function (add after `verifyN8n`):
```tsx
const fetchWorkerHealth = async () => {
  setIsLoadingMinio(true);
  setMinioStatus({ type: "idle", text: "Завантажую..." });
  try {
    const workerUrl = (settings.app.workerUrl || "https://drakon-antigravity-worker.maxfraieho.workers.dev").replace(/\/$/, "");
    const resp = await fetch(`${workerUrl}/health`);
    const data = await resp.json() as { storage?: { endpoint?: string; bucket?: string } };
    if (data.storage?.endpoint && data.storage.endpoint !== "not configured") {
      updateSettings(prev => ({
        ...prev,
        minio: {
          ...prev.minio,
          endpoint: data.storage!.endpoint ?? prev.minio.endpoint,
          bucket: data.storage?.bucket && data.storage.bucket !== "not configured"
            ? data.storage.bucket
            : prev.minio.bucket,
        },
      }));
      setMinioStatus({ type: "success", text: "Дані отримано з Worker" });
    } else {
      setMinioStatus({ type: "idle", text: "MinIO не налаштовано у Worker" });
    }
  } catch {
    setMinioStatus({ type: "error", text: "Не вдалося підключитись до Worker" });
  } finally {
    setIsLoadingMinio(false);
  }
};
```

### 3c. TabsList — change `grid-cols-3` to `grid-cols-4`:
```tsx
<TabsList className="grid w-full grid-cols-4">
  <TabsTrigger value="github">GitHub</TabsTrigger>
  <TabsTrigger value="n8n">n8n</TabsTrigger>
  <TabsTrigger value="minio">MinIO</TabsTrigger>
  <TabsTrigger value="app">Додаток</TabsTrigger>
</TabsList>
```

### 3d. Add TabsContent after n8n block (before `app` TabsContent):
```tsx
<TabsContent value="minio">
  <Card>
    <CardHeader>
      <CardTitle>MinIO Storage</CardTitle>
      <CardDescription>
        S3-сумісне сховище для діаграм. Параметри зберігаються локально для довідки.
        Для зміни конфігурації — оновіть secrets у Cloudflare Workers Dashboard.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="minio-endpoint">Endpoint</Label>
        <Input
          id="minio-endpoint"
          value={settings.minio?.endpoint || ""}
          onChange={(e) =>
            updateSettings((prev) => ({ ...prev, minio: { ...prev.minio, endpoint: e.target.value } }))
          }
          placeholder="https://your-minio-host"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="minio-bucket">Bucket</Label>
        <Input
          id="minio-bucket"
          value={settings.minio?.bucket || ""}
          onChange={(e) =>
            updateSettings((prev) => ({ ...prev, minio: { ...prev.minio, bucket: e.target.value } }))
          }
          placeholder="drakon-diagrams"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="minio-access-key">Access Key</Label>
        <Input
          id="minio-access-key"
          value={settings.minio?.accessKey || ""}
          onChange={(e) =>
            updateSettings((prev) => ({ ...prev, minio: { ...prev.minio, accessKey: e.target.value } }))
          }
          placeholder="minioadmin"
        />
      </div>
      <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        Secret Key та повна конфігурація зберігаються у{" "}
        <a
          href="https://dash.cloudflare.com"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline"
        >
          Cloudflare Workers Dashboard
        </a>
        {" "}→ drakon-mcp-worker → Settings → Variables and Secrets.
        Access Key тут — лише для довідки.
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={fetchWorkerHealth}
          disabled={isLoadingMinio}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {isLoadingMinio ? "Завантажую..." : "Завантажити з Worker"}
        </Button>
        {statusBadge(minioStatus)}
      </div>
    </CardContent>
  </Card>
</TabsContent>
```

## DO NOT change
- GitHub, n8n, Додаток tabs
- api.ts, store/, lib/htse/
- drakonwidget.js
- Worker files
