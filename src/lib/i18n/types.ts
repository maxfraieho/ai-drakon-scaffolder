export interface Translations {
drakon: {
copy: string;
cut: string;
paste: string;
delete: string;
editContent: string;
swapYesNo: string;
addParameters: string;
insertBranchWithEnd: string;
insertBranch: string;
insertBranchLeft: string;
insertBranchRight: string;
insertCase: string;
insertCaseLeft: string;
insertCaseRight: string;
addPath: string;
addPathLeft: string;
addPathRight: string;
addVertex: string;
addRemoveVertex: string;
sendToBack: string;
bringToFront: string;
deletePath: string;
editUpperText: string;
editLink: string;
goToBranch: string;
increaseMargin: string;
resetMargin: string;
flip: string;
format: string;
diagramFormat: string;
changeImage: string;
yes: string;
no: string;
end: string;
exit: string;
branch: string;
editSecondaryText: string;
};
drakonEditor: Record<string, string>;
editor?: {
save?: string;
cancel?: string;
};
}
---
### types/analysis.ts
**Розмір:** 1,746 байт


export type AnalysisTaskType = "text-to-diagram" | "code-snippet" | "codebase-analysis";

export type AnalysisTask = {
type: AnalysisTaskType;
};

export type CodebaseAnalysisRequest = {
projectName: string;
sourceType: "text-paste" | "zip-upload" | "git-url";
sourceContent: string;
language: "typescript" | "javascript" | "python" | "go" | "auto";
analysisDepth: "overview" | "modules" | "flows" | "procedures";
entryPaths: string[];
includeGlobs: string[];
excludeGlobs: string[];
};

export type AnalysisSummary = {
totalFiles: number;
totalFunctions: number;
totalComponents: number;
modules: string[];
detectedFlows: string[];
functions?: Array<{ name: string; filePath: string; params: string[]; returnType?: string;
isExported: boolean }>;
components?: Array<{ name: string; filePath: string; hasProps: boolean }>;
hooks?: Array<{ name: string; filePath: string }>;
stores?: Array<{ name: string; filePath: string }>;
apiClients?: Array<{ name: string; filePath: string; methods: string[] }>;
classes?: Array<{ name: string; filePath: string; methods: string[] }>;
importGraph?: Record<string, string[]>;
leafModules?: string[];
hubModules?: string[];
};

export type AnalyzerConfig = {
projectRoot: string;
entryPaths: string[];
includeGlobs: string[];
excludeGlobs: string[];
};

export type PlannedDiagram = {
name: string;
description: string;
scope: "module" | "flow" | "procedure";
estimatedComplexity: "low" | "medium" | "high";
};

export type AnalysisJob = {
jobId: string;
status: "pending" | "analyzing" | "completed" | "failed";
projectName: string;
createdAt: string;
summary?: AnalysisSummary;
plannedDiagrams?: PlannedDiagram[];
error?: string;
};

