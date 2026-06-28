import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targetDir = path.join(root, "dist");

const sourceCandidates = [
  path.join(root, ".lovable", "dist", "client"),
  path.join(root, "dist", "client"),
  path.join(root, ".lovable", "dist"),
  path.join(root, "dist"),
];

const sourceDir = sourceCandidates.find((candidate) => {
  if (!fs.existsSync(candidate)) return false;
  if (candidate.endsWith("dist")) {
    // If it's a direct dist folder, only use it if it contains assets or a worker file/folder
    return fs.existsSync(path.join(candidate, "assets")) || fs.existsSync(path.join(candidate, "_worker.js"));
  }
  return true;
});

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

if (!sourceDir) {
  throw new Error(
    `Build output not found. Checked: ${sourceCandidates.join(", ")}`
  );
}

if (sourceDir === targetDir) {
  console.log(`Source directory is already the target directory (${targetDir}). Skipping copy.`);
  process.exit(0);
}

const sourceInsideTarget = sourceDir.startsWith(`${targetDir}${path.sep}`);

// Якщо source знаходиться всередині dist (наприклад dist/client), не чистимо весь dist.
if (!sourceInsideTarget) {
  fs.rmSync(targetDir, { recursive: true, force: true });
}

copyRecursive(sourceDir, targetDir);

console.log(`Prepared Cloudflare Pages assets at ${targetDir}`);