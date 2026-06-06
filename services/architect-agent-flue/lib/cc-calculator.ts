import * as acorn from 'acorn';

function preprocessTS(code: string): string {
  // Strip simple TypeScript constructs so acorn can parse it as JS
  let cleaned = code.replace(/import\s+type\s+[^;]+;/g, '/* type import */');
  // Strip interfaces
  cleaned = cleaned.replace(/interface\s+\w+(?:<[^>]+>)?\s*({[^{}]*(?:{[^{}]*}[^{}]*)*})/g, '/* interface */');
  // Strip types
  cleaned = cleaned.replace(/type\s+\w+(?:<[^>]+>)?\s*=[^;]+;/g, '/* type */');
  // Strip return type annotations
  cleaned = cleaned.replace(/(\)\s*:\s*[A-Za-z0-9_<>\[\]|&\s{}]+)(?=\s*\{)/g, '');
  // Strip parameter type annotations
  cleaned = cleaned.replace(/:\s*(?:string|number|boolean|any|void|string\[\]|Record<[^>]+>)/g, '');
  
  return cleaned;
}

function calculateJSCC(code: string): number {
  let processed = code;
  try {
    processed = preprocessTS(code);
  } catch (e) {}

  let ast: any;
  try {
    ast = acorn.parse(processed, {
      ecmaVersion: 2022,
      sourceType: 'module',
    });
  } catch (e) {
    // Fallback to regex counting if AST parsing fails
    return calculatePythonCC(code);
  }

  let count = 1; // Base complexity is 1

  function walk(node: any) {
    if (!node || typeof node !== 'object') return;

    switch (node.type) {
      case 'IfStatement':
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement':
      case 'WhileStatement':
      case 'DoWhileStatement':
      case 'CatchClause':
      case 'ConditionalExpression':
        count++;
        break;
      case 'SwitchCase':
        if (node.test) {
          count++;
        }
        break;
      case 'LogicalExpression':
        if (node.operator === '&&' || node.operator === '||' || node.operator === '??') {
          count++;
        }
        break;
    }

    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const val = node[key];
      if (Array.isArray(val)) {
        for (const child of val) {
          walk(child);
        }
      } else if (val && typeof val === 'object' && val.type) {
        walk(val);
      }
    }
  }

  walk(ast);
  return count;
}

function calculatePythonCC(code: string): number {
  let count = 1;
  
  // Clean comments to avoid false positives
  const lines = code.split('\n');
  const cleanLines = lines.map(line => {
    const hashIdx = line.indexOf('#');
    if (hashIdx !== -1) {
      return line.substring(0, hashIdx);
    }
    return line;
  });
  
  const cleanCode = cleanLines.join(' ');
  
  const keywords = [
    /\bif\b/g,
    /\belif\b/g,
    /\bfor\b/g,
    /\bwhile\b/g,
    /\bexcept\b/g,
    /\bwith\b/g,
    /\bassert\b/g,
    /\band\b/g,
    /\bor\b/g
  ];

  for (const regex of keywords) {
    const matches = cleanCode.match(regex);
    if (matches) {
      count += matches.length;
    }
  }

  return count;
}

export function calculateCC(code: string, filePath: string): number {
  const ext = filePath.split('.').pop() || '';
  if (['js', 'ts', 'tsx', 'jsx', 'mjs'].includes(ext)) {
    return calculateJSCC(code);
  }
  return calculatePythonCC(code);
}
