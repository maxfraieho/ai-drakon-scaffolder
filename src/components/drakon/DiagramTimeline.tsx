import { useState } from "react";
import { History, RotateCcw, Clock, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { uk } from "date-fns/locale";
import type { DiagramVersion } from "@/lib/drakon/history";

interface TimelineProps {
  diagram: any;
  versions: DiagramVersion[];
  onRestore: (versionId: string) => void;
  onCompare: (versionId: string | null) => void;
  diffVersionId: string | null;
}

export function DiagramTimeline({ 
  diagram, 
  versions, 
  onRestore, 
  onCompare, 
  diffVersionId 
}: TimelineProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!diagram) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40">
      <div className="flex flex-col items-center">
        {isOpen && (
          <div className="mb-4 w-96 bg-slate-900/95 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between p-3 border-b border-slate-700/50 bg-slate-800/50">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-400" />
                <span className="text-sm font-medium text-slate-200">Історія змін</span>
              </div>
              <span className="text-xs text-slate-500">Автозбереження кожні 30с</span>
            </div>
            
            <div className="max-h-64 overflow-y-auto p-2 space-y-1">
              {versions.length === 0 && (
                <div className="text-xs text-slate-500 text-center py-4">Немає збережених версій</div>
              )}
              {versions.map((version, idx) => (
                <div 
                  key={version.id}
                  className={`flex items-center justify-between p-2 rounded-lg hover:bg-white/5 group transition-colors ${
                    diffVersionId === version.id ? "bg-indigo-500/10 border border-indigo-500/20" : ""
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-300">
                        {idx === 0 ? "Остання версія" : `Версія ${versions.length - idx}`}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatDistanceToNow(new Date(version.timestamp), { addSuffix: true, locale: uk })}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 mt-0.5">{version.changes}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className={`h-7 w-7 transition-opacity ${
                        diffVersionId === version.id 
                          ? "opacity-100 text-indigo-400 bg-indigo-500/20" 
                          : "opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10"
                      }`}
                      onClick={() => onCompare(diffVersionId === version.id ? null : version.id)}
                      title={diffVersionId === version.id ? "Вимкнути порівняння" : "Порівняти з поточною версією"}
                    >
                      <GitCompare className="h-3.5 w-3.5" />
                    </Button>

                    {idx !== 0 && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20"
                        onClick={() => onRestore(version.id)}
                        title="Відновити цю версію"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white shadow-lg backdrop-blur-sm rounded-full px-4 h-9"
        >
          <Clock className="h-4 w-4 mr-2 text-indigo-400" />
          {isOpen ? "Сховати історію" : "Історія змін (Time Travel)"}
        </Button>
      </div>
    </div>
  );
}
