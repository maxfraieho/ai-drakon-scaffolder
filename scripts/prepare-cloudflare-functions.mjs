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
const entryPath = path.join(serverDir, "index.js");
const entryCode = fs.readFileSync(entryPath, "utf8");
const workerFileNameMatch = entryCode.match(/"\.\/assets\/(worker-entry-[^"]+)"/);

if (!workerFileNameMatch) {
  throw new Error(`Cannot detect worker entry in ${entryPath}`);
}

const workerFileName = workerFileNameMatch[1];

// Створюємо _worker.js з обгорткою
const workerCode = `import * as entry from "./assets/${workerFileName}";

export default {
  async fetch(request, env) {
    try {
      const handler = entry.default || entry;
      if (typeof handler.fetch === 'function') {
        return await handler.fetch(request, env);
      }
      if (typeof entry.fetch === 'function') {
        return await entry.fetch(request, env);
      }
    } catch (e) {
      return new Response('Internal Error: ' + e.message, { status: 500 });
    }
    return env.ASSETS.fetch(request);
  }
};
`;

fs.writeFileSync(path.join(distDir, "_worker.js"), workerCode, "utf8");

console.log(`Prepared _worker.js at ${distDir}`);