import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Bot, FileText, Building2, Shield, RefreshCw } from "lucide-react";
import { resolveWorkerUrl } from "@/lib/worker-url";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

interface Props {
  name: string;
  healthUrl: string;
  route: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

function AgentCard({ name, healthUrl, route, icon: Icon, description }: Props) {
  const [status, setStatus] = useState<"online" | "offline" | "checking">("checking");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus("checking");

    const checkHealth = async () => {
      try {
        const resp = await fetch(healthUrl, {
          signal: AbortSignal.timeout(4000),
        });
        if (!active) return;
        setStatus(resp.ok ? "online" : "offline");
      } catch (err) {
        if (!active) return;
        setStatus("offline");
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 20000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [healthUrl, retryCount]);

  const handleManualRefresh = () => {
    setRetryCount((prev) => prev + 1);
  };

  return (
    <Card className="relative overflow-hidden border-border bg-card/50 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 group">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground duration-300">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold tracking-tight">{name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleManualRefresh} 
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors hover:text-foreground"
            title="Refresh status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${status === "checking" ? "animate-spin text-amber-500" : ""}`} />
          </button>
          <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-full border border-border/40">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                status === "online"
                  ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                  : status === "offline"
                  ? "bg-rose-500 shadow-sm shadow-rose-500/50"
                  : "bg-amber-400 animate-pulse shadow-sm shadow-amber-400/50"
              }`}
            />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {status}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 pb-2">
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="text-muted-foreground flex items-center justify-between">
            <span>Last Route:</span>
            <Link
              to={route}
              className="text-primary hover:underline font-mono text-xs transition-colors duration-200"
            >
              {route}
            </Link>
          </div>
          <div className="text-muted-foreground flex items-center justify-between">
            <span>Health Endpoint:</span>
            <span className="font-mono text-[10px] truncate max-w-[180px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground border border-border/30" title={healthUrl}>
              {healthUrl.replace(/https?:\/\/[^\/]+/, "")}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-4 pb-6">
        <Link to={route} className="w-full">
          <Button className="w-full font-medium transition-all group-hover:bg-primary group-hover:text-primary-foreground duration-300">
            Open Agent Console
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

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
      route: "/docs",
      icon: FileText,
      description: "Documentation crawler, reader, and writing assistant",
    },
    {
      name: "Architect Agent",
      healthUrl: `${workerUrl}/v1/agents/architect/health`,
      route: "/pipelines",
      icon: Building2,
      description: "Pipeline blueprint architect and infrastructure assistant",
    },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-background text-foreground">
      {/* Decorative background grid and blob effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
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
              <AgentCard
                key={agent.name}
                name={agent.name}
                healthUrl={agent.healthUrl}
                route={agent.route}
                icon={agent.icon}
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
