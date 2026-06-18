import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://aidrakon.tech";
const TODAY = new Date().toISOString().slice(0, 10);

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          // Public
          { path: "/",          lastmod: TODAY, changefreq: "weekly",  priority: "1.0" },
          { path: "/login",     lastmod: TODAY, changefreq: "monthly", priority: "0.8" },
          // App sections
          { path: "/pipelines", lastmod: TODAY, changefreq: "weekly",  priority: "0.7" },
          { path: "/diagrams",  lastmod: TODAY, changefreq: "weekly",  priority: "0.7" },
          { path: "/knowledge", lastmod: TODAY, changefreq: "weekly",  priority: "0.7" },
          { path: "/notebooks", lastmod: TODAY, changefreq: "weekly",  priority: "0.6" },
          { path: "/agents",    lastmod: TODAY, changefreq: "weekly",  priority: "0.6" },
          { path: "/code",      lastmod: TODAY, changefreq: "weekly",  priority: "0.6" },
          { path: "/docs",      lastmod: TODAY, changefreq: "weekly",  priority: "0.6" },
        ];

        const urls = entries.map((e) =>
          [
            "  <url>",
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            "  </url>",
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});