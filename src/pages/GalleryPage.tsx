import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, Search, Eye, Filter, Loader2, Workflow } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Mock data for MVP
const MOCK_GALLERY = [
  {
    id: "uuid-1",
    title: "E-Commerce Checkout Pipeline",
    author: "vokov",
    likes: 128,
    views: 1024,
    tags: ["commerce", "payment", "pipeline"],
    date: "2026-06-25",
  },
  {
    id: "uuid-2",
    title: "User Onboarding Flow",
    author: "maxfraieho",
    likes: 85,
    views: 450,
    tags: ["auth", "ux", "onboarding"],
    date: "2026-06-28",
  },
  {
    id: "uuid-3",
    title: "AI RAG Document Processing",
    author: "ai-drakon",
    likes: 342,
    views: 2100,
    tags: ["ai", "rag", "langchain"],
    date: "2026-06-29",
  }
];

export default function GalleryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState(MOCK_GALLERY);

  // Filter logic
  const filtered = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="astryx-migrated min-h-screen bg-[var(--astryx-surface-page)] text-[var(--astryx-text-primary)] p-8" data-testid="gallery-page">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--astryx-color-brand)]">
            Community Gallery
          </h1>
          <p className="text-sm text-[var(--astryx-text-secondary)] mt-1">
            Discover, fork, and learn from DRAKON pipelines created by the community.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--astryx-text-muted)]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pipelines or tags..."
              className="pl-9 bg-[var(--astryx-surface-secondary)] border-[var(--astryx-border-subtle)] focus-visible:ring-[var(--astryx-border-focus)]/50 text-[var(--astryx-text-primary)] h-10 w-full rounded-[var(--astryx-radius-md)]"
            />
          </div>
          <button className="astryx-button ghost md" data-variant="ghost" data-size="md" data-testid="gallery-filters-button">
            <Filter className="h-4 w-4" />
            <span className="hidden md:inline">Filters</span>
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--astryx-color-brand)]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(item => (
            <div key={item.id} className="group relative rounded-[var(--astryx-radius-lg)] border border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-primary)] p-5 transition-all hover:border-[var(--astryx-color-brand)]" data-variant="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--astryx-color-brand-light)] text-[var(--astryx-color-brand)] group-hover:scale-110 transition-transform">
                  <Workflow className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-3 text-sm text-[var(--astryx-text-secondary)]">
                  <span className="flex items-center gap-1 hover:text-rose-400 cursor-pointer transition-colors">
                    <Heart className="h-4 w-4" /> {item.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" /> {item.views}
                  </span>
                </div>
              </div>
              
              <Link to="/s/$slug" params={{ slug: item.id }} className="block mb-2">
                <h3 className="font-semibold text-lg font-[Outfit] text-[var(--astryx-text-primary)] group-hover:text-[var(--astryx-color-brand)] transition-colors line-clamp-1">
                  {item.title}
                </h3>
              </Link>
              
              <p className="text-xs text-[var(--astryx-text-muted)] mb-4">
                by <span className="font-medium text-[var(--astryx-text-secondary)]">@{item.author}</span> • {new Date(item.date).toLocaleDateString()}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {item.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="astryx-badge primary font-mono text-[10px]" data-variant="primary">
                    #{tag}
                  </Badge>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-[var(--astryx-border-subtle)] flex justify-between items-center">
                <Link
                  to="/s/$slug"
                  params={{ slug: item.id }}
                  className="text-sm font-medium text-[var(--astryx-color-brand)] hover:underline transition-colors"
                >
                  View full screen →
                </Link>
                <button className="astryx-button ghost sm" data-variant="ghost" data-size="sm" data-testid={`gallery-fork-${item.id}`}>
                  Fork Pipeline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {filtered.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-full bg-[var(--astryx-surface-secondary)] flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-[var(--astryx-text-muted)]" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No pipelines found</h3>
          <p className="text-[var(--astryx-text-muted)] max-w-sm">
            We couldn't find any community pipelines matching your search criteria.
          </p>
          <button 
            onClick={() => setSearchQuery("")}
            className="astryx-button ghost md mt-6"
            data-variant="ghost"
            data-size="md"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
