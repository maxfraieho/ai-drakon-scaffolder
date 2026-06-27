import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";

function SyncPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <RefreshCw className="h-12 w-12 text-teal-400/40" />
      <h2 className="text-xl font-semibold text-white/80">Синхронізація</h2>
      <p className="text-sm text-white/40 max-w-sm">
        Функція синхронізації репозиторію буде доступна в наступному оновленні.
      </p>
    </div>
  );
}

export const Route = createFileRoute("/sync")({
  component: SyncPage,
});
