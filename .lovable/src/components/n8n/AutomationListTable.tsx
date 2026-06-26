import { CalendarDays, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type AutomationListItem = {
  name: string;
  nodeCount: number;
  status: "pushed" | "local";
  dateLabel: string;
};

interface AutomationListTableProps {
  items: AutomationListItem[];
  loading: boolean;
  error?: string | null;
  onCreateNew: () => void;
  onOpenAutomation: (name: string) => void;
}

export function AutomationListTable({
  items,
  loading,
  error,
  onCreateNew,
  onOpenAutomation,
}: AutomationListTableProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/45 p-4 backdrop-blur-xl md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">N8N Automations</h1>
          <p className="mt-1 text-sm text-slate-300">Saved workflow diagrams and deployment status.</p>
        </div>

        <Button
          onClick={onCreateNew}
          className="bg-indigo-600 text-white shadow-[0_0_24px_rgba(99,102,241,0.35)] hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          New Automation
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-slate-300">Name</TableHead>
              <TableHead className="text-slate-300">Node count</TableHead>
              <TableHead className="text-slate-300">N8N status</TableHead>
              <TableHead className="text-slate-300">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableCell colSpan={4} className="py-8 text-center text-slate-300">
                  Loading automations...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableCell colSpan={4} className="py-8 text-center text-rose-300">
                  {error}
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableCell colSpan={4} className="py-8 text-center text-slate-300">
                  No automations yet. Create your first one.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.name}
                  className="cursor-pointer border-white/10 hover:bg-white/5"
                  onClick={() => onOpenAutomation(item.name)}
                >
                  <TableCell className="font-medium text-slate-100">{item.name}</TableCell>
                  <TableCell className="text-slate-200">{item.nodeCount}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        item.status === "pushed"
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                          : "border-amber-400/30 bg-amber-500/10 text-amber-200"
                      }
                    >
                      {item.status === "pushed" ? "Pushed" : "Local"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {item.dateLabel}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
