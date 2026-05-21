export type DiagramLevel = "L0" | "L1" | "L2" | "L3";

export type DiagramSourceType = "human" | "ai" | "hybrid";

export interface DiagramMetadata {
diagramLevel?: DiagramLevel;
sourceType?: DiagramSourceType;
repoId?: string;
branch?: string;
commitSha?: string;
filePaths?: string[];
symbolRefs?: string[];
parentDiagramId?: string;
childDiagramIds?: string[];
analysisJobId?: string;
confidenceScore?: number;
reviewedByHuman?: boolean;
}

export function withDiagramMetadataDefaults(metadata?: DiagramMetadata): DiagramMetadata
{
return {
sourceType: metadata?.sourceType ?? "human",
diagramLevel: metadata?.diagramLevel,
repoId: metadata?.repoId,
branch: metadata?.branch,
commitSha: metadata?.commitSha,
filePaths: Array.isArray(metadata?.filePaths) ? metadata.filePaths : [],
symbolRefs: Array.isArray(metadata?.symbolRefs) ? metadata.symbolRefs : [],
parentDiagramId: metadata?.parentDiagramId,
childDiagramIds: Array.isArray(metadata?.childDiagramIds) ? metadata.childDiagramIds : [],
analysisJobId: metadata?.analysisJobId,
confidenceScore: metadata?.confidenceScore,
reviewedByHuman: metadata?.reviewedByHuman,
};
}

