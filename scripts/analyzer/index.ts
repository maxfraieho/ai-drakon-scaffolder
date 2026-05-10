import fs from "node:fs";
import path from "node:path";
import { Project, Node, SyntaxKind, type SourceFile, type FunctionDeclaration, type ParameterDeclaration, type ArrowFunction, type FunctionExpression } from "ts-morph";

export type AnalyzerConfig = {
  projectRoot: string;
  entryPaths: string[];
  includeGlobs: string[];
  excludeGlobs: string[];
};

export type AnalysisSummary = {
  totalFiles: number;
  totalFunctions: number;
  totalComponents: number;
  modules: string[];
  detectedFlows: string[];
  functions: Array<{ name: string; filePath: string; params: string[]; returnType: string; isExported: boolean }>;
  components: Array<{ name: string; filePath: string; hasProps: boolean }>;
  hooks: Array<{ name: string; filePath: string }>;
  stores: Array<{ name: string; filePath: string }>;
  apiClients: Array<{ name: string; filePath: string; methods: string[] }>;
  classes: Array<{ name: string; filePath: string; methods: string[] }>;
  importGraph: Record<string, string[]>;
  leafModules: string[];
  hubModules: string[];
};

type PlannedDiagram = {
  name: string;
  description: string;
  scope: "module" | "flow" | "procedure";
  estimatedComplexity: "low" | "medium" | "high";
};

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

function normalizePath(filePath: string) {
  return filePath.replaceAll("\\", "/");
}

function relativeToRoot(projectRoot: string, filePath: string) {
  return normalizePath(path.relative(projectRoot, filePath));
}

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args.set(key, next);
        i += 1;
      } else {
        args.set(key, "true");
      }
    }
  }
  return args;
}

function splitList(value: string) {
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isReactComponentLike(node: FunctionDeclaration | ArrowFunction | FunctionExpression) {
  const body = node.getBody();
  if (!body) return false;

  const hasJsxReturn = body.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0
    || body.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0
    || body.getDescendantsOfKind(SyntaxKind.JsxFragment).length > 0;
  if (hasJsxReturn) return true;

  const returnStatements = body.getDescendantsOfKind(SyntaxKind.ReturnStatement);
  return returnStatements.some((ret) => {
    const expr = ret.getExpression();
    if (!expr) return false;
    const kind = expr.getKind();
    return kind === SyntaxKind.JsxElement || kind === SyntaxKind.JsxSelfClosingElement || kind === SyntaxKind.JsxFragment;
  });
}

function getParamNames(params: ParameterDeclaration[]) {
  return params.map((param) => param.getName());
}

function discoverModules(files: string[]) {
  const modules = new Set<string>();
  for (const file of files) {
    const firstSegment = file.split("/")[0];
    if (firstSegment && firstSegment !== ".") modules.add(firstSegment);
  }
  return [...modules].sort();
}

function buildPlannedDiagrams(summary: AnalysisSummary): PlannedDiagram[] {
  const planned: PlannedDiagram[] = [];

  if (summary.detectedFlows.includes("auth-flow")) {
    planned.push({
      name: "auth-flow",
      description: "Authentication flow detected from login/logout/auth-related functions and modules.",
      scope: "flow",
      estimatedComplexity: "medium",
    });
  }

  if (summary.apiClients.length > 0) {
    planned.push({
      name: "api-client-flow",
      description: "API client interaction flow based on exported API methods and dependency graph.",
      scope: "flow",
      estimatedComplexity: "medium",
    });
  }

  if (summary.stores.length > 0) {
    planned.push({
      name: "state-management-flow",
      description: "State management flow inferred from store/slice patterns (Zustand/Redux/Jotai style).",
      scope: "flow",
      estimatedComplexity: "medium",
    });
  }

  const largeComponents = summary.components
    .map((component) => {
      const relatedImports = summary.importGraph[component.filePath]?.length ?? 0;
      return { ...component, score: relatedImports };
    })
    .filter((component) => component.score >= 4)
    .slice(0, 6);

  for (const component of largeComponents) {
    planned.push({
      name: `${component.name}-flow`,
      description: `UI interaction flow centered around component ${component.name}.`,
      scope: "flow",
      estimatedComplexity: component.score >= 8 ? "high" : "medium",
    });
  }

  return planned;
}

function detectFlows(summary: AnalysisSummary) {
  const flows = new Set<string>();

  const authSignals = ["auth", "login", "logout", "token", "session", "jwt"];
  const saveSignals = ["save", "commit", "persist", "update"];
  const diagramSignals = ["diagram", "drakon", "editor"];

  const allNames = [
    ...summary.functions.map((f) => `${f.name} ${f.filePath}`.toLowerCase()),
    ...summary.apiClients.map((a) => `${a.name} ${a.filePath} ${a.methods.join(" ")}`.toLowerCase()),
    ...summary.stores.map((s) => `${s.name} ${s.filePath}`.toLowerCase()),
  ];

  if (allNames.some((name) => authSignals.some((signal) => name.includes(signal)))) {
    flows.add("auth-flow");
  }

  if (allNames.some((name) => saveSignals.some((signal) => name.includes(signal)))) {
    flows.add("save-flow");
  }

  if (allNames.some((name) => diagramSignals.some((signal) => name.includes(signal)))) {
    flows.add("diagram-flow");
  }

  if (summary.apiClients.length > 0) {
    flows.add("api-client-flow");
  }

  if (summary.stores.length > 0) {
    flows.add("state-management-flow");
  }

  if (summary.hooks.length > 0) {
    flows.add("hooks-flow");
  }

  return [...flows];
}

function buildProject(config: AnalyzerConfig) {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: {
      allowJs: true,
      checkJs: false,
      jsx: 2,
      target: 99,
      moduleResolution: 100,
      module: 99,
    },
  });

  const entryGlobs = config.entryPaths.length
    ? config.entryPaths.flatMap((entryPath) => EXTENSIONS.map((ext) => `${entryPath.replace(/\/$/, "")}/**/*${ext}`))
    : [];

  const includeGlobs = config.includeGlobs.length ? config.includeGlobs : ["src/**/*.{ts,tsx,js,jsx}"];

  const searchGlobs = [...entryGlobs, ...includeGlobs].map((glob) => {
    if (path.isAbsolute(glob)) return glob;
    return normalizePath(path.join(config.projectRoot, glob));
  });

  const exclusionMatchers = config.excludeGlobs.map((glob) => normalizePath(glob));

  for (const glob of searchGlobs) {
    project.addSourceFilesAtPaths(glob);
  }

  return {
    project,
    isExcluded: (filePath: string) => {
      const rel = relativeToRoot(config.projectRoot, filePath);
      return exclusionMatchers.some((pattern) => rel.includes(pattern.replace("/**", "").replace("*", "")));
    },
  };
}

