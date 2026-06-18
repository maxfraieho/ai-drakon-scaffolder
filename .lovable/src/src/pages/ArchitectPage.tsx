import { PatternSuggestionPanel } from "@/components/architect/PatternSuggestionPanel";
import { Building2 } from "lucide-react";

export function ArchitectPage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold flex items-center gap-2">
        <Building2 className="w-6 h-6 text-indigo-400" /> Architect
      </h1>
      <PatternSuggestionPanel />
    </div>
  );
}
