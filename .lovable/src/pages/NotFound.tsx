import { Link } from "react-router-dom";

export function NotFound() {
return (
<div className="flex min-h-screen items-center justify-center bg-[var(--astryx-surface-page)] text-[var(--astryx-text-primary)] px-4 text-center" data-testid="not-found-page">
<div>
<h1 className="text-3xl font-semibold text-foreground">404</h1>
<p className="mt-2 text-sm text-[var(--astryx-text-secondary)]">Page not found.</p>
<Link
className="astryx-button ghost md mt-4"
data-variant="ghost"
data-size="md"
data-testid="not-found-diagrams-cta"
to="/diagrams"
>
Перейти до схем
</Link>
</div>
</div>
);
}

