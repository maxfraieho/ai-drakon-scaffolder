import { useState } from "react";
import { NodePropertiesForm } from "./NodePropertiesForm";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, Sliders } from "lucide-react";

interface PropertiesPanelProps {
  diagramName: string;
  onChangeDiagramName: (val: string) => void;
  stateClass: string;
  onChangeStateClass: (val: string) => void;
  selectedNodeId: string | null;
  selectedNode: any;
  onUpdateNode: (id: string, updated: any) => void;
  allNodes: Array<{ id: string; name: string }>;
  breakpoints: string[];
  onToggleBreakpoint: (nodeName: string) => void;
}

export function PropertiesPanel({
  diagramName,
  onChangeDiagramName,
  stateClass,
  onChangeStateClass,
  selectedNodeId,
  selectedNode,
  onUpdateNode,
  allNodes,
  breakpoints,
  onToggleBreakpoint,
}: PropertiesPanelProps) {
  return (
    <div
      className="flex flex-col h-full border-l w-[320px] shrink-0 overflow-y-auto"
      style={{
        backgroundColor: "var(--bg-base)",
        borderColor: "var(--border-subtle)",
        color: "var(--text-primary)",
      }}
    >
      <div className="flex h-8 shrink-0 items-center justify-between border-b px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Інспектор властивостей</span>
        <Sliders className="h-3 w-3" />
      </div>

      <div className="flex-1 p-3 overflow-y-auto">
        {selectedNodeId && selectedNode ? (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold flex items-center gap-1">
              <span>Редагування вузла</span>
            </h3>
            <NodePropertiesForm
              nodeId={selectedNodeId}
              node={selectedNode}
              onUpdateNode={onUpdateNode}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-xs font-semibold flex items-center gap-1.5 border-b pb-1.5">
                <Settings className="h-3.5 w-3.5" />
                <span>Глобальні параметри</span>
              </h3>

              <div className="space-y-1.5">
                <Label htmlFor="diagram-name" className="text-[10px] font-mono uppercase text-muted-foreground">
                  Назва пайплайну
                </Label>
                <Input
                  id="diagram-name"
                  value={diagramName}
                  onChange={(e) => onChangeDiagramName(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="state-class" className="text-[10px] font-mono uppercase text-muted-foreground">
                  Клас стану (State Class)
                </Label>
                <Select value={stateClass} onValueChange={onChangeStateClass}>
                  <SelectTrigger id="state-class" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AnalysisState">Аналіз коду (AnalysisState)</SelectItem>
                    <SelectItem value="VibeCodingState">Vibe-кодинг (VibeCodingState)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold border-b pb-1.5">
                <span>Точки зупинки (Breakpoints)</span>
              </h3>
              {allNodes.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">
                  Додайте хоча б один вузол на схему, щоб встановити брейкпоінт.
                </p>
              ) : (
                <div className="space-y-2">
                  {allNodes.map((n) => {
                    const isChecked = breakpoints.includes(n.name);
                    return (
                      <div key={n.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`bp-${n.id}`}
                          checked={isChecked}
                          onCheckedChange={() => onToggleBreakpoint(n.name)}
                        />
                        <label
                          htmlFor={`bp-${n.id}`}
                          className="text-xs font-mono cursor-pointer select-none truncate text-muted-foreground hover:text-foreground"
                        >
                          {n.name}
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
