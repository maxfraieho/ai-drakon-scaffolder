import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const serverDir = path.join(root, ".lovable", "dist", "server");
const distDir = path.join(root, "dist");

if (!fs.existsSync(serverDir)) {
  throw new Error(`Server build output not found: ${serverDir}`);
}

// Видаляємо functions/ — НЕ використовуємо!
fs.rmSync(path.join(root, "functions"), { recursive: true, force: true });

// Копіюємо server assets в dist/assets
fs.cpSync(path.join(serverDir, "assets"), path.join(distDir, "assets"), {
  recursive: true,
});

// Знаходимо worker-entry файл
// Спочатку — через regex у server/index.js
let workerFileName = null;
const entryPath = path.join(serverDir, "index.js");
if (fs.existsSync(entryPath)) {
  const entryCode = fs.readFileSync(entryPath, "utf8");
  const match = entryCode.match(/"\.\/assets\/(worker-entry-[^"]+)"/);
  if (match) workerFileName = match[1];
}

// Fallback — шукаємо worker-entry-* безпосередньо в dist/assets
if (!workerFileName) {
  const assetsDir = path.join(distDir, "assets");
  if (fs.existsSync(assetsDir)) {
    const candidates = fs.readdirSync(assetsDir).filter((f) =>
      f.startsWith("worker-entry-")
    );
    if (candidates.length > 0) workerFileName = candidates[0];
  }
}

if (!workerFileName) {
  throw new Error(
    `Cannot detect worker entry: no worker-entry-* found in server/index.js or dist/assets/`
  );
}

// Статичні розширення які має обслуговувати env.ASSETS
const STATIC_EXT_RE = /\.(js|mjs|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webmanifest|map|txt|xml)$/i;

// Створюємо _worker.js
// worker-entry експортує handler як named export (напр. `w`),
// а index.js re-експортує його як default. Імпортуємо ВСІ named exports
// і шукаємо той, у якого є .fetch().
const workerCode = `import * as entry from "./assets/${workerFileName}";

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

    // Статичні assets (JS/CSS/шрифти тощо) — завжди через env.ASSETS
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

    // Fallback — спробувати знайти статичний файл (наприклад favicon.ico з кореня)
    return env.ASSETS.fetch(request);
  },
};
`;

fs.writeFileSync(path.join(distDir, "_worker.js"), workerCode, "utf8");

console.log(`Prepared _worker.js with static asset handling at ${distDir}`);
console.log(`  worker entry: ${workerFileName}`);
