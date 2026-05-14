interface WikiLinkProps {
  slug: string;
  alias?: string;
  onNavigate?: (slug: string) => void;
}

export function WikiLink({ slug, alias, onNavigate }: WikiLinkProps) {
  const label = alias ?? slug.split("/").pop() ?? slug;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onNavigate?.(slug);
      }}
      className="text-[var(--accent-amber)] underline decoration-dotted underline-offset-2 hover:text-[var(--accent-amber)]/80"
    >
      {label}
    </button>
  );
}
