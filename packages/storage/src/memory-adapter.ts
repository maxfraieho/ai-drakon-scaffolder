// packages/storage/src/memory-adapter.ts
//
// In-memory BlobStore implementation for unit tests and local development.
// Not persisted, not shared across isolates -- test/dev use only.

import type { BlobStore } from "./types.js";

export class MemoryBlobStoreAdapter implements BlobStore {
  private store = new Map<string, { data: string; contentType?: string }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    return entry ? entry.data : null;
  }

  async put(key: string, data: string | Uint8Array, contentType?: string): Promise<void> {
    const text = typeof data === "string" ? data : new TextDecoder().decode(data);
    this.store.set(key, { data: text, contentType });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) keys.push(key);
    }
    return keys.sort();
  }

  /** Test helper only -- not part of the BlobStore contract. */
  clear(): void {
    this.store.clear();
  }
}
