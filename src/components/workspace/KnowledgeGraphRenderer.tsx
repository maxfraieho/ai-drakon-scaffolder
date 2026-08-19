import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { KnowledgeGraph, GraphNode, GraphEdge, NodeType } from "@/lib/understand/types";

/* ── colour palette by node type ── */
const NODE_COLORS: Record<NodeType, string> = {
  file: "#06b6d4",       // cyan
  function: "#f59e0b",   // amber
  class: "#8b5cf6",      // violet
  module: "#10b981",     // emerald
  concept: "#ec4899",    // pink
  config: "#6b7280",     // gray
  document: "#3b82f6",   // blue
  service: "#ef4444",    // red
  table: "#14b8a6",      // teal
  endpoint: "#f97316",   // orange
  pipeline: "#a855f7",   // purple
  schema: "#22d3ee",     // cyan-light
  resource: "#84cc16",   // lime
  domain: "#e11d48",     // rose
  flow: "#0ea5e9",       // sky
  step: "#78716c",       // stone
  article: "#2563eb",    // blue-dark
  entity: "#7c3aed",     // violet-dark
  topic: "#db2777",      // pink-dark
  claim: "#ea580c",      // orange-dark
  source: "#65a30d",     // lime-dark
};

const DEFAULT_COLOR = "#6b7280";
const EDGE_COLOR = "rgba(255,255,255,0.12)";
const EDGE_HIGHLIGHT = "rgba(245,158,11,0.5)";

/* ── force simulation types ── */
interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  node: GraphNode;
  radius: number;
}

interface SimEdge {
  source: string;
  target: string;
  edge: GraphEdge;
}

/* ── helpers ── */
function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function nodeRadius(node: GraphNode): number {
  if (node.complexity === "complex") return 18;
  if (node.complexity === "moderate") return 14;
  return 10;
}

/* ── component ── */
interface KnowledgeGraphRendererProps {
  graph: KnowledgeGraph;
  searchQuery?: string;
  selectedLayerId?: string | null;
  onNodeClick?: (node: GraphNode) => void;
}

