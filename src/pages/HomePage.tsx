import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Bot, FileText, Building2, Shield, RefreshCw } from "lucide-react";
import { resolveWorkerUrl } from "@/lib/worker-url";
import { AgentStatusCard } from "@/components/agents/AgentStatusCard";

export function HomePage() {
  const workerUrl = resolveWorkerUrl().replace(/\/+$/, "");

  const agents = [
    {
      name: "DRAKON Agent",
      healthUrl: `${workerUrl}/v1/agents/drakon/health`,
      route: "/diagrams",
      icon: Bot,
      description: "Diagram drawing and flowchart visualizer assistant",
    },
    {
      name: "Docs Agent",
      healthUrl: `${workerUrl}/v1/agents/docs/health`,
      route: "/workspace",
      icon: FileText,
      description: "Documentation crawler, reader, and writing assistant",
    },
    {
      name: "Architect Agent",
      healthUrl: `${workerUrl}/v1/agents/architect/health`,
      route: "/architect",
      icon: Building2,
      description: "Pipeline blueprint architect and infrastructure assistant",
    },
  ];

  return (
    <div className="astryx-migrated flex flex-col">
      {/* Decorative background grid and blob effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.04)_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative z-10">
        <div className="max-w-5xl w-full space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold tracking-wide border border-primary/20">
              <Shield className="w-3.5 h-3.5" />
              AI-DRAKON Dashboard
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground/80">
              Agent Status Overview
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Monitor real-time system health status and navigate between autonomous agents configured in your workspace.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-4">
            {agents.map((agent) => (
              <AgentStatusCard
                key={agent.name}
                name={agent.name}
                healthUrl={agent.healthUrl}
                route={agent.route}
                description={agent.description}
              />
            ))}
          </div>

          {/* Quick Stats / Worker indicator */}
          <div className="mt-8 p-4 rounded-xl bg-card/30 backdrop-blur-sm border border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-muted-foreground">
                Connected to Worker: <span className="font-mono text-foreground font-medium">{workerUrl}</span>
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Last sync: <span className="font-mono">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
