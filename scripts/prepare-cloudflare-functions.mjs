import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const distDir = path.join(root, "dist");

const serverCandidates = [
  path.join(root, ".output", "server"),
  path.join(root, "dist", "server"),
];

const serverDir = serverCandidates.find((candidate) => fs.existsSync(candidate));

if (!serverDir) {
  if (
    fs.existsSync(path.join(distDir, "_worker.js")) ||
    fs.existsSync(path.join(distDir, "index.html")) ||
    fs.existsSync(path.join(distDir, "assets"))
  ) {
    console.log("Cloudflare Pages static/client build found at target. Skipping server wrap.");
    process.exit(0);
  }
  throw new Error(
    `Server build output not found. Checked: ${serverCandidates.join(", ")}`
  );
}

// Remove any stale functions/ dir -- it conflicts with the _worker.js approach!
fs.rmSync(path.join(root, "functions"), { recursive: true, force: true });

// TanStack Start/Nitro (vite 7) emits a server bundle as index.mjs + _libs/_ssr/_chunks.
// Copy that server bundle into dist/server, then write a _worker.js that wraps its entry.
const targetServerDir = path.join(distDir, "server");
const sourceInsideTarget =
  serverDir === targetServerDir ||
  serverDir.startsWith(`${targetServerDir}${path.sep}`);

if (!sourceInsideTarget) {
  fs.rmSync(targetServerDir, { recursive: true, force: true });
  fs.cpSync(serverDir, targetServerDir, { recursive: true });
}

const serverEntryCandidates = ["index.mjs", "index.js", "server.mjs", "server.js"];
const serverEntry = serverEntryCandidates.find((name) =>
  fs.existsSync(path.join(targetServerDir, name))
);

if (!serverEntry) {
  throw new Error(`Cannot detect server entry in ${targetServerDir}`);
}

// Write _worker.js
// The worker-entry may export the handler as a named export (e.g. `w`),
// while index.js re-exports it as default. Check both named exports
// and default, then fall back to .fetch().
const importPath = `./server/${serverEntry}`;
const workerCode = `import * as entry from "${importPath}";

const STATIC_PATH_RE = /^\\/assets\\//;
const STATIC_EXT_RE = /\\.(js|mjs|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webmanifest|map|txt|xml)$/i;

function resolveHandler(mod) {
  if (mod && typeof mod === 'object') {
    if (mod.default && typeof mod.default.fetch === 'function') return mod.default;
    if (typeof mod.fetch === 'function') return mod;
    for (const key of Object.keys(mod)) {
      const v = mod[key];
      if (v && typeof v === 'object' && typeof v.fetch === 'function') return v;
    }
  }
  return null;
}

const handler = resolveHandler(entry);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Static assets (JS/CSS/images etc.) -- serve directly via env.ASSETS
    if (STATIC_PATH_RE.test(pathname) || STATIC_EXT_RE.test(pathname)) {
      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.status !== 404) return assetRes;
    }

    // SSR handler
    if (handler) {
      try {
        return await handler.fetch(request, env, ctx);
      } catch (e) {
        return new Response('Internal Server Error: ' + (e && e.message || e), { status: 500 });
      }
    }

    // Fallback -- serve raw static asset (e.g. favicon.ico etc.)
    return env.ASSETS.fetch(request);
  },
};
`;

fs.writeFileSync(path.join(distDir, "_worker.js"), workerCode, "utf8");

console.log(`Prepared _worker.js with static asset handling at ${distDir}`);
console.log(`  worker entry: server/${serverEntry}`);
