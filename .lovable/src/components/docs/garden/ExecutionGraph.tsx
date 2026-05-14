import { useEffect, useRef } from "react";
import type { GraphNode, GraphEdge } from "@/lib/garden/graphTypes";

interface ExecutionGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (slug: string) => void;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * Lightweight Canvas force-directed graph.
 * No external dependencies. Suitable for ~hundreds of nodes.
 */
export function ExecutionGraph({ nodes, edges, onNodeClick }: ExecutionGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const simRef = useRef<SimNode[]>([]);
  const hoverRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // Initialize simulation nodes
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const simNodes: SimNode[] = nodes.map((n, i) => {
      const angle = (i / Math.max(1, nodes.length)) * Math.PI * 2;
      const r = Math.min(w, h) * 0.3;
      return {
        ...n,
        x: w / 2 + Math.cos(angle) * r,
        y: h / 2 + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
      };
    });
    simRef.current = simNodes;
    const indexBySlug = new Map(simNodes.map((n, i) => [n.slug, i]));

    const linkDist = 90;
    const repulsion = 1400;
    const centerStrength = 0.01;
    const damping = 0.85;

    let iterations = 0;
    const maxIterations = 600;

    const step = () => {
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;

      // Repulsion (O(n^2))
      for (let i = 0; i < simNodes.length; i++) {
        const a = simNodes[i];
        for (let j = i + 1; j < simNodes.length; j++) {
          const b = simNodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) d2 = 1;
          const f = repulsion / d2;
          const d = Math.sqrt(d2);
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      // Spring (edges)
      for (const e of edges) {
        const ai = indexBySlug.get(e.source);
        const bi = indexBySlug.get(e.target);
        if (ai === undefined || bi === undefined) continue;
        const a = simNodes[ai];
        const b = simNodes[bi];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const diff = (d - linkDist) * 0.05;
        const fx = (dx / d) * diff;
        const fy = (dy / d) * diff;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // Center gravity + integrate
      for (const n of simNodes) {
        n.vx += (W / 2 - n.x) * centerStrength;
        n.vy += (H / 2 - n.y) * centerStrength;
        n.vx *= damping;
        n.vy *= damping;
        n.x += n.vx;
        n.y += n.vy;
        // Bounds
        n.x = Math.max(20, Math.min(W - 20, n.x));
        n.y = Math.max(20, Math.min(H - 20, n.y));
      }

      draw();
      iterations++;
      if (iterations < maxIterations) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Edges
      ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
      ctx.lineWidth = 1;
      for (const e of edges) {
        const ai = indexBySlug.get(e.source);
        const bi = indexBySlug.get(e.target);
        if (ai === undefined || bi === undefined) continue;
        const a = simNodes[ai];
        const b = simNodes[bi];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Nodes
      const hover = hoverRef.current;
      for (const n of simNodes) {
        const isHover = hover === n.slug;
        const r = isHover ? 8 : 6;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isHover ? "rgb(245, 158, 11)" : "rgb(99, 102, 241)";
        ctx.fill();
        ctx.strokeStyle = "rgba(15, 23, 42, 0.6)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (isHover) {
          ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
          ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
          const text = n.title;
          const tw = ctx.measureText(text).width;
          ctx.fillRect(n.x + 10, n.y - 18, tw + 8, 18);
          ctx.fillStyle = "white";
          ctx.fillText(text, n.x + 14, n.y - 5);
        }
      }
    };

    rafRef.current = requestAnimationFrame(step);

    const pick = (mx: number, my: number): SimNode | null => {
      for (let i = simNodes.length - 1; i >= 0; i--) {
        const n = simNodes[i];
        const dx = n.x - mx;
        const dy = n.y - my;
        if (dx * dx + dy * dy <= 100) return n;
      }
      return null;
    };

    const onMove = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      const n = pick(mx, my);
      const newHover = n?.slug ?? null;
      if (newHover !== hoverRef.current) {
        hoverRef.current = newHover;
        canvas.style.cursor = newHover ? "pointer" : "default";
        draw();
      }
    };

    const onClick = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      const n = pick(mx, my);
      if (n && onNodeClick) onNodeClick(n.slug);
    };

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("click", onClick);

    return () => {
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("click", onClick);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [nodes, edges, onNodeClick]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-md border border-border bg-muted/10">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
