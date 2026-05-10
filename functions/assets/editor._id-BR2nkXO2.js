import { r as reactExports, U as jsxRuntimeExports } from "./server-gJy2DtaG.js";
import { h as useNavigate, R as Route, N as Navigate } from "./router-xG6ysrBj.js";
import { B as Button, I as Input, t as toast } from "./api-DBg6TLju.js";
import { D as DrakonEditor } from "./DrakonEditor-qGouW2GM.js";
import { B as Badge } from "./select-BirXpnu9.js";
import { u as useDiagramStore, r as readDiagramsFromStorage, c as upsertDiagramInStorage } from "./useDiagramStore-u-E7UDT9.js";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./dialog-DNmMAriS.js";
import "./switch-DCkk9ASI.js";
import "./file-text-y0evhAAk.js";
function EditorPage({ diagramId }) {
  const id = diagramId;
  const navigate = useNavigate();
  const { currentDiagram, metrics, isDirty, isSaving, setDiagram, setMetrics, saveDiagram } = useDiagramStore();
  const [nameDraft, setNameDraft] = reactExports.useState("");
  const [nameDirty, setNameDirty] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const localDiagram = readDiagramsFromStorage().find((item) => item.id === id);
    if (!localDiagram) {
      navigate({ to: "/diagrams", replace: true });
      return;
    }
    setDiagram(localDiagram);
    setNameDraft(localDiagram.name);
    setNameDirty(false);
    const localKey = `diagram_${id}`;
    localStorage.setItem(localKey, JSON.stringify(localDiagram));
  }, [id, navigate, setDiagram]);
  reactExports.useEffect(() => {
    setMetrics(null);
    const saved = localStorage.getItem(`diagram_metrics_${id}`);
    if (saved) {
      try {
        setMetrics(JSON.parse(saved));
      } catch {
      }
    }
  }, [id, setMetrics]);
  const hasChanges = isDirty || nameDirty;
  const currentStatus = reactExports.useMemo(() => {
    if (hasChanges) {
      return { label: "Є зміни", variant: "secondary" };
    }
    return { label: "Збережено", variant: "default" };
  }, [hasChanges]);
  const syncNameToStore = () => {
    if (!currentDiagram) return;
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === currentDiagram.name) return;
    const updated = {
      ...currentDiagram,
      name: trimmed,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      diagram: {
        ...currentDiagram.diagram,
        name: trimmed
      }
    };
    setDiagram(updated);
    setNameDirty(true);
  };
  const handleSave = async () => {
    if (!currentDiagram) return;
    try {
      if (nameDraft.trim() && nameDraft.trim() !== currentDiagram.name) {
        const updated = {
          ...currentDiagram,
          name: nameDraft.trim(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          diagram: {
            ...currentDiagram.diagram,
            name: nameDraft.trim()
          }
        };
        setDiagram(updated);
        upsertDiagramInStorage(updated);
      }
      await saveDiagram();
      const refreshed = useDiagramStore.getState().currentDiagram;
      if (refreshed) {
        upsertDiagramInStorage({ ...refreshed, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
      }
      setNameDirty(false);
      toast.success("Схему збережено");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не вдалося зберегти схему");
    }
  };
  if (!currentDiagram) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground", children: "Завантаження схеми..." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-screen flex-col bg-background text-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex h-14 items-center justify-between border-b border-border px-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", variant: "ghost", onClick: () => navigate({ to: "/diagrams" }), children: "← Назад" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            value: nameDraft,
            onChange: (event) => {
              setNameDraft(event.target.value);
              if (!nameDirty) setNameDirty(true);
            },
            onBlur: syncNameToStore,
            className: "h-9 w-72"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: currentStatus.variant, children: currentStatus.label })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        metrics ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "secondary", children: [
            "Вузлів: ",
            metrics.total_nodes
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Badge,
            {
              className: [
                "border-transparent",
                metrics.sis_ok ? "border-transparent bg-chart-2/20 text-foreground" : "border-transparent bg-chart-4/20 text-foreground"
              ].join(" "),
              children: [
                "Шампур: ",
                metrics.sis
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Badge,
            {
              className: [
                "border-transparent",
                metrics.rdc > 4 ? "border-transparent bg-destructive/20 text-foreground" : metrics.rdc_ok ? "border-transparent bg-chart-2/20 text-foreground" : "border-transparent bg-chart-4/20 text-foreground"
              ].join(" "),
              children: [
                "Глибина: ",
                metrics.rdc
              ]
            }
          )
        ] }) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", onClick: handleSave, disabled: !hasChanges || isSaving, children: isSaving ? "Збереження..." : "Зберегти" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex flex-1 p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      DrakonEditor,
      {
        diagramId: id,
        folderSlug: currentDiagram.folderId,
        diagram: currentDiagram.diagram,
        className: "w-full",
        onSaved: () => {
          const refreshed = useDiagramStore.getState().currentDiagram;
          if (refreshed) {
            setDiagram(refreshed);
            setNameDraft(refreshed.name);
            setNameDirty(false);
          }
        }
      }
    ) })
  ] });
}
function EditorRoute() {
  const {
    id
  } = Route.useParams();
  if (typeof window !== "undefined" && !localStorage.getItem("jwt")) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: "/login", replace: true });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(EditorPage, { diagramId: id });
}
export {
  EditorRoute as component
};