export async function analyzeTypeScriptProject(config: AnalyzerConfig): Promise<AnalysisSummary> {
  const { project, isExcluded } = buildProject(config);
  const sourceFiles = project.getSourceFiles().filter((file) => {
    const ext = path.extname(file.getFilePath());
    return EXTENSIONS.includes(ext) && !isExcluded(file.getFilePath());
  });

  const functions: AnalysisSummary["functions"] = [];
  const components: AnalysisSummary["components"] = [];
  const hooks: AnalysisSummary["hooks"] = [];
  const stores: AnalysisSummary["stores"] = [];
  const apiClients: AnalysisSummary["apiClients"] = [];
  const classes: AnalysisSummary["classes"] = [];
  const importGraph: AnalysisSummary["importGraph"] = {};

  const filePaths = sourceFiles.map((file) => relativeToRoot(config.projectRoot, file.getFilePath()));

  for (const sourceFile of sourceFiles) {
    const filePath = relativeToRoot(config.projectRoot, sourceFile.getFilePath());

    importGraph[filePath] = sourceFile.getImportDeclarations().map((imp) => imp.getModuleSpecifierValue());

    const exportedFns = sourceFile.getFunctions().filter((fn) => fn.isExported());
    for (const fn of sourceFile.getFunctions()) {
      const fnName = fn.getName() ?? "anonymous";
      const fnData = {
        name: fnName,
        filePath,
        params: getParamNames(fn.getParameters()),
        returnType: fn.getReturnType().getText(fn),
        isExported: fn.isExported(),
      };
      functions.push(fnData);

      if (fnName.startsWith("use")) {
        hooks.push({ name: fnName, filePath });
      }

      if (isReactComponentLike(fn) || /^[A-Z]/.test(fnName)) {
        components.push({ name: fnName, filePath, hasProps: fn.getParameters().length > 0 });
      }
    }

    const variableStatements = sourceFile.getVariableStatements();
    for (const statement of variableStatements) {
      for (const declaration of statement.getDeclarations()) {
        const declName = declaration.getName();
        const initializer = declaration.getInitializer();
        if (!initializer) continue;

        if (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer)) {
          const fnLike = initializer;
          const params = getParamNames(fnLike.getParameters());
          const isExported = statement.isExported() || exportedFns.some((fn) => fn.getName() === declName);

          functions.push({
            name: declName,
            filePath,
            params,
            returnType: fnLike.getReturnType().getText(fnLike),
            isExported,
          });

          if (declName.startsWith("use")) {
            hooks.push({ name: declName, filePath });
          }

          if (isReactComponentLike(fnLike) || /^[A-Z]/.test(declName)) {
            components.push({ name: declName, filePath, hasProps: params.length > 0 });
          }
        }
      }
    }

    for (const cls of sourceFile.getClasses()) {
      classes.push({
        name: cls.getName() ?? "AnonymousClass",
        filePath,
        methods: cls.getMethods().map((method) => method.getName()),
      });
    }

    const lowerName = path.basename(filePath).toLowerCase();
    const isApiClientFile = lowerName === "api.ts" || lowerName.endsWith("-api.ts") || lowerName.endsWith("client.ts") || lowerName.endsWith("client.tsx");
    if (isApiClientFile) {
      const methods = sourceFile
        .getFunctions()
        .filter((fn) => fn.isExported())
        .map((fn) => fn.getName() ?? "anonymous");

      const objectMethods = sourceFile
        .getVariableDeclarations()
        .flatMap((decl) => {
          const init = decl.getInitializer();
          if (!init || !Node.isObjectLiteralExpression(init)) return [];
          return init.getProperties().map((prop) => {
            if (Node.isPropertyAssignment(prop)) return prop.getName();
            if (Node.isMethodDeclaration(prop)) return prop.getName();
            return null;
          });
        })
        .filter((value): value is string => Boolean(value));

      apiClients.push({
        name: path.basename(filePath, path.extname(filePath)),
        filePath,
        methods: [...new Set([...methods, ...objectMethods])],
      });
    }

    const isStoreFile = /(?:store|slice)\.(?:ts|tsx|js|jsx)$/i.test(lowerName);
    const hasStorePattern = sourceFile.getText().includes("zustand")
      || sourceFile.getText().includes("createStore")
      || sourceFile.getText().includes("configureStore")
      || sourceFile.getText().includes("createSlice")
      || sourceFile.getText().includes("jotai");

    if (isStoreFile || hasStorePattern) {
      stores.push({
        name: path.basename(filePath, path.extname(filePath)),
        filePath,
      });
    }
  }

  const dedupeBy = <T>(items: T[], key: (item: T) => string) => {
    const map = new Map<string, T>();
    for (const item of items) map.set(key(item), item);
    return [...map.values()];
  };

  const cleanFunctions = dedupeBy(functions, (item) => `${item.filePath}:${item.name}:${item.params.join(",")}`);
  const cleanComponents = dedupeBy(components, (item) => `${item.filePath}:${item.name}`);
  const cleanHooks = dedupeBy(hooks, (item) => `${item.filePath}:${item.name}`);
  const cleanStores = dedupeBy(stores, (item) => `${item.filePath}:${item.name}`);
  const cleanApiClients = dedupeBy(apiClients, (item) => `${item.filePath}:${item.name}`);
  const cleanClasses = dedupeBy(classes, (item) => `${item.filePath}:${item.name}`);

  const leafModules = Object.entries(importGraph)
    .filter(([, imports]) => imports.length === 0)
    .map(([file]) => file)
    .sort();

  const hubModules = Object.entries(importGraph)
    .filter(([, imports]) => imports.length >= 8)
    .map(([file]) => file)
    .sort((a, b) => (importGraph[b]?.length ?? 0) - (importGraph[a]?.length ?? 0)
  );

  const summary: AnalysisSummary = {
    totalFiles: sourceFiles.length,
    totalFunctions: cleanFunctions.length,
    totalComponents: cleanComponents.length,
    modules: discoverModules(filePaths),
    detectedFlows: [],
    functions: cleanFunctions,
    components: cleanComponents,
    hooks: cleanHooks,
    stores: cleanStores,
    apiClients: cleanApiClients,
    classes: cleanClasses,
    importGraph,
    leafModules,
    hubModules,
  };

  summary.detectedFlows = detectFlows(summary);

  return summary;
}

