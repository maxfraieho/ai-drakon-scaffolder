import { Link, useSearch } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { DrakonEditor } from "@/components/drakon/DrakonEditor";
import { Button } from "@/components/ui/button";

export default function DiagramEditorPage() {
  const search = useSearch({ strict: false }) as {
    diagramId?: string;
    folderId?: string;
    isNew?: string;
  };

  const diagramId = search.diagramId || "";
  const folderId = search.folderId || "general";
  const isNew = search.isNew === "true";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <Link to="/diagrams">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">{isNew ? "New Diagram" : `Edit: ${diagramId}`}</h1>
      </div>
      <main className="flex-1 p-4">
        <DrakonEditor
          diagramId={diagramId}
          folderSlug={folderId}
          isNew={isNew}
          height={600}
          onSaved={() => {
          }}
        />
      </main>
    </div>
  );
}
