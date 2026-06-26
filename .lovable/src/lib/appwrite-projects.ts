import { databases } from "@/lib/appwrite";
import { Query, ID } from "appwrite";
import { ProjectSchema, CreateProjectInput } from "./schemas/project";
import type { Project, CreateProjectInputType } from "./schemas/project";

const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID ?? "";
const COLL_ID = import.meta.env.VITE_APPWRITE_PROJECTS_COLLECTION_ID ?? "";

export async function getProjects(): Promise<Project[]> {
  const res = await databases.listDocuments(DB_ID, COLL_ID, [
    Query.orderDesc("updatedAt"),
    Query.limit(100),
  ]);
  return res.documents.map(doc => ProjectSchema.parse(doc));
}

export async function getProject(slug: string): Promise<Project> {
  const res = await databases.listDocuments(DB_ID, COLL_ID, [
    Query.equal("slug", slug),
    Query.limit(1),
  ]);
  if (!res.documents.length) throw new Error(`Project "${slug}" not found`);
  return ProjectSchema.parse(res.documents[0]);
}

export async function createProject(data: CreateProjectInputType): Promise<Project> {
  const now = new Date().toISOString();
  const parsed = CreateProjectInput.parse(data);
  const doc = await databases.createDocument(DB_ID, COLL_ID, ID.unique(), {
    ...parsed,
    createdAt: now,
    updatedAt: now,
  });
  return ProjectSchema.parse(doc);
}

export async function updateProject(slug: string, data: Partial<Project>): Promise<Project> {
  const existing = await getProject(slug);
  const doc = await databases.updateDocument(
    DB_ID, COLL_ID,
    (existing as any).$id,
    { ...data, updatedAt: new Date().toISOString() }
  );
  return ProjectSchema.parse(doc);
}
