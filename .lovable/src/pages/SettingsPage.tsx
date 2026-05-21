import { useState, useEffect } from "react";
import { readSettings, writeSettings } from "@/lib/settings-storage";
import type { AppSettings } from "@/types/settings";

type SectionKey = "project" | "agents" | "github" | "app" | "infrastructure";

const SECTIONS: { key: SectionKey; label: string; icon: string }[] = [
  { key: "project", label: "Проект", icon: "folder_open" },
  { key: "agents", label: "Агенти", icon: "smart_toy" },
  { key: "github", label: "GitHub", icon: "code" },
  { key: "app", label: "Застосунок", icon: "settings" },
  { key: "infrastructure", label: "Інфраструктура", icon: "dns" },
];

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--color-on-surface-variant)]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-2.5 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
      />
      {hint && <p className="text-xs text-[var(--color-on-surface-variant)]">{hint}</p>}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--color-on-surface-variant)]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-2 text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-on-surface)]">{title}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(readSettings);
  const [activeSection, setActiveSection] = useState<SectionKey>("project");
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof AppSettings>(section: K, patch: Partial<AppSettings[K]>) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...patch },
    }));
    setSaved(false);
  };

  const save = () => {
    writeSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex h-full gap-0 overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-44 shrink-0 flex-col border-r border-[var(--color-outline-variant)] bg-[var(--color-surface)]">
        <div className="px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            Налаштування
          </p>
        </div>
        <nav className="flex flex-col gap-0.5 px-2">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                activeSection === s.key
                  ? "bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]"
                  : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex flex-1 flex-col overflow-auto bg-[var(--color-surface-container-lowest)]">
        <div className="flex items-center justify-between border-b border-[var(--color-outline-variant)] bg-[var(--color-surface)] px-6 py-3">
          <h2 className="text-base font-semibold text-[var(--color-on-surface)]">
            {SECTIONS.find((s) => s.key === activeSection)?.label}
          </h2>
          <button
            onClick={save}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              saved
                ? "bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)]"
                : "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:opacity-90"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{saved ? "check" : "save"}</span>
            {saved ? "Збережено" : "Зберегти"}
          </button>
        </div>

        <div className="flex flex-col gap-4 p-6">
          {/* PROJECT */}
          {activeSection === "project" && (
            <>
              <Card title="Активний проект">
                <Field
                  label="Назва проекту"
                  value={settings.project.name}
                  onChange={(v) => update("project", { name: v })}
                  placeholder="sharon-global"
                />
                <Field
                  label="GitHub Owner"
                  value={settings.project.githubOwner}
                  onChange={(v) => update("project", { githubOwner: v })}
                  placeholder="maxfraieho"
                />
                <Field
                  label="GitHub Репозиторій"
                  value={settings.project.githubRepo}
                  onChange={(v) => update("project", { githubRepo: v })}
                  placeholder="sharon-global"
                />
                <Field
                  label="GitHub Гілка"
                  value={settings.project.githubBranch}
                  onChange={(v) => update("project", { githubBranch: v })}
                  placeholder="main"
                />
              </Card>
              <Card title="Шлях на сервері">
                <Field
                  label="REPO_ROOT (шлях до проекту на сервері)"
                  value={settings.project.repoRoot}
                  onChange={(v) => update("project", { repoRoot: v })}
                  placeholder="/home/vokov/workspace/sharon-global"
                  hint="Агенти читають і записують документи в docs/ цього шляху. Потрібен перезапуск агентів після зміни."
                />
              </Card>
            </>
          )}

          {/* AGENTS */}
          {activeSection === "agents" && (
            <>
              <Card title="URL агентів (через Worker)">
                <Field
                  label="DRAKON Agent URL"
                  value={settings.agents.drakonUrl}
                  onChange={(v) => update("agents", { drakonUrl: v })}
                  placeholder="https://drakon-agent.exodus.pp.ua"
                />
                <Field
                  label="Architect Agent URL"
                  value={settings.agents.architectUrl}
                  onChange={(v) => update("agents", { architectUrl: v })}
                  placeholder="https://architect-agent.exodus.pp.ua"
                />
                <Field
                  label="Docs Agent URL"
                  value={settings.agents.docsUrl}
                  onChange={(v) => update("agents", { docsUrl: v })}
                  placeholder="https://docs-agent.exodus.pp.ua"
                />
              </Card>
              <Card title="LLM Proxy">
                <Select
                  label="Модель (proxy slot)"
                  value={settings.agents.proxyModel}
                  onChange={(v) => update("agents", { proxyModel: v })}
                  options={[
                    { value: "fast-proxy", label: "fast-proxy — Llama 8B (швидко)" },
                    { value: "claude-haiku-4-5", label: "claude-haiku-4-5 — Anthropic (якість UA)" },
                    { value: "cheap-proxy", label: "cheap-proxy — 2-4B (економно)" },
                  ]}
                />
                <Select
                  label="Протокол"
                  value={settings.agents.proxyProtocol}
                  onChange={(v) => update("agents", { proxyProtocol: v as "openai" | "anthropic" })}
                  options={[
                    { value: "openai", label: "OpenAI (port 18880) — tool calling" },
                    { value: "anthropic", label: "Anthropic (port 8082) — краща якість" },
                  ]}
                />
                <p className="rounded bg-[var(--color-surface-container)] p-2 text-xs text-[var(--color-on-surface-variant)]">
                  Поточно: docs-agent використовує Anthropic + claude-haiku-4-5 (port 8082). 
                  Architect та DRAKON — OpenAI + fast-proxy (port 18880) для tool calling.
                </p>
              </Card>
            </>
          )}

          {/* GITHUB */}
          {activeSection === "github" && (
            <Card title="GitHub (для WorkerAPI та commits)">
              <Field
                label="Owner"
                value={settings.github.owner}
                onChange={(v) => update("github", { owner: v })}
              />
              <Field
                label="Repository"
                value={settings.github.repo}
                onChange={(v) => update("github", { repo: v })}
              />
              <Field
                label="Branch"
                value={settings.github.branch}
                onChange={(v) => update("github", { branch: v })}
              />
              <Field
                label="Personal Access Token"
                value={settings.github.token}
                onChange={(v) => update("github", { token: v })}
                type="password"
                placeholder="github_pat_..."
              />
            </Card>
          )}

          {/* APP */}
          {activeSection === "app" && (
            <>
              <Card title="Worker">
                <Field
                  label="Worker URL"
                  value={settings.app.workerUrl}
                  onChange={(v) => update("app", { workerUrl: v })}
                  placeholder="https://drakon-mcp-worker.maxfraieho.workers.dev"
                />
              </Card>
              <Card title="Вигляд">
                <Select
                  label="Тема"
                  value={settings.app.theme}
                  onChange={(v) => update("app", { theme: v as "light" | "dark" | "system" })}
                  options={[
                    { value: "system", label: "Системна" },
                    { value: "light", label: "Світла" },
                    { value: "dark", label: "Темна" },
                  ]}
                />
                <Field
                  label="Тека за замовчуванням"
                  value={settings.app.defaultFolder}
                  onChange={(v) => update("app", { defaultFolder: v })}
                />
              </Card>
            </>
          )}

          {/* INFRASTRUCTURE */}
          {activeSection === "infrastructure" && (
            <>
              <Card title="MinIO (S3-compatible storage)">
                <Field
                  label="Endpoint"
                  value={settings.minio.endpoint}
                  onChange={(v) => update("minio", { endpoint: v })}
                  placeholder="apiminio.exodus.pp.ua"
                />
                <Field
                  label="Bucket"
                  value={settings.minio.bucket}
                  onChange={(v) => update("minio", { bucket: v })}
                  placeholder="drakon"
                />
                <Field
                  label="Access Key"
                  value={settings.minio.accessKey}
                  onChange={(v) => update("minio", { accessKey: v })}
                  type="password"
                />
              </Card>
              <Card title="n8n Automation">
                <Field
                  label="Base URL"
                  value={settings.n8n.baseUrl}
                  onChange={(v) => update("n8n", { baseUrl: v })}
                  placeholder="https://n8n.exodus.pp.ua"
                />
                <Field
                  label="API Key"
                  value={settings.n8n.apiKey}
                  onChange={(v) => update("n8n", { apiKey: v })}
                  type="password"
                />
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
