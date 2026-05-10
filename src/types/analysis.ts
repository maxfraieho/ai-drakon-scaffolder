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
  functions?: Array<{ name: string; filePath: string; params: string[]; returnType?: string; isExported: boolean }>;
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