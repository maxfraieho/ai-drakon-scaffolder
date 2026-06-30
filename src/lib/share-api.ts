import { api } from "./api";
import { resolveWorkerUrl } from "./worker-url";

export async function createShareLink(data: { ir: any; title: string }): Promise<string> {
  // If the worker supports it
  try {
    const response = await fetch(`${resolveWorkerUrl()}/v1/shares`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.shortId) return result.shortId;
    }
  } catch (e) {
    console.warn("Worker share failed, falling back to local storage sharing for demo purposes", e);
  }

  // Fallback: Generate a pseudo-random 6-char ID and save to localStorage
  // This simulates the KV store for the frontend demo
  const shortId = Math.random().toString(36).substring(2, 8);
  
  if (typeof window !== "undefined") {
    const shares = JSON.parse(localStorage.getItem("drakon.shares") || "{}");
    shares[shortId] = data;
    localStorage.setItem("drakon.shares", JSON.stringify(shares));
  }

  return shortId;
}

export async function getSharedDiagram(shortId: string): Promise<{ ir: any; title: string } | null> {
  try {
    const response = await fetch(`${resolveWorkerUrl()}/v1/shares/${encodeURIComponent(shortId)}`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (e) {
    console.warn("Worker share fetch failed", e);
  }

  // Fallback
  if (typeof window !== "undefined") {
    const shares = JSON.parse(localStorage.getItem("drakon.shares") || "{}");
    return shares[shortId] || null;
  }
  
  return null;
}
