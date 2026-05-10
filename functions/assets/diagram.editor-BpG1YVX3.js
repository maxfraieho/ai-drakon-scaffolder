import { U as jsxRuntimeExports } from "./server-gJy2DtaG.js";
import { i as useSearch, L as Link, N as Navigate } from "./router-xG6ysrBj.js";
import { D as DrakonEditor } from "./DrakonEditor-qGouW2GM.js";
import { B as Button } from "./api-DBg6TLju.js";
import { c as createLucideIcon } from "./select-BirXpnu9.js";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./dialog-DNmMAriS.js";
import "./useDiagramStore-u-E7UDT9.js";
import "./switch-DCkk9ASI.js";
import "./file-text-y0evhAAk.js";
const __iconNode = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
];
const ArrowLeft = createLucideIcon("arrow-left", __iconNode);
function DiagramEditorPage() {
  const search = useSearch({ strict: false });
  const diagramId = search.diagramId || "";
  const folderId = search.folderId || "general";
  const isNew = search.isNew === "true";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background text-foreground flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 border-b border-border p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/diagrams", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", size: "sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "mr-2 h-4 w-4" }),
        "Back"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-lg font-semibold", children: isNew ? "New Diagram" : `Edit: ${diagramId}` })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex-1 p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      DrakonEditor,
      {
        diagramId,
        folderSlug: folderId,
        isNew,
        height: 600,
        onSaved: () => {
        }
      }
    ) })
  ] });
}
function DiagramEditorRoute() {
  if (typeof window !== "undefined" && !localStorage.getItem("jwt")) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: "/login", replace: true });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DiagramEditorPage, {});
}
export {
  DiagramEditorRoute as component
};
