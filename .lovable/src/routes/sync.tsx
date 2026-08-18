import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";

function SyncPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8 bg-[var(--astryx-surface-page)] text-[var(--astryx-text-primary)]" data-testid="sync-page">
      <RefreshCw className="h-12 w-12 text-[var(--astryx-color-brand)] opacity-40" />
      <h2 className="text-xl font-semibold">Синхронізація</h2>
      <p className="text-sm text-[var(--astryx-text-secondary)] max-w-sm">
        Функція синхронізації репозиторію ще не реалізована. Вона з’явиться після
        готовності backend-контракту.
      </p>
    </div>
  );
}

export const Route = createFileRoute("/sync")({
  component: SyncPage,
});
