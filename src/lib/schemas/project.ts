import { z } from "zod";

export const ProjectMode = z.enum(["agent", "playpipe", "n8n"]);
export const RuntimeTarget = z.enum(["flue", "eve"]);

const ProjectBaseSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(200),
  mode: ProjectMode,
  description: z.string().max(1000).nullable().optional(),
  githubOwner: z.string().max(100).nullable().optional(),
  githubRepo: z.string().max(100).nullable().optional(),
  githubBranch: z.string().max(50).nullable().optional().default("main"),
  runtimeTarget: RuntimeTarget.nullable().optional().default("flue"),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const ProjectSchema = ProjectBaseSchema.transform((data: any) => ({
  ...data,
  description: data.description ?? "",
  githubOwner: data.githubOwner ?? "",
  githubRepo: data.githubRepo ?? "",
  githubBranch: data.githubBranch ?? "main",
  runtimeTarget: data.runtimeTarget ?? "flue",
  createdAt: data.createdAt || data.$createdAt || new Date().toISOString(),
  updatedAt: data.updatedAt || data.$updatedAt || new Date().toISOString(),
}));

export const CreateProjectInput = ProjectBaseSchema.omit({
  createdAt: true,
  updatedAt: true,
});

export type Project = z.infer<typeof ProjectSchema>;
export type CreateProjectInputType = z.infer<typeof CreateProjectInput>;
