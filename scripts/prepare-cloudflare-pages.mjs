import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceDir = path.join(root, ".lovable", "dist", "client");
const targetDir = path.join(root, "dist");

function copyRecursive(source, target) {
  fs.mkdirSync(target, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

if (!fs.existsSync(sourceDir)) {
  throw new Error(`Build output not found: ${sourceDir}`);
}

fs.rmSync(targetDir, { recursive: true, force: true });
copyRecursive(sourceDir, targetDir);

const nestedIndexPath = path.join(targetDir, "index", "index.html");
const rootIndexPath = path.join(targetDir, "index.html");
if (fs.existsSync(nestedIndexPath) && !fs.existsSync(rootIndexPath)) {
  fs.copyFileSync(nestedIndexPath, rootIndexPath);
}

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

for (const filePath of ["404.html", "index.html"]) {
  const absolutePath = path.join(targetDir, filePath);
  if (!fs.existsSync(absolutePath)) {
    fs.writeFileSync(absolutePath, fallbackHtml, "utf8");
  }
}

console.log(`Prepared Cloudflare Pages static output at ${targetDir}`);