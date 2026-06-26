/**
 * migrate-projects-json.ts
 *
 * Reads projects.json (local fallback file) and migrates each project
 * into the Appwrite Cloud "projects" collection.
 *
 * Usage:
 *   npx tsx scripts/migrate-projects-json.ts
 *
 * Requires VITE_APPWRITE_DATABASE_ID and VITE_APPWRITE_PROJECTS_COLLECTION_ID
 * to be set in .env (or exported in the shell).
 */

import fs from "node:fs";
import path from "node:path";
import { Client, Databases, ID } from "appwrite";

// --- Config ---
const ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const PROJECT_ID = "6a23420a003a04b4997b";
const DB_ID = process.env.VITE_APPWRITE_DATABASE_ID ?? "";
const COLL_ID = process.env.VITE_APPWRITE_PROJECTS_COLLECTION_ID ?? "";

if (!DB_ID || !COLL_ID) {
  console.error("❌  Set VITE_APPWRITE_DATABASE_ID and VITE_APPWRITE_PROJECTS_COLLECTION_ID in .env");
  process.exit(1);
}

// --- Appwrite client (server-side, no session) ---
const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
const databases = new Databases(client);

// --- Load projects.json ---
const jsonPath = path.resolve(process.cwd(), "projects.json");

if (!fs.existsSync(jsonPath)) {
  console.log("ℹ️  projects.json not found — nothing to migrate.");
  process.exit(0);
}

interface LegacyProject {
  slug: string;
  name: string;
  mode?: string;
  description?: string;
  githubOwner?: string;
  githubRepo?: string;
  githubBranch?: string;
  runtimeTarget?: string;
  createdAt?: string;
  updatedAt?: string;
}

const raw = fs.readFileSync(jsonPath, "utf-8");
const projects: LegacyProject[] = JSON.parse(raw);

console.log(`📦  Found ${projects.length} project(s) in projects.json`);

let created = 0;
let skipped = 0;

for (const p of projects) {
  const now = new Date().toISOString();
  const doc = {
    slug: p.slug,
    name: p.name ?? p.slug,
    mode: p.mode ?? "agent",
    description: p.description ?? "",
    githubOwner: p.githubOwner ?? "",
    githubRepo: p.githubRepo ?? "",
    githubBranch: p.githubBranch ?? "main",
    runtimeTarget: p.runtimeTarget ?? "flue",
    createdAt: p.createdAt ?? now,
    updatedAt: p.updatedAt ?? now,
  };

  try {
    await databases.createDocument(DB_ID, COLL_ID, ID.unique(), doc);
    console.log(`  ✅ ${doc.slug}`);
    created++;
  } catch (err: any) {
    console.warn(`  ⚠️  ${doc.slug}: ${err.message ?? err}`);
    skipped++;
  }
}

console.log(`\n🏁  Done — created: ${created}, skipped/errors: ${skipped}`);
