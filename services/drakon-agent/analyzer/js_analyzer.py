"""JavaScript/TypeScript → DRAKON IR analyzer using tree-sitter."""
from __future__ import annotations

import tree_sitter_javascript as tsjs
import tree_sitter_typescript as tsts
from tree_sitter import Language, Node, Parser

from .cfg_builder import DrakonIR

_JS_LANG = Language(tsjs.language())
_TS_LANG = Language(tsts.language_typescript())
_TSX_LANG = Language(tsts.language_tsx())

_EXT_MAP = {
    ".js": _JS_LANG, ".mjs": _JS_LANG, ".cjs": _JS_LANG,
    ".ts": _TS_LANG, ".mts": _TS_LANG,
    ".tsx": _TSX_LANG, ".jsx": _JS_LANG,
}


def _lang_for(filename: str) -> Language:
    from pathlib import Path
    ext = Path(filename).suffix.lower()
    return _EXT_MAP.get(ext, _JS_LANG)


class _FnTranslator:
    def __init__(self):
        self._ir = DrakonIR()

    def translate(self, name: str, params: str, body: Node | None) -> dict:
        if body is None:
            return self._ir.build("end", name, params)
        if body.type == "statement_block":
            first_id, last_id = self._stmts(body.children)
        else:
            # Arrow function expression body (not a block)
            text = body.text.decode("utf-8", errors="replace").strip()
            if text:
                nid = self._ir.action(text)
                first_id, last_id = nid, nid
            else:
                first_id, last_id = None, None
        if last_id:
            self._ir.link_one(last_id, "end")
        entry = first_id or "end"
        return self._ir.build(entry, name, params)

    def _stmts(self, nodes: list[Node]) -> tuple[str | None, str | None]:
        first_id: str | None = None
        prev_id: str | None = None
        for node in nodes:
            if node.type in ("{", "}", "comment", "empty_statement"):
                continue
            fid, lid = self._stmt(node)
            if fid is None:
                continue
            if prev_id:
                self._ir.link_one(prev_id, fid)
            first_id = first_id or fid
            prev_id = lid
        return first_id, prev_id

    def _stmt(self, node: Node) -> tuple[str | None, str | None]:
        t = node.type

        if t == "if_statement":
            return self._if(node)

        if t in ("for_statement", "while_statement", "do_statement",
                  "for_in_statement", "for_of_statement"):
            return self._loop(node)

        if t in ("return_statement", "expression_statement", "variable_declaration",
                  "lexical_declaration", "throw_statement", "break_statement",
                  "continue_statement"):
            text = node.text.decode("utf-8", errors="replace").strip()
            nid = self._ir.action(text)
            return nid, nid

        if t == "statement_block":
            return self._stmts(node.children)

        # Fallback: treat as action
        text = node.text.decode("utf-8", errors="replace").strip()
        if not text:
            return None, None
        nid = self._ir.action(text)
        return nid, nid

    def _if(self, node: Node) -> tuple[str, str | None]:
        cond_node = node.child_by_field_name("condition")
        cond_text = (cond_node.text.decode("utf-8", errors="replace").strip()
                     if cond_node else "?")
        if cond_text.startswith("(") and cond_text.endswith(")"):
            cond_text = cond_text[1:-1]

        qid = self._ir.question(cond_text)

        cons = node.child_by_field_name("consequence")
        yes_first, yes_last = self._stmt(cons) if cons else (None, None)

        alt = node.child_by_field_name("alternative")
        no_first, no_last = None, None
        if alt:
            # else_clause wraps the body
            inner = alt.child_by_field_name("body")
            if inner is None and alt.children:
                inner = alt.children[-1]
            if inner:
                no_first, no_last = self._stmt(inner)

        # Merge point (empty placeholder — stripped by build())
        merge_id = self._ir.action("")

        self._ir.link_one(qid, yes_first if yes_first else merge_id)
        self._ir.link_two(qid, no_first if no_first else merge_id)
        if yes_last:
            self._ir.link_one(yes_last, merge_id)
        if no_last:
            self._ir.link_one(no_last, merge_id)

        return qid, merge_id

    def _loop(self, node: Node) -> tuple[str, str | None]:
        cond_node = (node.child_by_field_name("condition")
                     or node.child_by_field_name("left"))
        cond_text = (cond_node.text.decode("utf-8", errors="replace").strip()
                     if cond_node else "loop")
        if cond_text.startswith("(") and cond_text.endswith(")"):
            cond_text = cond_text[1:-1]

        qid = self._ir.question(cond_text)
        body = node.child_by_field_name("body")
        body_first, body_last = self._stmt(body) if body else (None, None)

        # Exit node (empty placeholder — stripped by build())
        exit_id = self._ir.action("")

        self._ir.link_one(qid, body_first if body_first else qid)
        if body_last:
            self._ir.link_one(body_last, qid)
        self._ir.link_two(qid, exit_id)

        return qid, exit_id


def _extract_name_params(node: Node) -> tuple[str, str]:
    name_node = node.child_by_field_name("name")
    name = name_node.text.decode() if name_node else "<anonymous>"

    params_node = node.child_by_field_name("parameters")
    if params_node:
        raw = params_node.text.decode()
        if raw.startswith("(") and raw.endswith(")"):
            raw = raw[1:-1]
        params = raw.strip()
    else:
        params = ""

    return name, params


class JSAnalyzer:
    """Analyze JS/TS source code and return list of DRAKON IR dicts."""

    def analyze(self, code: str, filename: str = "module.js") -> list[dict]:
        if not code.strip():
            return []

        lang = _lang_for(filename)
        parser = Parser(lang)
        tree = parser.parse(code.encode("utf-8"))

        results: list[dict] = []
        self._walk(tree.root_node, results)
        return results

    def _walk(self, node: Node, results: list):
        if node.type == "function_declaration":
            name, params = _extract_name_params(node)
            body = node.child_by_field_name("body")
            results.append(_FnTranslator().translate(name, params, body))

        elif node.type == "variable_declarator":
            name_node = node.child_by_field_name("name")
            value_node = node.child_by_field_name("value")
            if value_node and value_node.type in ("arrow_function", "function"):
                name = name_node.text.decode() if name_node else "<anonymous>"
                params_node = value_node.child_by_field_name("parameters")
                if params_node:
                    raw = params_node.text.decode()
                    if raw.startswith("(") and raw.endswith(")"):
                        raw = raw[1:-1]
                    params = raw.strip()
                else:
                    params = ""
                body = value_node.child_by_field_name("body")
                results.append(_FnTranslator().translate(name, params, body))

        elif node.type in ("method_definition", "function_expression"):
            name, params = _extract_name_params(node)
            body = node.child_by_field_name("body")
            results.append(_FnTranslator().translate(name, params, body))

        for child in node.children:
            self._walk(child, results)
