/**
      • Canonical IR — проміжний формат між code analysis / LLM і drakonwidget.js editor.
      • Відрізняється від DrakonDiagram (editor format) тим, що:
      • - не містить координат
      • - строго типізований через Zod
      • - є єдиним контрактом для AI pipeline
*/

import { z } from "zod";

import type { IrDiagram } from "./ir-types";

export const IrItemTypeSchema = z.enum([
"action",
"question",
"select",
"case",
"header",
"end",
"address",
"branch",
"insertion",
"input",
"output",
"shelf",
"process",
"timer",
"duration",
]);

export const IrItemSchema = z.object({
type: IrItemTypeSchema,
content: z.string(),
secondary: z.string().optional(),
one: z.string().optional(),
two: z.string().optional(),
side: z.string().optional(),
flag1: z.boolean().optional(),
branchId: z.string().optional(),
style: z.record(z.string(), z.unknown()).optional(),
});

export const IrDiagramSchema = z.object({
name: z.string(),
access: z.enum(["public", "private"]),
params: z.array(z.string()),
items: z.record(z.string(), IrItemSchema),
});

export function validateIrPayload(payload: unknown): { success: boolean; data?: IrDiagram;
error?: string } {
const parsed = IrDiagramSchema.safeParse(payload);

if (!parsed.success) {
return {
success: false,
error: parsed.error.issues.map((issue) => issue.message).join("; "),
};
}

return { success: true, data: parsed.data };
}

