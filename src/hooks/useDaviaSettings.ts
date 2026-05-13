import { useCallback, useState } from "react";

export interface DaviaSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  outputVersion: string;
}

export const DEFAULT_DAVIA_SETTINGS: DaviaSettings = {
  baseUrl: "https://claude2.exodus.pp.ua/v1",
  apiKey: "sk-2e690b95180b8cf8619c5661eb2908ccad5fd907c0a4f3fa0248e842c7d62e8e",
  model: "free/standard-proxy",
  maxTokens: 3000,
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
        /* ignore */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DAVIA_SETTINGS));
    } catch {
      /* ignore */
    }
    setSettings(DEFAULT_DAVIA_SETTINGS);
  }, []);

  return { settings, save, reset };
}

export function generateVersionName(model: string, maxTokens: number): string {
  const slug = model.replace(/^free\//, "").replace(/-proxy$/, "") || "model";
  return `${slug}-${maxTokens}`;
}