export function KnowledgeGraphRenderer({
  graph,
  searchQuery = "",
  selectedLayerId = null,
  onNodeClick,
}: KnowledgeGraphRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number>(0);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });

  /* viewBox state for pan/zoom */
  const [viewBox, setViewBox] = useState({ x: -400, y: -300, w: 800, h: 600 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });

  /* ── filter nodes by layer & search ── */
  const visibleNodeIds = useMemo(() => {
    const ids = new Set<string>();
    const queryWords = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);

    for (const node of graph.nodes) {
      // Layer filter
      if (selectedLayerId) {
        const layer = graph.layers.find((l) => l.id === selectedLayerId);
        if (layer && !layer.nodeIds.includes(node.id)) continue;
      }

      // Search filter
      if (queryWords.length > 0) {
        const text = `${node.name} ${node.summary} ${node.tags.join(" ")}`.toLowerCase();
        const match = queryWords.some((w) => text.includes(w));
        if (!match) continue;
      }

      ids.add(node.id);
    }
    return ids;
  }, [graph, searchQuery, selectedLayerId]);

  /* ── simulation nodes ── */
  const simNodesRef = useRef<SimNode[]>([]);
  const simEdgesRef = useRef<SimEdge[]>([]);
  const [renderTick, setRenderTick] = useState(0);

  /* Initialize simulation */
  useEffect(() => {
    const angle = (2 * Math.PI) / Math.max(graph.nodes.length, 1);
    const spread = Math.min(dimensions.w, dimensions.h) * 0.35;

    simNodesRef.current = graph.nodes.map((n, i) => ({
      id: n.id,
      x: Math.cos(angle * i) * spread + (Math.random() - 0.5) * 40,
      y: Math.sin(angle * i) * spread + (Math.random() - 0.5) * 40,
      vx: 0,
      vy: 0,
      node: n,
      radius: nodeRadius(n),
    }));

    simEdgesRef.current = graph.edges.map((e) => ({
      source: e.source,
      target: e.target,
      edge: e,
    }));

    setViewBox({ x: -dimensions.w / 2, y: -dimensions.h / 2, w: dimensions.w, h: dimensions.h });
  }, [graph, dimensions]);

  /* Force simulation loop */
  useEffect(() => {
    const nodes = simNodesRef.current;
    const edges = simEdgesRef.current;
    if (nodes.length === 0) return;

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    let alpha = 1;
    let frame = 0;

    function tick() {
      alpha *= 0.992;
      if (alpha < 0.005 || frame > 600) {
        return; // settled
      }

      /* repulsion (all pairs — simplified for <500 nodes) */
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          let dx = nodes[j].x - nodes[i].x;
          let dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (alpha * 3000) / (dist * dist);
          dx = (dx / dist) * force;
          dy = (dy / dist) * force;
          nodes[i].vx -= dx;
          nodes[i].vy -= dy;
          nodes[j].vx += dx;
          nodes[j].vy += dy;
        }
      }

      /* attraction (edges) */
      for (const e of edges) {
        const s = nodeMap.get(e.source);
        const t = nodeMap.get(e.target);
        if (!s || !t) continue;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 120) * 0.006 * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        s.vx += fx;
        s.vy += fy;
        t.vx -= fx;
        t.vy -= fy;
      }

      /* center gravity */
      for (const n of nodes) {
        n.vx -= n.x * 0.001 * alpha;
        n.vy -= n.y * 0.001 * alpha;
      }

      /* velocity damping & position update */
      for (const n of nodes) {
        n.vx *= 0.6;
        n.vy *= 0.6;
        n.x += n.vx;
        n.y += n.vy;
      }

      frame++;
      setRenderTick((t) => t + 1);
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [graph]);

  /* Resize observer */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ w: width, h: height });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── zoom handler ── */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setViewBox((vb) => {
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const newW = vb.w * factor;
      const newH = vb.h * factor;
      const cx = vb.x + vb.w / 2;
      const cy = vb.y + vb.h / 2;
      return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
    });
  }, []);

  /* ── pan handlers ── */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as SVGElement).tagName === "circle") return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y };
  }, [viewBox]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const scale = viewBox.w / dimensions.w;
    const dx = (e.clientX - panStart.current.x) * scale;
    const dy = (e.clientY - panStart.current.y) * scale;
    setViewBox((vb) => ({ ...vb, x: panStart.current.vx - dx, y: panStart.current.vy - dy }));
  }, [viewBox.w, dimensions.w]);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  /* ── neighbours of selected/hovered ── */
  const highlightIds = useMemo(() => {
    const ids = new Set<string>();
    const focusId = hoveredId ?? selectedId;
    if (!focusId) return ids;
    ids.add(focusId);
    for (const e of graph.edges) {
      if (e.source === focusId) ids.add(e.target);
      if (e.target === focusId) ids.add(e.source);
    }
    return ids;
  }, [hoveredId, selectedId, graph.edges]);

  const focusActive = highlightIds.size > 0;
  const nodes = simNodesRef.current;
  const edges = simEdgesRef.current;
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes, renderTick]);

  return (
    <div ref={containerRef} className="astryx-migrated relative w-full h-full overflow-hidden bg-[var(--astryx-surface-page)]">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="cursor-grab active:cursor-grabbing"
        style={{ touchAction: "none" }}
      >
        <defs>
          <marker id="kg-arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,0.25)" />
          </marker>
          <marker id="kg-arrowhead-hl" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="rgba(245,158,11,0.7)" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((e, i) => {
          const s = nodeMap.get(e.source);
          const t = nodeMap.get(e.target);
          if (!s || !t) return null;
          if (!visibleNodeIds.has(e.source) || !visibleNodeIds.has(e.target)) return null;

          const isHl = highlightIds.has(e.source) && highlightIds.has(e.target);
          const dimmed = focusActive && !isHl;

          return (
            <line
              key={`e-${i}`}
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              stroke={isHl ? EDGE_HIGHLIGHT : EDGE_COLOR}
              strokeWidth={isHl ? 2 : 1}
              opacity={dimmed ? 0.08 : 1}
              markerEnd={isHl ? "url(#kg-arrowhead-hl)" : "url(#kg-arrowhead)"}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          if (!visibleNodeIds.has(n.id)) return null;

          const isHl = highlightIds.has(n.id);
          const dimmed = focusActive && !isHl;
          const isSelected = n.id === selectedId;
          const color = NODE_COLORS[n.node.type] ?? DEFAULT_COLOR;

          return (
            <g
              key={n.id}
              style={{ cursor: "pointer", transition: "opacity 0.2s" }}
              opacity={dimmed ? 0.15 : 1}
              onMouseEnter={() => setHoveredId(n.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(n.id === selectedId ? null : n.id);
                onNodeClick?.(n.node);
              }}
            >
              <circle
                cx={n.x}
                cy={n.y}
                r={n.radius}
                fill={color}
                fillOpacity={0.85}
                stroke={isSelected ? "var(--astryx-color-brand)" : "rgba(255,255,255,0.15)"}
                strokeWidth={isSelected ? 3 : 1}
              />
              <text
                x={n.x}
                y={n.y + n.radius + 12}
                textAnchor="middle"
                fill="rgba(255,255,255,0.7)"
                fontSize={9}
                fontFamily="monospace"
                pointerEvents="none"
              >
                {n.node.name.length > 20 ? n.node.name.slice(0, 18) + "…" : n.node.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      {hoveredId && (() => {
        const n = nodeMap.get(hoveredId);
        if (!n) return null;
        return (
          <div
            className="absolute top-3 right-3 max-w-[280px] bg-[var(--astryx-surface-elevated)] backdrop-blur-sm border border-[var(--astryx-border-subtle)] rounded-lg p-3 pointer-events-none z-10 shadow-lg"
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: NODE_COLORS[n.node.type] ?? DEFAULT_COLOR }}
              />
              <span className="text-[11px] font-mono font-semibold text-[var(--astryx-text-primary)] truncate">
                {n.node.name}
              </span>
              <span className="text-[9px] font-mono text-[var(--astryx-text-secondary)] uppercase ml-auto">
                {n.node.type}
              </span>
            </div>
            <p className="text-[10px] text-[var(--astryx-text-secondary)] leading-relaxed">{n.node.summary}</p>
            {n.node.filePath && (
              <p className="text-[9px] text-[var(--astryx-text-muted)] mt-1 font-mono truncate">
                📄 {n.node.filePath}
              </p>
            )}
            {n.node.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {n.node.tags.slice(0, 5).map((t) => (
                  <span key={t} className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--astryx-surface-secondary)] text-[var(--astryx-text-secondary)] font-mono">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
