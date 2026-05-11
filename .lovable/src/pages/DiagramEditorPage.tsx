import { Link, useSearch } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { DrakonEditor } from "@/components/DrakonEditor";
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
    <div
      className="flex flex-col bg-background text-foreground"
      style={{ height: "100dvh" }}
    >
      <div
        className="flex flex-shrink-0 items-center gap-3 border-b border-border p-3 md:p-4"
        style={{ touchAction: "manipulation" }}
      >
        <Link to="/diagrams">
          <Button variant="ghost" size="sm" style={{ touchAction: "manipulation" }}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="truncate text-base font-semibold md:text-lg">
          {isNew ? "New Diagram" : `Edit: ${diagramId}`}
        </h1>
      </div>
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col p-2 md:p-4">
          <DrakonEditor
            diagramId={diagramId}
            folderSlug={folderId}
            isNew={isNew}
            height="100%"
            className="flex min-h-0 flex-1 flex-col"
            onSaved={() => {}}
          />
        </div>
      </main>
    </div>
  );
}
