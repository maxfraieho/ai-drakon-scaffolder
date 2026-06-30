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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-[Outfit] tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Community Gallery
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Discover, fork, and learn from DRAKON pipelines created by the community.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pipelines or tags..."
              className="pl-9 bg-slate-900 border-slate-800 focus-visible:ring-indigo-500/50 h-10 w-full rounded-xl"
            />
          </div>
          <button className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm font-medium hover:bg-slate-800 transition-colors">
            <Filter className="h-4 w-4" />
            <span className="hidden md:inline">Filters</span>
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(item => (
            <div key={item.id} className="group relative rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-all hover:border-indigo-500/50 hover:bg-slate-900 hover:shadow-xl hover:shadow-indigo-500/10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                  <Workflow className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <span className="flex items-center gap-1 hover:text-rose-400 cursor-pointer transition-colors">
                    <Heart className="h-4 w-4" /> {item.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" /> {item.views}
                  </span>
                </div>
              </div>
              
              <Link to={`/s/${item.id}`} className="block mb-2">
                <h3 className="font-semibold text-lg font-[Outfit] text-slate-200 group-hover:text-indigo-300 transition-colors line-clamp-1">
                  {item.title}
                </h3>
              </Link>
              
              <p className="text-xs text-slate-500 mb-4">
                by <span className="font-medium text-slate-300">@{item.author}</span> • {new Date(item.date).toLocaleDateString()}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {item.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="bg-slate-800 text-slate-300 hover:bg-slate-700 font-mono text-[10px]">
                    #{tag}
                  </Badge>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-between items-center">
                <Link 
                  to={`/s/${item.id}`}
                  className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  View full screen →
                </Link>
                <button className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors">
                  Fork Pipeline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {filtered.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-full bg-slate-900 flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No pipelines found</h3>
          <p className="text-slate-500 max-w-sm">
            We couldn't find any community pipelines matching your search criteria.
          </p>
          <button 
            onClick={() => setSearchQuery("")}
            className="mt-6 text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
