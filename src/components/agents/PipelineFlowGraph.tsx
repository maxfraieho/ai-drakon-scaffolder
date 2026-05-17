import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import {
  fetchPipeline,
  type NodeConfig,
  type PipelineConfig,
} from "@/lib/pipeline-config-api";

interface NodeData {
  label: string;
  description: string;
  isLlm: boolean;
  isDeterministic: boolean;
  type: string;
  selected: boolean;
  [key: string]: unknown;
}

function ActionNode({ data }: { data: NodeData }) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-[var(--color-outline)]"
      />
      <div
        className={cn(
          "flex min-w-[120px] flex-col gap-0.5 rounded border px-2.5 py-2 transition-all duration-150",
          data.selected
            ? "border-[var(--color-primary-container)] shadow-[0_0_0_2px_var(--color-primary-container)]"
            : "border-[var(--color-outline-variant)]",
          data.isLlm
            ? "bg-[color-mix(in_oklab,var(--color-secondary-container)_25%,transparent)]"
            : "bg-[var(--color-surface-container-low)]"
        )}
      >
        <span
          className={cn(
            "font-mono-code text-[11px]",
            data.isLlm
              ? "text-[var(--color-on-secondary-container)]"
              : "text-[var(--color-on-surface)]"
          )}
        >
          {data.label}
        </span>
        {data.isLlm && (
          <span className="font-mono-label text-[9px] uppercase text-[var(--color-secondary)]">
            LLM
          </span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-[var(--color-outline)]"
      />
    </>
  );
}

function DecisionNode({ data }: { data: NodeData }) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-[var(--color-outline)]"
      />
      <div
        className={cn(
          "flex min-w-[120px] flex-col gap-0.5 rounded border border-dashed px-2.5 py-2 transition-all duration-150",
          data.selected
            ? "border-[var(--color-primary-container)] shadow-[0_0_0_2px_var(--color-primary-container)]"
            : "border-[var(--color-tertiary)]",
          "bg-[color-mix(in_oklab,var(--color-tertiary-container)_20%,transparent)]"
        )}
      >
        <span className="font-mono-label text-[9px] uppercase text-[var(--color-tertiary)]">
          ◇ decision
        </span>
        <span className="font-mono-code text-[11px] text-[var(--color-on-surface)]">
          {data.label}
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        className="!bg-[var(--color-tertiary)]"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="no"
        className="!bg-[var(--color-outline)]"
      />
    </>
  );
}

function TerminatorNode({ data }: { data: NodeData }) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-[var(--color-outline)]"
      />
      <div
        className={cn(
          "flex min-w-[120px] flex-col gap-0.5 rounded-full border px-3 py-1.5 transition-all duration-150",
          data.selected
            ? "border-[var(--color-primary-container)] shadow-[0_0_0_2px_var(--color-primary-container)]"
            : "border-[var(--color-outline-variant)]",
          "bg-[var(--color-surface-container)]"
        )}
      >
        <span className="font-mono-code text-[11px] text-[var(--color-on-surface-variant)]">
          {data.label}
        </span>
      </div>
    </>
  );
}

const NODE_TYPES: NodeTypes = {
  action: ActionNode as never,
  decision: DecisionNode as never,
  loop_start: ActionNode as never,
  loop_end: ActionNode as never,
  terminator: TerminatorNode as never,
};

const NODE_W = 150;
const NODE_H = 56;
const H_GAP = 60;
const V_GAP = 80;

function layoutNodes(
  nodes: NodeConfig[],
  edges: Array<{ from_node: string; to_node: string }>
): Map<string, { x: number; y: number }> {
  const adj = new Map<string, string[]>();
  const inDeg = new Map<string, number>();
  for (const n of nodes) {
    adj.set(n.id, []);
    inDeg.set(n.id, 0);
  }
  for (const e of edges) {
    adj.get(e.from_node)?.push(e.to_node);
    inDeg.set(e.to_node, (inDeg.get(e.to_node) ?? 0) + 1);
  }
  const col = new Map<string, number>();
  const queue: string[] = [];
  for (const [id, deg] of inDeg) {
    if (deg === 0) queue.push(id);
  }
  while (queue.length) {
    const id = queue.shift()!;
    const c = col.get(id) ?? 0;
    for (const next of adj.get(id) ?? []) {
      col.set(next, Math.max(col.get(next) ?? 0, c + 1));
      inDeg.set(next, (inDeg.get(next) ?? 0) - 1);
      if (inDeg.get(next) === 0) queue.push(next);
    }
  }

  const cols = new Map<number, string[]>();
  for (const n of nodes) {
    const c = col.get(n.id) ?? 0;
    if (!cols.has(c)) cols.set(c, []);
    cols.get(c)!.push(n.id);
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const [c, ids] of cols) {
    ids.forEach((id, row) => {
      positions.set(id, {
        x: c * (NODE_W + H_GAP),
        y: row * (NODE_H + V_GAP),
      });
    });
  }
  return positions;
}

interface Props {
  pipelineId: string;
  selectedNodeId?: string | null;
  onNodeClick?: (nodeId: string) => void;
}

export function PipelineFlowGraph({
  pipelineId,
  selectedNodeId,
  onNodeClick,
}: Props) {
  const [config, setConfig] = useState<PipelineConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setConfig(null);
    setError(null);
    fetchPipeline(pipelineId)
      .then(setConfig)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Не вдалося завантажити пайплайн")
      );
  }, [pipelineId]);

  const { nodes, edges } = useMemo<{ nodes: Node[]; edges: Edge[] }>(() => {
    if (!config) return { nodes: [], edges: [] };

    const positions = layoutNodes(config.nodes, config.edges);
    const rfNodes: Node[] = config.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: positions.get(n.id) ?? { x: 0, y: 0 },
      data: {
        label: n.label,
        description: n.description,
        isLlm: n.is_llm,
        isDeterministic: n.is_deterministic,
        type: n.type,
        selected: n.id === selectedNodeId,
      },
    }));

    const rfEdges: Edge[] = config.edges.map((e, i) => ({
      id: `e-${i}`,
      source: e.from_node,
      target: e.to_node,
      sourceHandle: e.condition ?? undefined,
      label: e.condition ?? e.label ?? undefined,
      labelStyle: { fontFamily: "JetBrains Mono, monospace", fontSize: 10 },
      style: {
        stroke:
          e.condition === "yes"
            ? "var(--color-tertiary)"
            : "var(--color-outline-variant)",
        strokeWidth: 1.5,
      },
      animated: false,
    }));

    return { nodes: rfNodes, edges: rfEdges };
  }, [config, selectedNodeId]);

  if (error) {
    return (
      <div className="flex h-48 items-center justify-center rounded border border-[var(--color-outline-variant)] bg-[var(--color-surface)]">
        <span className="font-mono-label text-[var(--color-error)]">{error}</span>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex h-48 items-center justify-center rounded border border-[var(--color-outline-variant)] bg-[var(--color-surface)]">
        <span className="font-mono-label text-[var(--color-on-surface-variant)]">
          Завантаження…
        </span>
      </div>
    );
  }

  return (
    <div className="h-72 overflow-hidden rounded border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        onNodeClick={(_e, node) => onNodeClick?.(node.id)}
      >
        <Background color="var(--color-outline-variant)" gap={24} size={1} />
        <Controls
          showInteractive={false}
          className="!bg-[var(--color-surface)] !border-[var(--color-outline-variant)] !shadow-none"
        />
      </ReactFlow>
    </div>
  );
}