import { r as reactExports, U as jsxRuntimeExports, T as React } from "./server-gJy2DtaG.js";
import { d as useControllableState, P as Primitive, u as useId, c as composeEventHandlers, f as Presence, b as useComposedRefs, p as useLayoutEffect2, a as createContextScope } from "./router-xG6ysrBj.js";
import { a as api } from "./api-DBg6TLju.js";
var COLLAPSIBLE_NAME = "Collapsible";
var [createCollapsibleContext] = createContextScope(COLLAPSIBLE_NAME);
var [CollapsibleProvider, useCollapsibleContext] = createCollapsibleContext(COLLAPSIBLE_NAME);
var Collapsible$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      __scopeCollapsible,
      open: openProp,
      defaultOpen,
      disabled,
      onOpenChange,
      ...collapsibleProps
    } = props;
    const [open, setOpen] = useControllableState({
      prop: openProp,
      defaultProp: defaultOpen ?? false,
      onChange: onOpenChange,
      caller: COLLAPSIBLE_NAME
    });
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      CollapsibleProvider,
      {
        scope: __scopeCollapsible,
        disabled,
        contentId: useId(),
        open,
        onOpenToggle: reactExports.useCallback(() => setOpen((prevOpen) => !prevOpen), [setOpen]),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Primitive.div,
          {
            "data-state": getState(open),
            "data-disabled": disabled ? "" : void 0,
            ...collapsibleProps,
            ref: forwardedRef
          }
        )
      }
    );
  }
);
Collapsible$1.displayName = COLLAPSIBLE_NAME;
var TRIGGER_NAME = "CollapsibleTrigger";
var CollapsibleTrigger$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeCollapsible, ...triggerProps } = props;
    const context = useCollapsibleContext(TRIGGER_NAME, __scopeCollapsible);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.button,
      {
        type: "button",
        "aria-controls": context.contentId,
        "aria-expanded": context.open || false,
        "data-state": getState(context.open),
        "data-disabled": context.disabled ? "" : void 0,
        disabled: context.disabled,
        ...triggerProps,
        ref: forwardedRef,
        onClick: composeEventHandlers(props.onClick, context.onOpenToggle)
      }
    );
  }
);
CollapsibleTrigger$1.displayName = TRIGGER_NAME;
var CONTENT_NAME = "CollapsibleContent";
var CollapsibleContent$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { forceMount, ...contentProps } = props;
    const context = useCollapsibleContext(CONTENT_NAME, props.__scopeCollapsible);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Presence, { present: forceMount || context.open, children: ({ present }) => /* @__PURE__ */ jsxRuntimeExports.jsx(CollapsibleContentImpl, { ...contentProps, ref: forwardedRef, present }) });
  }
);
CollapsibleContent$1.displayName = CONTENT_NAME;
var CollapsibleContentImpl = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeCollapsible, present, children, ...contentProps } = props;
  const context = useCollapsibleContext(CONTENT_NAME, __scopeCollapsible);
  const [isPresent, setIsPresent] = reactExports.useState(present);
  const ref = reactExports.useRef(null);
  const composedRefs = useComposedRefs(forwardedRef, ref);
  const heightRef = reactExports.useRef(0);
  const height = heightRef.current;
  const widthRef = reactExports.useRef(0);
  const width = widthRef.current;
  const isOpen = context.open || isPresent;
  const isMountAnimationPreventedRef = reactExports.useRef(isOpen);
  const originalStylesRef = reactExports.useRef(void 0);
  reactExports.useEffect(() => {
    const rAF = requestAnimationFrame(() => isMountAnimationPreventedRef.current = false);
    return () => cancelAnimationFrame(rAF);
  }, []);
  useLayoutEffect2(() => {
    const node = ref.current;
    if (node) {
      originalStylesRef.current = originalStylesRef.current || {
        transitionDuration: node.style.transitionDuration,
        animationName: node.style.animationName
      };
      node.style.transitionDuration = "0s";
      node.style.animationName = "none";
      const rect = node.getBoundingClientRect();
      heightRef.current = rect.height;
      widthRef.current = rect.width;
      if (!isMountAnimationPreventedRef.current) {
        node.style.transitionDuration = originalStylesRef.current.transitionDuration;
        node.style.animationName = originalStylesRef.current.animationName;
      }
      setIsPresent(present);
    }
  }, [context.open, present]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Primitive.div,
    {
      "data-state": getState(context.open),
      "data-disabled": context.disabled ? "" : void 0,
      id: context.contentId,
      hidden: !isOpen,
      ...contentProps,
      ref: composedRefs,
      style: {
        [`--radix-collapsible-content-height`]: height ? `${height}px` : void 0,
        [`--radix-collapsible-content-width`]: width ? `${width}px` : void 0,
        ...props.style
      },
      children: isOpen && children
    }
  );
});
function getState(open) {
  return open ? "open" : "closed";
}
var Root = Collapsible$1;
const Collapsible = Root;
const CollapsibleTrigger = CollapsibleTrigger$1;
const CollapsibleContent = CollapsibleContent$1;
const DIAGRAMS_STORAGE_KEY = "drakon.diagrams";
function readDiagramsFromStorage() {
  try {
    const raw = localStorage.getItem(DIAGRAMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function writeDiagramsToStorage(diagrams) {
  localStorage.setItem(DIAGRAMS_STORAGE_KEY, JSON.stringify(diagrams));
}
function upsertDiagramInStorage(diagram) {
  const current = readDiagramsFromStorage();
  const index = current.findIndex((item) => item.id === diagram.id);
  if (index === -1) {
    writeDiagramsToStorage([diagram, ...current]);
    return;
  }
  current[index] = diagram;
  writeDiagramsToStorage(current);
}
function removeDiagramFromStorage(diagramId) {
  const current = readDiagramsFromStorage();
  writeDiagramsToStorage(current.filter((item) => item.id !== diagramId));
}
const createStoreImpl = (createState) => {
  let state;
  const listeners = /* @__PURE__ */ new Set();
  const setState = (partial, replace) => {
    const nextState = typeof partial === "function" ? partial(state) : partial;
    if (!Object.is(nextState, state)) {
      const previousState = state;
      state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener(state, previousState));
    }
  };
  const getState2 = () => state;
  const getInitialState = () => initialState;
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const api2 = { setState, getState: getState2, getInitialState, subscribe };
  const initialState = state = createState(setState, getState2, api2);
  return api2;
};
const createStore = ((createState) => createState ? createStoreImpl(createState) : createStoreImpl);
const identity = (arg) => arg;
function useStore(api2, selector = identity) {
  const slice = React.useSyncExternalStore(
    api2.subscribe,
    React.useCallback(() => selector(api2.getState()), [api2, selector]),
    React.useCallback(() => selector(api2.getInitialState()), [api2, selector])
  );
  React.useDebugValue(slice);
  return slice;
}
const createImpl = (createState) => {
  const api2 = createStore(createState);
  const useBoundStore = (selector) => useStore(api2, selector);
  Object.assign(useBoundStore, api2);
  return useBoundStore;
};
const create = ((createState) => createState ? createImpl(createState) : createImpl);
const useDiagramStore = create((set, get) => ({
  currentDiagram: null,
  metrics: null,
  isDirty: false,
  isSaving: false,
  setDiagram: (diagram) => {
    set({ currentDiagram: diagram, isDirty: false });
  },
  setMetrics: (metrics) => {
    set({ metrics });
  },
  applyDelta: (delta) => {
    const { currentDiagram } = get();
    if (!currentDiagram) return;
    const items = { ...currentDiagram.diagram.items };
    if (delta.type === "delete") {
      delete items[delta.itemId];
    }
    if (delta.type === "insert" || delta.type === "update") {
      const prev = items[delta.itemId] ?? {
        type: "action",
        content: ""
      };
      items[delta.itemId] = {
        ...prev,
        ...delta.data ?? {}
      };
    }
    set({
      currentDiagram: {
        ...currentDiagram,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        diagram: {
          ...currentDiagram.diagram,
          items
        }
      },
      isDirty: true
    });
  },
  saveDiagram: async () => {
    const { currentDiagram } = get();
    if (!currentDiagram) return;
    set({ isSaving: true });
    try {
      await api.commit(currentDiagram.folderId, currentDiagram.id, currentDiagram);
      upsertDiagramInStorage({ ...currentDiagram, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
      set({ isDirty: false });
    } finally {
      set({ isSaving: false });
    }
  }
}));
export {
  Collapsible as C,
  CollapsibleTrigger as a,
  CollapsibleContent as b,
  upsertDiagramInStorage as c,
  removeDiagramFromStorage as d,
  readDiagramsFromStorage as r,
  useDiagramStore as u
};
