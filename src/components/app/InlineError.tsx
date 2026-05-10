import { Button } from "@/components/ui/button";

type InlineErrorProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function InlineError({
  title = "Something went wrong",
  message = "Please try again.",
  onRetry,
}: InlineErrorProps) {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button className="mt-3" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
