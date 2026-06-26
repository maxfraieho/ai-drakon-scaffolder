import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";

type ProjectSectionPlaceholderProps = {
  title: string;
  subtitle: string;
  chips?: string[];
  actions?: ReactNode;
  children?: ReactNode;
};

export function ProjectSectionPlaceholder({ title, subtitle, chips = [], actions, children }: ProjectSectionPlaceholderProps) {
  return (
    <div className="space-y-4">
      <Card className="border-white/10 bg-slate-900/45 shadow-[0_20px_60px_rgba(67,56,202,0.2)] backdrop-blur-xl">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-[Outfit] text-xs uppercase tracking-[0.2em] text-slate-400">Project section</p>
            <CardTitle className="mt-2 font-[Outfit] text-2xl text-slate-100">{title}</CardTitle>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">{subtitle}</p>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {chips.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <Badge key={chip} className="border-indigo-400/30 bg-indigo-500/10 text-indigo-200">
                  {chip}
                </Badge>
              ))}
            </div>
          ) : null}

          {children ? (
            children
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <Card className="border-white/10 bg-slate-950/50">
                <CardContent className="space-y-2 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Module A</p>
                  <p className="font-medium text-slate-100">Plan and configure</p>
                  <p className="text-sm text-slate-300">Define structure, set integrations, and prepare the next implementation step.</p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-slate-950/50">
                <CardContent className="space-y-2 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Module B</p>
                  <p className="font-medium text-slate-100">Track and operate</p>
                  <p className="text-sm text-slate-300">Monitor execution status, keep documentation updated, and iterate quickly.</p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button variant="outline" className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/10">
          Configure {title}
        </Button>
      </div>
    </div>
  );
}
