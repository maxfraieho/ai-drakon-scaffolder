import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const serverDir = path.join(root, ".lovable", "dist", "server");
const targetDir = path.join(root, "functions");

if (!fs.existsSync(serverDir)) {
  throw new Error(`Server build output not found: ${serverDir}`);
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });

fs.cpSync(path.join(serverDir, "assets"), path.join(targetDir, "assets"), {
  recursive: true,
});

const entryPath = path.join(serverDir, "index.js");
const entryCode = fs.readFileSync(entryPath, "utf8");
const workerFileNameMatch = entryCode.match(/"\.\/assets\/(worker-entry-[^"]+)"/);

if (!workerFileNameMatch) {
  throw new Error(`Cannot detect worker entry in ${entryPath}`);
}

const workerFileName = workerFileNameMatch[1];

// 🔧 FIX: створюємо обгортку з onRequest замість прямого копіювання
const wrapperCode = `import handler from "./assets/${workerFileName}";

export async function onRequest(context) {
  return handler.fetch(context.request, context.env, context.context);
}
`;
fs.writeFileSync(path.join(targetDir, "[[path]].js"), wrapperCode, "utf8");

const staticFallbackPath = path.join(root, "dist", "404.html");
const fallbackHtml = `<!doctype html>
<html lang="uk">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta http-equiv="refresh" content="0;url=/" />
    <title>Redirecting…</title>
  </head>
  <body>
    <script>location.replace('/')</script>
  </body>
</html>`;

if (!fs.existsSync(staticFallbackPath)) {
  fs.writeFileSync(staticFallbackPath, fallbackHtml, "utf8");
}

console.log(`Prepared Cloudflare Pages Functions at ${targetDir}`);