/**
 * Understand-Anything core types for AI-DRAKON integration.
 * Standalone — no external dependency needed.
 * Based on @understand-anything/core v0.1.0 types.ts
 */

// Node types (21 total)
export type NodeType =
  | "file" | "function" | "class" | "module" | "concept"
  | "config" | "document" | "service" | "table" | "endpoint"
  | "pipeline" | "schema" | "resource"
  | "domain" | "flow" | "step"
  | "article" | "entity" | "topic" | "claim" | "source";

// Edge types (35 total)
export type EdgeType =
  | "imports" | "exports" | "contains" | "inherits" | "implements"
  | "calls" | "subscribes" | "publishes" | "middleware"
  | "reads_from" | "writes_to" | "transforms" | "validates"
  | "depends_on" | "tested_by" | "configures"
  | "related" | "similar_to"
  | "deploys" | "serves" | "provisions" | "triggers"
  | "migrates" | "documents" | "routes" | "defines_schema"
  | "contains_flow" | "flow_step" | "cross_domain"
  | "cites" | "contradicts" | "builds_on" | "exemplifies" | "categorized_under" | "authored_by";

export interface GraphNode {
  id: string;
  type: NodeType;
  name: string;
  filePath?: string;
  lineRange?: [number, number];
  summary: string;
  tags: string[];
  complexity: "simple" | "moderate" | "complex";
  languageNotes?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
  direction: "forward" | "backward" | "bidirectional";
  description?: string;
  weight: number;
}

export interface Layer {
  id: string;
  name: string;
  description: string;
  nodeIds: string[];
}

export interface TourStep {
  order: number;
  title: string;
  description: string;
  nodeIds: string[];
  languageLesson?: string;
}

export interface ProjectMeta {
  name: string;
  languages: string[];
  frameworks: string[];
  description: string;
  analyzedAt: string;
  gitCommitHash: string;
}

export interface KnowledgeGraph {
  version: string;
  kind?: "codebase" | "knowledge";
  project: ProjectMeta;
  nodes: GraphNode[];
  edges: GraphEdge[];
  layers: Layer[];
  tour: TourStep[];
}
