export type Folder = { id: string; name: string; slug: string };

export const FOLDERS_STORAGE_KEY = "drakon.folders";
export const DEFAULT_FOLDER: Folder = { id: "general", name: "Загальні", slug: "general" };

export function slugifyFolderName(name: string) {
return name
.trim()
.toLowerCase()
.replace(/\s+/g, "-")
.replace(/[^a-z0-9а-яіїєґ-]/gi, "")
.replace(/-+/g, "-");
}

export function readFoldersFromStorage(): Folder[] {
if (typeof window === "undefined") return [DEFAULT_FOLDER];
try {
const raw = localStorage.getItem(FOLDERS_STORAGE_KEY);
if (!raw) return [DEFAULT_FOLDER];

const parsed = JSON.parse(raw) as Folder[];
if (!Array.isArray(parsed) || parsed.length === 0) return [DEFAULT_FOLDER];

const hasGeneral = parsed.some((folder) => folder.slug === DEFAULT_FOLDER.slug);
return hasGeneral ? parsed : [DEFAULT_FOLDER, ...parsed];
} catch {
return [DEFAULT_FOLDER];
}
}

export function writeFoldersToStorage(folders: Folder[]) {
if (typeof window === "undefined") return;
localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
}

