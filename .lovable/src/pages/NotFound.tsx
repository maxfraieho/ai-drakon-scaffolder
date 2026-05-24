import { Link } from "react-router-dom";

export function NotFound() {
return (
<div className="flex min-h-screen items-center justify-center bg-background px-4
text-center">
<div>
<h1 className="text-3xl font-semibold text-foreground">404</h1>
<p className="mt-2 text-sm text-muted-foreground">Page not found.</p>
<Link
className="mt-4 inline-flex rounded-md border border-input bg-background px-3 py-2 text-sm
text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
to="/diagrams"
>
Перейти до схем
</Link>
</div>
</div>
);
}