async function generateAnalysisCache(config: AnalyzerConfig, outputPath: string) {
  const summary = await analyzeTypeScriptProject(config);
  const payload = {
    generatedAt: new Date().toISOString(),
    config,
    summary,
    plannedDiagrams: buildPlannedDiagrams(summary),
  };

  const content = `export const PRE_ANALYZED_ANALYSIS = ${JSON.stringify(payload, null, 2)};\n`;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content, "utf-8");
}

if (import.meta.main) {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = args.get("projectRoot") ?? process.cwd();
  const out = args.get("out") ?? path.join(projectRoot, "cloudflare-worker", "generated-analysis-cache.js");

  const entryPaths = splitList(args.get("entryPaths") ?? "src|cloudflare-worker");

  const includeGlobs = splitList(args.get("include") ?? "src/**/*.{ts,tsx,js,jsx}|cloudflare-worker/**/*.{ts,tsx,js,jsx}");

  const excludeGlobs = splitList(args.get("exclude") ?? "node_modules/**|dist/**|.vinxi/**|.wrangler/**");

  generateAnalysisCache({
    projectRoot,
    entryPaths,
    includeGlobs,
    excludeGlobs,
  }, out).catch((error) => {
    console.error("Analyzer generation failed:", error);
    process.exit(1);
  });
}