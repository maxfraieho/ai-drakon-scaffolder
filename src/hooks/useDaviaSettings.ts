import { useCallback, useState } from "react";

export interface DaviaSettings {
protocol: "openai" | "anthropic";
baseUrl: string;
apiKey: string;
model: string;
maxTokens: number;
outputVersion: string;
}

export const DEFAULT_DAVIA_SETTINGS: DaviaSettings = {
protocol: "openai",
baseUrl: "https://openai-proxy.exodus.pp.ua/v1",
apiKey: "freecc",
model: "docs-assistant-proxy",
maxTokens: 6000,
outputVersion: "",
};

const STORAGE_KEY = "daviaSettings";

function readInitial(): DaviaSettings {
if (typeof window === "undefined") return DEFAULT_DAVIA_SETTINGS;
try {
const raw = localStorage.getItem(STORAGE_KEY);
if (!raw) return DEFAULT_DAVIA_SETTINGS;
const parsed = JSON.parse(raw) as Partial<DaviaSettings>;
return { ...DEFAULT_DAVIA_SETTINGS, ...parsed };
} catch {
return DEFAULT_DAVIA_SETTINGS;
}
}

export function useDaviaSettings() {
const [settings, setSettings] = useState<DaviaSettings>(readInitial);

const save = useCallback((updates: Partial<DaviaSettings>) => {
setSettings((prev) => {
const next = { ...prev, ...updates };
try {
localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
} catch {
/ ignore /
}
return next;
});
}, []);

const reset = useCallback(() => {
try {
localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DAVIA_SETTINGS));
} catch {
/ ignore /
}
setSettings(DEFAULT_DAVIA_SETTINGS);
}, []);

return { settings, save, reset };
}

export function generateVersionName(model: string, maxTokens: number): string {
const slug = model.replace(/^free\//, "").replace(/-proxy$/, "") || "model";
return `${slug}-${maxTokens}`;
}
