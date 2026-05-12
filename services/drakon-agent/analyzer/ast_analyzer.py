"""Python AST to DRAKON IR translator.

Produces widget-compatible IR: b0 entry, end terminal,
action/question nodes with one/two pointers.
"""
import ast

from .cfg_builder import DrakonIR


def _is_simple(stmt) -> bool:
    return isinstance(stmt, (
        ast.Assign, ast.AugAssign, ast.AnnAssign,
        ast.Expr, ast.Delete, ast.Assert, ast.Raise,
        ast.Import, ast.ImportFrom, ast.Pass, ast.Global, ast.Nonlocal,
    ))


class FunctionTranslator:
    """Translates a single function/method AST node to DRAKON IR."""

    def __init__(self):
        self._ir = DrakonIR()
        self._return_ids: list[str] = []

    def translate(self, func: ast.FunctionDef | ast.AsyncFunctionDef) -> dict:
        params = ast.unparse(func.args)
        if not func.body:
            return self._ir.build_empty(func.name, params)

        first_id, last_id = self._stmts(func.body)

        if last_id:
            self._ir.link_one(last_id, "end")
        for rid in self._return_ids:
            self._ir.link_one(rid, "end")

        return self._ir.build(first_id or "end", func.name, params)

    # ── statement list ────────────────────────────────────────────────────────

    def _stmts(self, stmts: list) -> tuple[str | None, str | None]:
        """Translate statement list. Returns (first_id, last_patchable_id)."""
        first_id: str | None = None
        prev_id: str | None = None
        i = 0

        while i < len(stmts):
            stmt = stmts[i]

            if _is_simple(stmt):
                texts = []
                while i < len(stmts) and _is_simple(stmts[i]):
                    texts.append(ast.unparse(stmts[i]))
                    i += 1
                nid = self._ir.action("\n".join(texts))
                if prev_id:
                    self._ir.link_one(prev_id, nid)
                first_id = first_id or nid
                prev_id = nid

            elif isinstance(stmt, ast.If):
                fid, eid = self._if(stmt)
                if prev_id:
                    self._ir.link_one(prev_id, fid)
                first_id = first_id or fid
                prev_id = eid
                i += 1

            elif isinstance(stmt, (ast.For, ast.While)):
                fid, eid = self._loop(stmt)
                if prev_id:
                    self._ir.link_one(prev_id, fid)
                first_id = first_id or fid
                prev_id = eid
                i += 1

            elif isinstance(stmt, ast.Return):
                nid = self._ir.action(ast.unparse(stmt))
                if prev_id:
                    self._ir.link_one(prev_id, nid)
                first_id = first_id or nid
                self._return_ids.append(nid)
                prev_id = None
                i += 1

            else:
                nid = self._ir.action(ast.unparse(stmt))
                if prev_id:
                    self._ir.link_one(prev_id, nid)
                first_id = first_id or nid
                prev_id = nid
                i += 1

        return first_id, prev_id

    # ── control flow ──────────────────────────────────────────────────────────

    def _if(self, node: ast.If) -> tuple[str, str]:
        cond = ast.unparse(node.test) + "?"
        qid = self._ir.question(cond)

        yes_first, yes_last = self._stmts(node.body)
        if yes_first:
            self._ir.link_one(qid, yes_first)
        else:
            empty = self._ir.action("")
            self._ir.link_one(qid, empty)
            yes_last = empty

        merge = self._ir.action("")

        if yes_last:
            self._ir.link_one(yes_last, merge)

        if node.orelse:
            if len(node.orelse) == 1 and isinstance(node.orelse[0], ast.If):
                sub_qid, sub_end = self._if(node.orelse[0])
                self._ir.link_two(qid, sub_qid)
                if sub_end:
                    self._ir.link_one(sub_end, merge)
            else:
                no_first, no_last = self._stmts(node.orelse)
                if no_first:
                    self._ir.link_two(qid, no_first)
                else:
                    self._ir.link_two(qid, merge)
                if no_last:
                    self._ir.link_one(no_last, merge)
        else:
            self._ir.link_two(qid, merge)

        return qid, merge

    def _loop(self, node: ast.For | ast.While) -> tuple[str, str]:
        if isinstance(node, ast.For):
            cond = f"{ast.unparse(node.target)} in {ast.unparse(node.iter)}?"
        else:
            cond = ast.unparse(node.test) + "?"

        qid = self._ir.question(cond)
        exit_node = self._ir.action("")

        body_first, body_last = self._stmts(node.body)

        if body_first:
            self._ir.link_one(qid, body_first)
        else:
            self._ir.link_one(qid, exit_node)

        self._ir.link_two(qid, exit_node)

        if body_last:
            self._ir.link_one(body_last, qid)

        return qid, exit_node


class PythonAnalyzer:
    """Converts Python source to list of DRAKON IR diagrams."""

    def analyze(self, code: str, filename: str = "module.py") -> list[dict]:
        try:
            tree = ast.parse(code, filename)
        except SyntaxError as e:
            raise ValueError(f"Syntax error in {filename}: {e}")

        diagrams: list[dict] = []
        class_method_ids: set[int] = set()

        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                for item in node.body:
                    if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        class_method_ids.add(id(item))
                        try:
                            t = FunctionTranslator()
                            ir = t.translate(item)
                            ir["name"] = f"{node.name}.{item.name}"
                            diagrams.append(ir)
                        except Exception as e:
                            diagrams.append({"name": f"{node.name}.{item.name}",
                                             "error": str(e), "items": {}})

        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if id(node) not in class_method_ids:
                    try:
                        t = FunctionTranslator()
                        diagrams.append(t.translate(node))
                    except Exception as e:
                        diagrams.append({"name": node.name, "error": str(e), "items": {}})

        return diagrams
