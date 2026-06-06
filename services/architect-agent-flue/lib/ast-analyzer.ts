import * as acorn from 'acorn';

class IDGen {
  private n = 0;
  next(prefix = 'n'): string {
    this.n++;
    return `${prefix}${this.n}`;
  }
}

class DrakonIRBuilder {
  private gen = new IDGen();
  public items: Record<string, any> = { end: { type: 'end' } };

  action(content: string): string {
    const nid = this.gen.next('n');
    this.items[nid] = { type: 'action', content };
    return nid;
  }

  question(content: string): string {
    const nid = this.gen.next('q');
    this.items[nid] = { type: 'question', content };
    return nid;
  }

  linkOne(fromId: string, toId: string) {
    if (this.items[fromId]) {
      this.items[fromId].one = toId;
    }
  }

  linkTwo(fromId: string, toId: string) {
    if (this.items[fromId]) {
      this.items[fromId].two = toId;
    }
  }

  stripEmpty() {
    let changed = true;
    while (changed) {
      changed = false;
      for (const [eid, item] of Object.entries(this.items)) {
        if (
          item.type === 'action' &&
          (!item.content || !item.content.trim()) &&
          eid !== 'b0' &&
          eid !== 'end'
        ) {
          const target = item.one;
          if (target === undefined) continue;
          
          for (const other of Object.values(this.items)) {
            if (other.one === eid) {
              other.one = target;
            }
            if (other.two === eid) {
              other.two = target;
            }
          }
          delete this.items[eid];
          changed = true;
          break;
        }
      }
    }
  }

  build(entryId: string, name: string, params: string) {
    this.stripEmpty();
    this.items.b0 = { type: 'branch', branchId: 0, one: entryId };
    return { name, params, items: this.items };
  }
}

class FnTranslator {
  private ir = new DrakonIRBuilder();
  private code: string;

  constructor(code: string) {
    this.code = code;
  }

  private getNodeText(node: any): string {
    return this.code.substring(node.start, node.end).trim();
  }

  public translate(name: string, params: string, body: any): any {
    if (!body) {
      return this.ir.build('end', name, params);
    }

    let firstId: string | null = null;
    let lastId: string | null = null;

    if (body.type === 'BlockStatement') {
      const res = this.stmts(body.body);
      firstId = res[0];
      lastId = res[1];
    } else {
      const text = this.getNodeText(body);
      if (text) {
        const nid = this.ir.action(text);
        firstId = nid;
        lastId = nid;
      }
    }

    if (lastId) {
      this.ir.linkOne(lastId, 'end');
    }

    const entry = firstId || 'end';
    return this.ir.build(entry, name, params);
  }

  private stmts(nodes: any[]): [string | null, string | null] {
    let firstId: string | null = null;
    let prevId: string | null = null;

    for (const node of nodes) {
      if (node.type === 'EmptyStatement' || node.type === 'DebuggerStatement' || node.type === 'EmptyExpression') {
        continue;
      }
      const [fid, lid] = this.stmt(node);
      if (fid === null) {
        continue;
      }
      if (prevId) {
        this.ir.linkOne(prevId, fid);
      }
      firstId = firstId || fid;
      prevId = lid;
    }

    return [firstId, prevId];
  }

  private stmt(node: any): [string | null, string | null] {
    const t = node.type;

    if (t === 'IfStatement') {
      return this.handleIf(node);
    }

    if (
      t === 'ForStatement' ||
      t === 'WhileStatement' ||
      t === 'DoWhileStatement' ||
      t === 'ForInStatement' ||
      t === 'ForOfStatement'
    ) {
      return this.handleLoop(node);
    }

    if (
      t === 'ReturnStatement' ||
      t === 'ExpressionStatement' ||
      t === 'VariableDeclaration' ||
      t === 'ThrowStatement' ||
      t === 'BreakStatement' ||
      t === 'ContinueStatement'
    ) {
      const text = this.getNodeText(node);
      const nid = this.ir.action(text);
      return [nid, nid];
    }

    if (t === 'BlockStatement') {
      return this.stmts(node.body);
    }

    // Fallback: treat as action
    const text = this.getNodeText(node);
    if (!text) {
      return [null, null];
    }
    const nid = this.ir.action(text);
    return [nid, nid];
  }

  private handleIf(node: any): [string, string] {
    let condText = '?';
    if (node.test) {
      condText = this.getNodeText(node.test);
    }
    const qid = this.ir.question(condText);

    const [yesFirst, yesLast] = node.consequent ? this.stmt(node.consequent) : [null, null];
    const [noFirst, noLast] = node.alternate ? this.stmt(node.alternate) : [null, null];

    const mergeId = this.ir.action('');

    this.ir.linkOne(qid, yesFirst ? yesFirst : mergeId);
    this.ir.linkTwo(qid, noFirst ? noFirst : mergeId);

    if (yesLast) {
      this.ir.linkOne(yesLast, mergeId);
    }
    if (noLast) {
      this.ir.linkOne(noLast, mergeId);
    }

    return [qid, mergeId];
  }

