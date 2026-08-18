import { useBlocker } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEffect } from "react";

interface UnsavedChangesGuardProps {
  isDirty: boolean;
}

export function UnsavedChangesGuard({ isDirty }: UnsavedChangesGuardProps) {
  const blocker = useBlocker({
    shouldBlockFn: () => isDirty,
    withResolver: true,
  });

  // Enable beforeunload to guard browser tab closing/reload
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "У вас є незбережені зміни. Ви впевнені, що хочете вийти?";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  return (
    <AlertDialog open={blocker.status === "blocked"}>
      <AlertDialogContent className="astryx-migrated border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)]">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-mono text-sm uppercase tracking-wider text-[var(--accent-amber)]">
            Незбережені зміни
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-[var(--text-secondary)]">
            У вас є незбережені зміни. Якщо ви залишите сторінку, їх буде втрачено. Ви впевнені, що хочете продовжити?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel
            onClick={() => blocker.reset?.()}
            className="border-[var(--border-default)] bg-transparent text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-primary)] text-xs h-8"
          >
            Скасувати
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => blocker.proceed?.()}
            className="bg-red-500 text-white hover:bg-red-600 text-xs h-8"
          >
            Залишити сторінку
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
