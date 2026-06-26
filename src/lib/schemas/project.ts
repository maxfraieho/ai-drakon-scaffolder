import { z } from "zod";

export const ProjectMode = z.enum(["agent", "playpipe", "n8n"]);
export const RuntimeTarget = z.enum(["flue", "eve"]);

export const ProjectSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(200),
  mode: ProjectMode,
  description: z.string().max(1000).optional(),
  githubOwner: z.string().max(100).optional(),
  githubRepo: z.string().max(100).optional(),
  githubBranch: z.string().max(50).default("main"),
  runtimeTarget: RuntimeTarget.default("flue"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateProjectInput = ProjectSchema.omit({
  createdAt: true,
  updatedAt: true,
});

export type Project = z.infer<typeof ProjectSchema>;
export type CreateProjectInputType = z.infer<typeof CreateProjectInput>;
