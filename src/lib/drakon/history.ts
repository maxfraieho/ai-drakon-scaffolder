export interface DiagramVersion {
  id: string; // uuid
  diagramId: string;
  timestamp: number;
  author: string;
  changes: string;
  diagramData: any; // The raw diagram JSON
}

const DB_NAME = "DrakonHistoryDB";
const STORE_NAME = "versions";

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("diagramId", "diagramId", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDiagramVersion(
  diagramId: string, 
  diagramData: any, 
  changes: string = "Auto-save"
): Promise<DiagramVersion> {
  const db = await getDB();
  const version: DiagramVersion = {
    id: crypto.randomUUID(),
    diagramId,
    timestamp: Date.now(),
    author: "local_user",
    changes,
    diagramData: JSON.parse(JSON.stringify(diagramData)) // Deep copy
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(version);

    request.onsuccess = () => resolve(version);
    request.onerror = () => reject(request.error);
  });
}

export async function getDiagramVersions(diagramId: string): Promise<DiagramVersion[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("diagramId");
    const request = index.getAll(IDBKeyRange.only(diagramId));

    request.onsuccess = () => {
      // Sort by timestamp descending (newest first)
      const results = request.result.sort((a, b) => b.timestamp - a.timestamp);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearDiagramHistory(diagramId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("diagramId");
  
  return new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only(diagramId));
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}
