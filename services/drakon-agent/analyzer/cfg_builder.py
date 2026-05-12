"""DRAKON IR accumulator with proper widget format."""


class IDGen:
    def __init__(self):
        self._n = 0

    def next(self, prefix: str = "n") -> str:
        self._n += 1
        return f"{prefix}{self._n}"


class DrakonIR:
    """Accumulates DRAKON IR items in widget format.

    Node types: branch (entry b0), action, question, end.
    Pointers: one = next/yes, two = no.
    """

    def __init__(self):
        self._gen = IDGen()
        self.items: dict = {"end": {"type": "end"}}

    def action(self, content: str) -> str:
        nid = self._gen.next("n")
        self.items[nid] = {"type": "action", "content": content}
        return nid

    def question(self, content: str) -> str:
        nid = self._gen.next("q")
        self.items[nid] = {"type": "question", "content": content}
        return nid

    def link_one(self, from_id: str, to_id: str):
        self.items[from_id]["one"] = to_id

    def link_two(self, from_id: str, to_id: str):
        self.items[from_id]["two"] = to_id

    def strip_empty(self):
        """Remove empty action nodes, rewiring references through them."""
        changed = True
        while changed:
            changed = False
            for eid, item in list(self.items.items()):
                if (item["type"] == "action"
                        and not item.get("content", "").strip()
                        and eid not in ("b0", "end")):
                    target = item.get("one")
                    if target is None:
                        continue
                    for other in self.items.values():
                        for key in ("one", "two"):
                            if other.get(key) == eid:
                                other[key] = target
                    del self.items[eid]
                    changed = True
                    break

    def build(self, entry_id: str, name: str, params: str) -> dict:
        self.strip_empty()
        self.items["b0"] = {"type": "branch", "branchId": 0, "one": entry_id}
        return {"name": name, "params": params, "items": self.items}

    def build_empty(self, name: str, params: str) -> dict:
        nid = self.action("pass")
        self.items["b0"] = {"type": "branch", "branchId": 0, "one": nid}
        self.items[nid]["one"] = "end"
        return {"name": name, "params": params, "items": self.items}