  private handleLoop(node: any): [string, string] {
    let condText = 'loop';
    if (node.type === 'ForStatement' && node.test) {
      condText = this.getNodeText(node.test);
    } else if (node.type === 'WhileStatement' && node.test) {
      condText = this.getNodeText(node.test);
    } else if (node.type === 'DoWhileStatement' && node.test) {
      condText = this.getNodeText(node.test);
    } else if (node.type === 'ForInStatement') {
      condText = `${this.getNodeText(node.left)} in ${this.getNodeText(node.right)}`;
    } else if (node.type === 'ForOfStatement') {
      condText = `${this.getNodeText(node.left)} of ${this.getNodeText(node.right)}`;
    }

    const qid = this.ir.question(condText);
    const [bodyFirst, bodyLast] = node.body ? this.stmt(node.body) : [null, null];

    const exitId = this.ir.action('');

    this.ir.linkOne(qid, bodyFirst ? bodyFirst : qid);
    if (bodyLast) {
      this.ir.linkOne(bodyLast, qid);
    }
    this.ir.linkTwo(qid, exitId);

    return [qid, exitId];
  }
}

function preprocessTS(code: string): string {
  // Strip simple TypeScript constructs so acorn can parse it as JS
  let cleaned = code.replace(/import\s+type\s+[^;]+;/g, '/* type import */');
  // Strip interfaces
  cleaned = cleaned.replace(/interface\s+\w+(?:<[^>]+>)?\s*({[^{}]*(?:{[^{}]*}[^{}]*)*})/g, '/* interface */');
  // Strip types
  cleaned = cleaned.replace(/type\s+\w+(?:<[^>]+>)?\s*=[^;]+;/g, '/* type */');
  // Strip return type annotations (e.g. ): Type { or ): Promise<Type> { or ): void {)
  cleaned = cleaned.replace(/(\)\s*:\s*[A-Za-z0-9_<>\[\]|&\s{}]+)(?=\s*\{)/g, '');
  // Strip parameter type annotations (e.g. (code: string, filename?: string) -> (code, filename))
  // We can do a basic search & replace for common TS keywords or simple : Type annotations in param lists.
  // E.g. replace : string, : number, : any, : boolean, : void, etc.
  cleaned = cleaned.replace(/:\s*(?:string|number|boolean|any|void|string\[\]|Record<[^>]+>)/g, '');
  
  return cleaned;
}

export class JSAnalyzer {
  public analyze(code: string, filename = 'module.js'): any[] {
    if (!code || !code.trim()) {
      return [];
    }

    // Preprocess if it looks like typescript
    const isTS = filename.endsWith('.ts') || filename.endsWith('.tsx');
    const processedCode = isTS ? preprocessTS(code) : code;

    let ast: any;
    try {
      ast = acorn.parse(processedCode, {
        ecmaVersion: 2022,
        sourceType: 'module',
      });
    } catch (e: any) {
      // If parsing fails, fall back to parsing line-by-line or returning empty
      // so we degrade gracefully or return a structured error
      return [{
        name: 'error_diagram',
        params: '',
        items: {
          b0: { type: 'branch', branchId: 0, one: 'n1' },
          n1: { type: 'action', content: `Parsing Error: ${e.message}`, one: 'end' },
          end: { type: 'end' }
        },
        _valid: false,
        _errors: [`Acorn parse error: ${e.message}`]
      }];
    }

    const results: any[] = [];
    const getParamsText = (paramsNodes: any[]): string => {
      return paramsNodes.map(p => {
        if (p.type === 'Identifier') return p.name;
        if (p.type === 'AssignmentPattern') return p.left.name;
        return processedCode.substring(p.start, p.end);
      }).join(', ');
    };

    // Recursive walk helper
    const walk = (node: any) => {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'FunctionDeclaration') {
        const name = node.id ? node.id.name : '<anonymous>';
        const params = getParamsText(node.params);
        results.push(new FnTranslator(processedCode).translate(name, params, node.body));
      } else if (node.type === 'VariableDeclarator') {
        const value = node.init;
        if (value && (value.type === 'ArrowFunctionExpression' || value.type === 'FunctionExpression')) {
          const name = node.id ? node.id.name : '<anonymous>';
          const params = getParamsText(value.params);
          results.push(new FnTranslator(processedCode).translate(name, params, value.body));
        }
      } else if (node.type === 'MethodDefinition') {
        const name = node.key ? node.key.name : '<anonymous>';
        const params = getParamsText(node.value.params);
        results.push(new FnTranslator(processedCode).translate(name, params, node.value.body));
      } else if (node.type === 'FunctionExpression') {
        // Only treat as separate if it's named or we want to capture anonymous ones
        if (node.id) {
          const name = node.id.name;
          const params = getParamsText(node.params);
          results.push(new FnTranslator(processedCode).translate(name, params, node.body));
        }
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
    };

    walk(ast);
    return results;
  }
}
