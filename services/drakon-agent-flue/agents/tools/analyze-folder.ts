import { Type, defineTool } from '@flue/runtime';
import { analyzeCode } from './analyze-code.js';

export const analyzeFolder = defineTool({
  name: 'analyze_folder',
  description: 'Analyze all code files (Python, JS, TS) in a directory and generate DRAKON diagrams.',
  parameters: Type.Object({
    folderPath: Type.String({ description: 'Target folder path' }),
    maxFiles: Type.Number({ description: 'Maximum number of files to analyze' }),
    refine: Type.Boolean({ description: 'Enable LLM refinement' }),
  }),
  execute: async ({ folderPath, maxFiles, refine }, context: any) => {
    let fs: any;
    let path: any;

    try {
      fs = await import('fs');
      path = await import('path');
    } catch (e) {
      return JSON.stringify({
        diagrams: [],
        summary: 'Помилка: Робота з файловою системою не підтримується в цьому середовищі.',
        analyzed: 0,
        files: [],
        errors: [{ file: folderPath, error: 'Filesystem module not available' }]
      }, null, 2);
    }

    const max = maxFiles || 20;
    const repoRoot = typeof process !== 'undefined' ? process.env.REPO_ROOT || process.cwd() : '/';
    const targetDir = path.resolve(repoRoot, folderPath);

    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
      return JSON.stringify({
        diagrams: [],
        summary: `Помилка: Папку не знайдено за шляхом ${folderPath}`,
        analyzed: 0,
        files: [],
        errors: [{ file: folderPath, error: 'Folder not found' }]
      }, null, 2);
    }

    const extensions = ['py', 'js', 'ts', 'jsx', 'tsx'];
    const files: string[] = [];

    const getFilesRec = (dir: string) => {
      if (files.length >= max) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (
            entry.name === 'node_modules' ||
            entry.name === '.git' ||
            entry.name === '__pycache__' ||
            entry.name === '.lovable' ||
            entry.name === 'dist'
          ) {
            continue;
          }
          getFilesRec(fullPath);
        } else {
          const ext = entry.name.split('.').pop()?.toLowerCase() || '';
          if (extensions.includes(ext)) {
            files.push(fullPath);
            if (files.length >= max) return;
          }
        }
      }
    };

    getFilesRec(targetDir);

    if (files.length === 0) {
      return JSON.stringify({
        diagrams: [],
        summary: 'Папка не містить підтримуваних файлів (Python, JS, TS).',
        analyzed: 0,
        files: [],
        errors: []
      }, null, 2);
    }

    const results: any[] = [];
    const errors: any[] = [];
    const analyzedFiles: string[] = [];

    for (const fpath of files) {
      const relPath = path.relative(repoRoot, fpath);
      try {
        const code = fs.readFileSync(fpath, 'utf-8');
        const analysisResStr = await analyzeCode.execute({
          code,
          filename: relPath,
          refine
        }, context);

        const analysisRes = JSON.parse(analysisResStr);
        if (analysisRes.diagrams) {
          results.push(...analysisRes.diagrams);
        }
        analyzedFiles.push(relPath);
      } catch (e: any) {
        errors.push({ file: relPath, error: e.message });
      }
    }

    return JSON.stringify({
      diagrams: results,
      analyzed: analyzedFiles.length,
      files: analyzedFiles,
      errors,
      summary: `Проаналізовано ${analyzedFiles.length} файлів, отримано ${results.length} схем.`
    }, null, 2);
  }
});
