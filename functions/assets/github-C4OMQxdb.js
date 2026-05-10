import { T as React, r as reactExports, U as jsxRuntimeExports } from "./server-gJy2DtaG.js";
import { g as cn, h as useNavigate, N as Navigate } from "./router-xG6ysrBj.js";
import { r as readSettings, I as Input, B as Button, L as Label, a as api, t as toast } from "./api-DBg6TLju.js";
import { c as createLucideIcon, B as Badge, S as Select, b as SelectTrigger, d as SelectValue, e as SelectContent, f as SelectItem } from "./select-BirXpnu9.js";
import { T as Title, D as Description, R as Root$1, P as Portal$1, C as Content$1, O as Overlay$1, a as Dialog, b as DialogContent, c as DialogHeader, d as DialogTitle, e as DialogDescription, f as DialogFooter } from "./dialog-DNmMAriS.js";
import { F as FileText } from "./file-text-y0evhAAk.js";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const __iconNode$6 = [
  [
    "path",
    {
      d: "M14 22h4a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v6",
      key: "14cnrg"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
  [
    "path",
    { d: "M5 14a1 1 0 0 0-1 1v2a1 1 0 0 1-1 1 1 1 0 0 1 1 1v2a1 1 0 0 0 1 1", key: "sr0ebq" }
  ],
  [
    "path",
    { d: "M9 22a1 1 0 0 0 1-1v-2a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-2a1 1 0 0 0-1-1", key: "w793db" }
  ]
];
const FileBracesCorner = createLucideIcon("file-braces-corner", __iconNode$6);
const __iconNode$5 = [
  [
    "path",
    {
      d: "M4 12.15V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2h-3.35",
      key: "1wthlu"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
  ["path", { d: "m5 16-3 3 3 3", key: "331omg" }],
  ["path", { d: "m9 22 3-3-3-3", key: "lsp7cz" }]
];
const FileCodeCorner = createLucideIcon("file-code-corner", __iconNode$5);
const __iconNode$4 = [
  [
    "path",
    {
      d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
      key: "1kt360"
    }
  ]
];
const Folder = createLucideIcon("folder", __iconNode$4);
const __iconNode$3 = [
  [
    "path",
    {
      d: "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4",
      key: "tonef"
    }
  ],
  ["path", { d: "M9 18c-4.51 2-5-2-7-2", key: "9comsn" }]
];
const Github = createLucideIcon("github", __iconNode$3);
const __iconNode$2 = [
  ["circle", { cx: "9", cy: "12", r: "1", key: "1vctgf" }],
  ["circle", { cx: "9", cy: "5", r: "1", key: "hp0tcf" }],
  ["circle", { cx: "9", cy: "19", r: "1", key: "fkjjf6" }],
  ["circle", { cx: "15", cy: "12", r: "1", key: "1tmaij" }],
  ["circle", { cx: "15", cy: "5", r: "1", key: "19l28e" }],
  ["circle", { cx: "15", cy: "19", r: "1", key: "f4zoj3" }]
];
const GripVertical = createLucideIcon("grip-vertical", __iconNode$2);
const __iconNode$1 = [
  ["path", { d: "m21 21-4.34-4.34", key: "14j7rj" }],
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }]
];
const Search = createLucideIcon("search", __iconNode$1);
const __iconNode = [
  [
    "path",
    {
      d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",
      key: "1i5ecw"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
];
const Settings = createLucideIcon("settings", __iconNode);
function __insertCSS(code) {
  if (typeof document == "undefined") return;
  let head = document.head || document.getElementsByTagName("head")[0];
  let style = document.createElement("style");
  style.type = "text/css";
  head.appendChild(style);
  style.styleSheet ? style.styleSheet.cssText = code : style.appendChild(document.createTextNode(code));
}
const DrawerContext = React.createContext({
  drawerRef: {
    current: null
  },
  overlayRef: {
    current: null
  },
  onPress: () => {
  },
  onRelease: () => {
  },
  onDrag: () => {
  },
  onNestedDrag: () => {
  },
  onNestedOpenChange: () => {
  },
  onNestedRelease: () => {
  },
  openProp: void 0,
  dismissible: false,
  isOpen: false,
  isDragging: false,
  keyboardIsOpen: {
    current: false
  },
  snapPointsOffset: null,
  snapPoints: null,
  handleOnly: false,
  modal: false,
  shouldFade: false,
  activeSnapPoint: null,
  onOpenChange: () => {
  },
  setActiveSnapPoint: () => {
  },
  closeDrawer: () => {
  },
  direction: "bottom",
  shouldAnimate: {
    current: true
  },
  shouldScaleBackground: false,
  setBackgroundColorOnScale: true,
  noBodyStyles: false,
  container: null,
  autoFocus: false
});
const useDrawerContext = () => {
  const context = React.useContext(DrawerContext);
  if (!context) {
    throw new Error("useDrawerContext must be used within a Drawer.Root");
  }
  return context;
};
__insertCSS("[data-vaul-drawer]{touch-action:none;will-change:transform;transition:transform .5s cubic-bezier(.32, .72, 0, 1);animation-duration:.5s;animation-timing-function:cubic-bezier(0.32,0.72,0,1)}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=bottom][data-state=open]{animation-name:slideFromBottom}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=bottom][data-state=closed]{animation-name:slideToBottom}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=top][data-state=open]{animation-name:slideFromTop}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=top][data-state=closed]{animation-name:slideToTop}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=left][data-state=open]{animation-name:slideFromLeft}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=left][data-state=closed]{animation-name:slideToLeft}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=right][data-state=open]{animation-name:slideFromRight}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=right][data-state=closed]{animation-name:slideToRight}[data-vaul-drawer][data-vaul-snap-points=true][data-vaul-drawer-direction=bottom]{transform:translate3d(0,var(--initial-transform,100%),0)}[data-vaul-drawer][data-vaul-snap-points=true][data-vaul-drawer-direction=top]{transform:translate3d(0,calc(var(--initial-transform,100%) * -1),0)}[data-vaul-drawer][data-vaul-snap-points=true][data-vaul-drawer-direction=left]{transform:translate3d(calc(var(--initial-transform,100%) * -1),0,0)}[data-vaul-drawer][data-vaul-snap-points=true][data-vaul-drawer-direction=right]{transform:translate3d(var(--initial-transform,100%),0,0)}[data-vaul-drawer][data-vaul-delayed-snap-points=true][data-vaul-drawer-direction=top]{transform:translate3d(0,var(--snap-point-height,0),0)}[data-vaul-drawer][data-vaul-delayed-snap-points=true][data-vaul-drawer-direction=bottom]{transform:translate3d(0,var(--snap-point-height,0),0)}[data-vaul-drawer][data-vaul-delayed-snap-points=true][data-vaul-drawer-direction=left]{transform:translate3d(var(--snap-point-height,0),0,0)}[data-vaul-drawer][data-vaul-delayed-snap-points=true][data-vaul-drawer-direction=right]{transform:translate3d(var(--snap-point-height,0),0,0)}[data-vaul-overlay][data-vaul-snap-points=false]{animation-duration:.5s;animation-timing-function:cubic-bezier(0.32,0.72,0,1)}[data-vaul-overlay][data-vaul-snap-points=false][data-state=open]{animation-name:fadeIn}[data-vaul-overlay][data-state=closed]{animation-name:fadeOut}[data-vaul-animate=false]{animation:none!important}[data-vaul-overlay][data-vaul-snap-points=true]{opacity:0;transition:opacity .5s cubic-bezier(.32, .72, 0, 1)}[data-vaul-overlay][data-vaul-snap-points=true]{opacity:1}[data-vaul-drawer]:not([data-vaul-custom-container=true])::after{content:'';position:absolute;background:inherit;background-color:inherit}[data-vaul-drawer][data-vaul-drawer-direction=top]::after{top:initial;bottom:100%;left:0;right:0;height:200%}[data-vaul-drawer][data-vaul-drawer-direction=bottom]::after{top:100%;bottom:initial;left:0;right:0;height:200%}[data-vaul-drawer][data-vaul-drawer-direction=left]::after{left:initial;right:100%;top:0;bottom:0;width:200%}[data-vaul-drawer][data-vaul-drawer-direction=right]::after{left:100%;right:initial;top:0;bottom:0;width:200%}[data-vaul-overlay][data-vaul-snap-points=true]:not([data-vaul-snap-points-overlay=true]):not(\n[data-state=closed]\n){opacity:0}[data-vaul-overlay][data-vaul-snap-points-overlay=true]{opacity:1}[data-vaul-handle]{display:block;position:relative;opacity:.7;background:#e2e2e4;margin-left:auto;margin-right:auto;height:5px;width:32px;border-radius:1rem;touch-action:pan-y}[data-vaul-handle]:active,[data-vaul-handle]:hover{opacity:1}[data-vaul-handle-hitarea]{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:max(100%,2.75rem);height:max(100%,2.75rem);touch-action:inherit}@media (hover:hover) and (pointer:fine){[data-vaul-drawer]{user-select:none}}@media (pointer:fine){[data-vaul-handle-hitarea]:{width:100%;height:100%}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes fadeOut{to{opacity:0}}@keyframes slideFromBottom{from{transform:translate3d(0,var(--initial-transform,100%),0)}to{transform:translate3d(0,0,0)}}@keyframes slideToBottom{to{transform:translate3d(0,var(--initial-transform,100%),0)}}@keyframes slideFromTop{from{transform:translate3d(0,calc(var(--initial-transform,100%) * -1),0)}to{transform:translate3d(0,0,0)}}@keyframes slideToTop{to{transform:translate3d(0,calc(var(--initial-transform,100%) * -1),0)}}@keyframes slideFromLeft{from{transform:translate3d(calc(var(--initial-transform,100%) * -1),0,0)}to{transform:translate3d(0,0,0)}}@keyframes slideToLeft{to{transform:translate3d(calc(var(--initial-transform,100%) * -1),0,0)}}@keyframes slideFromRight{from{transform:translate3d(var(--initial-transform,100%),0,0)}to{transform:translate3d(0,0,0)}}@keyframes slideToRight{to{transform:translate3d(var(--initial-transform,100%),0,0)}}");
function isMobileFirefox() {
  const userAgent = navigator.userAgent;
  return typeof window !== "undefined" && (/Firefox/.test(userAgent) && /Mobile/.test(userAgent) || // Android Firefox
  /FxiOS/.test(userAgent));
}
function isMac() {
  return testPlatform(/^Mac/);
}
function isIPhone() {
  return testPlatform(/^iPhone/);
}
function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}
function isIPad() {
  return testPlatform(/^iPad/) || // iPadOS 13 lies and says it's a Mac, but we can distinguish by detecting touch support.
  isMac() && navigator.maxTouchPoints > 1;
}
function isIOS() {
  return isIPhone() || isIPad();
}
function testPlatform(re) {
  return typeof window !== "undefined" && window.navigator != null ? re.test(window.navigator.platform) : void 0;
}
const KEYBOARD_BUFFER = 24;
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? reactExports.useLayoutEffect : reactExports.useEffect;
function chain$1(...callbacks) {
  return (...args) => {
    for (let callback of callbacks) {
      if (typeof callback === "function") {
        callback(...args);
      }
    }
  };
}
const visualViewport = typeof document !== "undefined" && window.visualViewport;
function isScrollable(node) {
  let style = window.getComputedStyle(node);
  return /(auto|scroll)/.test(style.overflow + style.overflowX + style.overflowY);
}
function getScrollParent(node) {
  if (isScrollable(node)) {
    node = node.parentElement;
  }
  while (node && !isScrollable(node)) {
    node = node.parentElement;
  }
  return node || document.scrollingElement || document.documentElement;
}
const nonTextInputTypes = /* @__PURE__ */ new Set([
  "checkbox",
  "radio",
  "range",
  "color",
  "file",
  "image",
  "button",
  "submit",
  "reset"
]);
let preventScrollCount = 0;
let restore;
function usePreventScroll(options = {}) {
  let { isDisabled } = options;
  useIsomorphicLayoutEffect(() => {
    if (isDisabled) {
      return;
    }
    preventScrollCount++;
    if (preventScrollCount === 1) {
      if (isIOS()) {
        restore = preventScrollMobileSafari();
      }
    }
    return () => {
      preventScrollCount--;
      if (preventScrollCount === 0) {
        restore == null ? void 0 : restore();
      }
    };
  }, [
    isDisabled
  ]);
}
function preventScrollMobileSafari() {
  let scrollable;
  let lastY = 0;
  let onTouchStart = (e) => {
    scrollable = getScrollParent(e.target);
    if (scrollable === document.documentElement && scrollable === document.body) {
      return;
    }
    lastY = e.changedTouches[0].pageY;
  };
  let onTouchMove = (e) => {
    if (!scrollable || scrollable === document.documentElement || scrollable === document.body) {
      e.preventDefault();
      return;
    }
    let y = e.changedTouches[0].pageY;
    let scrollTop = scrollable.scrollTop;
    let bottom = scrollable.scrollHeight - scrollable.clientHeight;
    if (bottom === 0) {
      return;
    }
    if (scrollTop <= 0 && y > lastY || scrollTop >= bottom && y < lastY) {
      e.preventDefault();
    }
    lastY = y;
  };
  let onTouchEnd = (e) => {
    let target = e.target;
    if (isInput(target) && target !== document.activeElement) {
      e.preventDefault();
      target.style.transform = "translateY(-2000px)";
      target.focus();
      requestAnimationFrame(() => {
        target.style.transform = "";
      });
    }
  };
  let onFocus = (e) => {
    let target = e.target;
    if (isInput(target)) {
      target.style.transform = "translateY(-2000px)";
      requestAnimationFrame(() => {
        target.style.transform = "";
        if (visualViewport) {
          if (visualViewport.height < window.innerHeight) {
            requestAnimationFrame(() => {
              scrollIntoView(target);
            });
          } else {
            visualViewport.addEventListener("resize", () => scrollIntoView(target), {
              once: true
            });
          }
        }
      });
    }
  };
  let onWindowScroll = () => {
    window.scrollTo(0, 0);
  };
  let scrollX = window.pageXOffset;
  let scrollY = window.pageYOffset;
  let restoreStyles = chain$1(setStyle(document.documentElement, "paddingRight", `${window.innerWidth - document.documentElement.clientWidth}px`));
  window.scrollTo(0, 0);
  let removeEvents = chain$1(addEvent(document, "touchstart", onTouchStart, {
    passive: false,
    capture: true
  }), addEvent(document, "touchmove", onTouchMove, {
    passive: false,
    capture: true
  }), addEvent(document, "touchend", onTouchEnd, {
    passive: false,
    capture: true
  }), addEvent(document, "focus", onFocus, true), addEvent(window, "scroll", onWindowScroll));
  return () => {
    restoreStyles();
    removeEvents();
    window.scrollTo(scrollX, scrollY);
  };
}
function setStyle(element, style, value) {
  let cur = element.style[style];
  element.style[style] = value;
  return () => {
    element.style[style] = cur;
  };
}
function addEvent(target, event, handler, options) {
  target.addEventListener(event, handler, options);
  return () => {
    target.removeEventListener(event, handler, options);
  };
}
function scrollIntoView(target) {
  let root = document.scrollingElement || document.documentElement;
  while (target && target !== root) {
    let scrollable = getScrollParent(target);
    if (scrollable !== document.documentElement && scrollable !== document.body && scrollable !== target) {
      let scrollableTop = scrollable.getBoundingClientRect().top;
      let targetTop = target.getBoundingClientRect().top;
      let targetBottom = target.getBoundingClientRect().bottom;
      const keyboardHeight = scrollable.getBoundingClientRect().bottom + KEYBOARD_BUFFER;
      if (targetBottom > keyboardHeight) {
        scrollable.scrollTop += targetTop - scrollableTop;
      }
    }
    target = scrollable.parentElement;
  }
}
function isInput(target) {
  return target instanceof HTMLInputElement && !nonTextInputTypes.has(target.type) || target instanceof HTMLTextAreaElement || target instanceof HTMLElement && target.isContentEditable;
}
function setRef(ref, value) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref !== null && ref !== void 0) {
    ref.current = value;
  }
}
function composeRefs(...refs) {
  return (node) => refs.forEach((ref) => setRef(ref, node));
}
function useComposedRefs(...refs) {
  return reactExports.useCallback(composeRefs(...refs), refs);
}
const cache = /* @__PURE__ */ new WeakMap();
function set(el, styles, ignoreCache = false) {
  if (!el || !(el instanceof HTMLElement)) return;
  let originalStyles = {};
  Object.entries(styles).forEach(([key, value]) => {
    if (key.startsWith("--")) {
      el.style.setProperty(key, value);
      return;
    }
    originalStyles[key] = el.style[key];
    el.style[key] = value;
  });
  if (ignoreCache) return;
  cache.set(el, originalStyles);
}
function reset(el, prop) {
  if (!el || !(el instanceof HTMLElement)) return;
  let originalStyles = cache.get(el);
  if (!originalStyles) {
    return;
  }
  {
    el.style[prop] = originalStyles[prop];
  }
}
const isVertical = (direction) => {
  switch (direction) {
    case "top":
    case "bottom":
      return true;
    case "left":
    case "right":
      return false;
    default:
      return direction;
  }
};
function getTranslate(element, direction) {
  if (!element) {
    return null;
  }
  const style = window.getComputedStyle(element);
  const transform = (
    // @ts-ignore
    style.transform || style.webkitTransform || style.mozTransform
  );
  let mat = transform.match(/^matrix3d\((.+)\)$/);
  if (mat) {
    return parseFloat(mat[1].split(", ")[isVertical(direction) ? 13 : 12]);
  }
  mat = transform.match(/^matrix\((.+)\)$/);
  return mat ? parseFloat(mat[1].split(", ")[isVertical(direction) ? 5 : 4]) : null;
}
function dampenValue(v) {
  return 8 * (Math.log(v + 1) - 2);
}
function assignStyle(element, style) {
  if (!element) return () => {
  };
  const prevStyle = element.style.cssText;
  Object.assign(element.style, style);
  return () => {
    element.style.cssText = prevStyle;
  };
}
function chain(...fns) {
  return (...args) => {
    for (const fn of fns) {
      if (typeof fn === "function") {
        fn(...args);
      }
    }
  };
}
const TRANSITIONS = {
  DURATION: 0.5,
  EASE: [
    0.32,
    0.72,
    0,
    1
  ]
};
const VELOCITY_THRESHOLD = 0.4;
const CLOSE_THRESHOLD = 0.25;
const SCROLL_LOCK_TIMEOUT = 100;
const BORDER_RADIUS = 8;
const NESTED_DISPLACEMENT = 16;
const WINDOW_TOP_OFFSET = 26;
const DRAG_CLASS = "vaul-dragging";
function useCallbackRef(callback) {
  const callbackRef = React.useRef(callback);
  React.useEffect(() => {
    callbackRef.current = callback;
  });
  return React.useMemo(() => (...args) => callbackRef.current == null ? void 0 : callbackRef.current.call(callbackRef, ...args), []);
}
function useUncontrolledState({ defaultProp, onChange }) {
  const uncontrolledState = React.useState(defaultProp);
  const [value] = uncontrolledState;
  const prevValueRef = React.useRef(value);
  const handleChange = useCallbackRef(onChange);
  React.useEffect(() => {
    if (prevValueRef.current !== value) {
      handleChange(value);
      prevValueRef.current = value;
    }
  }, [
    value,
    prevValueRef,
    handleChange
  ]);
  return uncontrolledState;
}
function useControllableState({ prop, defaultProp, onChange = () => {
} }) {
  const [uncontrolledProp, setUncontrolledProp] = useUncontrolledState({
    defaultProp,
    onChange
  });
  const isControlled = prop !== void 0;
  const value = isControlled ? prop : uncontrolledProp;
  const handleChange = useCallbackRef(onChange);
  const setValue = React.useCallback((nextValue) => {
    if (isControlled) {
      const setter = nextValue;
      const value2 = typeof nextValue === "function" ? setter(prop) : nextValue;
      if (value2 !== prop) handleChange(value2);
    } else {
      setUncontrolledProp(nextValue);
    }
  }, [
    isControlled,
    prop,
    setUncontrolledProp,
    handleChange
  ]);
  return [
    value,
    setValue
  ];
}
function useSnapPoints({ activeSnapPointProp, setActiveSnapPointProp, snapPoints, drawerRef, overlayRef, fadeFromIndex, onSnapPointChange, direction = "bottom", container, snapToSequentialPoint }) {
  const [activeSnapPoint, setActiveSnapPoint] = useControllableState({
    prop: activeSnapPointProp,
    defaultProp: snapPoints == null ? void 0 : snapPoints[0],
    onChange: setActiveSnapPointProp
  });
  const [windowDimensions, setWindowDimensions] = React.useState(typeof window !== "undefined" ? {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight
  } : void 0);
  React.useEffect(() => {
    function onResize() {
      setWindowDimensions({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight
      });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isLastSnapPoint = React.useMemo(() => activeSnapPoint === (snapPoints == null ? void 0 : snapPoints[snapPoints.length - 1]) || null, [
    snapPoints,
    activeSnapPoint
  ]);
  const activeSnapPointIndex = React.useMemo(() => {
    var _snapPoints_findIndex;
    return (_snapPoints_findIndex = snapPoints == null ? void 0 : snapPoints.findIndex((snapPoint) => snapPoint === activeSnapPoint)) != null ? _snapPoints_findIndex : null;
  }, [
    snapPoints,
    activeSnapPoint
  ]);
  const shouldFade = snapPoints && snapPoints.length > 0 && (fadeFromIndex || fadeFromIndex === 0) && !Number.isNaN(fadeFromIndex) && snapPoints[fadeFromIndex] === activeSnapPoint || !snapPoints;
  const snapPointsOffset = React.useMemo(() => {
    const containerSize = container ? {
      width: container.getBoundingClientRect().width,
      height: container.getBoundingClientRect().height
    } : typeof window !== "undefined" ? {
      width: window.innerWidth,
      height: window.innerHeight
    } : {
      width: 0,
      height: 0
    };
    var _snapPoints_map;
    return (_snapPoints_map = snapPoints == null ? void 0 : snapPoints.map((snapPoint) => {
      const isPx = typeof snapPoint === "string";
      let snapPointAsNumber = 0;
      if (isPx) {
        snapPointAsNumber = parseInt(snapPoint, 10);
      }
      if (isVertical(direction)) {
        const height = isPx ? snapPointAsNumber : windowDimensions ? snapPoint * containerSize.height : 0;
        if (windowDimensions) {
          return direction === "bottom" ? containerSize.height - height : -containerSize.height + height;
        }
        return height;
      }
      const width = isPx ? snapPointAsNumber : windowDimensions ? snapPoint * containerSize.width : 0;
      if (windowDimensions) {
        return direction === "right" ? containerSize.width - width : -containerSize.width + width;
      }
      return width;
    })) != null ? _snapPoints_map : [];
  }, [
    snapPoints,
    windowDimensions,
    container
  ]);
  const activeSnapPointOffset = React.useMemo(() => activeSnapPointIndex !== null ? snapPointsOffset == null ? void 0 : snapPointsOffset[activeSnapPointIndex] : null, [
    snapPointsOffset,
    activeSnapPointIndex
  ]);
  const snapToPoint = React.useCallback((dimension) => {
    var _snapPointsOffset_findIndex;
    const newSnapPointIndex = (_snapPointsOffset_findIndex = snapPointsOffset == null ? void 0 : snapPointsOffset.findIndex((snapPointDim) => snapPointDim === dimension)) != null ? _snapPointsOffset_findIndex : null;
    onSnapPointChange(newSnapPointIndex);
    set(drawerRef.current, {
      transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
      transform: isVertical(direction) ? `translate3d(0, ${dimension}px, 0)` : `translate3d(${dimension}px, 0, 0)`
    });
    if (snapPointsOffset && newSnapPointIndex !== snapPointsOffset.length - 1 && fadeFromIndex !== void 0 && newSnapPointIndex !== fadeFromIndex && newSnapPointIndex < fadeFromIndex) {
      set(overlayRef.current, {
        transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
        opacity: "0"
      });
    } else {
      set(overlayRef.current, {
        transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
        opacity: "1"
      });
    }
    setActiveSnapPoint(snapPoints == null ? void 0 : snapPoints[Math.max(newSnapPointIndex, 0)]);
  }, [
    drawerRef.current,
    snapPoints,
    snapPointsOffset,
    fadeFromIndex,
    overlayRef,
    setActiveSnapPoint
  ]);
  React.useEffect(() => {
    if (activeSnapPoint || activeSnapPointProp) {
      var _snapPoints_findIndex;
      const newIndex = (_snapPoints_findIndex = snapPoints == null ? void 0 : snapPoints.findIndex((snapPoint) => snapPoint === activeSnapPointProp || snapPoint === activeSnapPoint)) != null ? _snapPoints_findIndex : -1;
      if (snapPointsOffset && newIndex !== -1 && typeof snapPointsOffset[newIndex] === "number") {
        snapToPoint(snapPointsOffset[newIndex]);
      }
    }
  }, [
    activeSnapPoint,
    activeSnapPointProp,
    snapPoints,
    snapPointsOffset,
    snapToPoint
  ]);
  function onRelease({ draggedDistance, closeDrawer, velocity, dismissible }) {
    if (fadeFromIndex === void 0) return;
    const currentPosition = direction === "bottom" || direction === "right" ? (activeSnapPointOffset != null ? activeSnapPointOffset : 0) - draggedDistance : (activeSnapPointOffset != null ? activeSnapPointOffset : 0) + draggedDistance;
    const isOverlaySnapPoint = activeSnapPointIndex === fadeFromIndex - 1;
    const isFirst = activeSnapPointIndex === 0;
    const hasDraggedUp = draggedDistance > 0;
    if (isOverlaySnapPoint) {
      set(overlayRef.current, {
        transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`
      });
    }
    if (!snapToSequentialPoint && velocity > 2 && !hasDraggedUp) {
      if (dismissible) closeDrawer();
      else snapToPoint(snapPointsOffset[0]);
      return;
    }
    if (!snapToSequentialPoint && velocity > 2 && hasDraggedUp && snapPointsOffset && snapPoints) {
      snapToPoint(snapPointsOffset[snapPoints.length - 1]);
      return;
    }
    const closestSnapPoint = snapPointsOffset == null ? void 0 : snapPointsOffset.reduce((prev, curr) => {
      if (typeof prev !== "number" || typeof curr !== "number") return prev;
      return Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev;
    });
    const dim = isVertical(direction) ? window.innerHeight : window.innerWidth;
    if (velocity > VELOCITY_THRESHOLD && Math.abs(draggedDistance) < dim * 0.4) {
      const dragDirection = hasDraggedUp ? 1 : -1;
      if (dragDirection > 0 && isLastSnapPoint && snapPoints) {
        snapToPoint(snapPointsOffset[snapPoints.length - 1]);
        return;
      }
      if (isFirst && dragDirection < 0 && dismissible) {
        closeDrawer();
      }
      if (activeSnapPointIndex === null) return;
      snapToPoint(snapPointsOffset[activeSnapPointIndex + dragDirection]);
      return;
    }
    snapToPoint(closestSnapPoint);
  }
  function onDrag({ draggedDistance }) {
    if (activeSnapPointOffset === null) return;
    const newValue = direction === "bottom" || direction === "right" ? activeSnapPointOffset - draggedDistance : activeSnapPointOffset + draggedDistance;
    if ((direction === "bottom" || direction === "right") && newValue < snapPointsOffset[snapPointsOffset.length - 1]) {
      return;
    }
    if ((direction === "top" || direction === "left") && newValue > snapPointsOffset[snapPointsOffset.length - 1]) {
      return;
    }
    set(drawerRef.current, {
      transform: isVertical(direction) ? `translate3d(0, ${newValue}px, 0)` : `translate3d(${newValue}px, 0, 0)`
    });
  }
  function getPercentageDragged(absDraggedDistance, isDraggingDown) {
    if (!snapPoints || typeof activeSnapPointIndex !== "number" || !snapPointsOffset || fadeFromIndex === void 0) return null;
    const isOverlaySnapPoint = activeSnapPointIndex === fadeFromIndex - 1;
    const isOverlaySnapPointOrHigher = activeSnapPointIndex >= fadeFromIndex;
    if (isOverlaySnapPointOrHigher && isDraggingDown) {
      return 0;
    }
    if (isOverlaySnapPoint && !isDraggingDown) return 1;
    if (!shouldFade && !isOverlaySnapPoint) return null;
    const targetSnapPointIndex = isOverlaySnapPoint ? activeSnapPointIndex + 1 : activeSnapPointIndex - 1;
    const snapPointDistance = isOverlaySnapPoint ? snapPointsOffset[targetSnapPointIndex] - snapPointsOffset[targetSnapPointIndex - 1] : snapPointsOffset[targetSnapPointIndex + 1] - snapPointsOffset[targetSnapPointIndex];
    const percentageDragged = absDraggedDistance / Math.abs(snapPointDistance);
    if (isOverlaySnapPoint) {
      return 1 - percentageDragged;
    } else {
      return percentageDragged;
    }
  }
  return {
    isLastSnapPoint,
    activeSnapPoint,
    shouldFade,
    getPercentageDragged,
    setActiveSnapPoint,
    activeSnapPointIndex,
    onRelease,
    onDrag,
    snapPointsOffset
  };
}
const noop = () => () => {
};
function useScaleBackground() {
  const { direction, isOpen, shouldScaleBackground, setBackgroundColorOnScale, noBodyStyles } = useDrawerContext();
  const timeoutIdRef = React.useRef(null);
  const initialBackgroundColor = reactExports.useMemo(() => document.body.style.backgroundColor, []);
  function getScale() {
    return (window.innerWidth - WINDOW_TOP_OFFSET) / window.innerWidth;
  }
  React.useEffect(() => {
    if (isOpen && shouldScaleBackground) {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      const wrapper = document.querySelector("[data-vaul-drawer-wrapper]") || document.querySelector("[vaul-drawer-wrapper]");
      if (!wrapper) return;
      chain(setBackgroundColorOnScale && !noBodyStyles ? assignStyle(document.body, {
        background: "black"
      }) : noop, assignStyle(wrapper, {
        transformOrigin: isVertical(direction) ? "top" : "left",
        transitionProperty: "transform, border-radius",
        transitionDuration: `${TRANSITIONS.DURATION}s`,
        transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(",")})`
      }));
      const wrapperStylesCleanup = assignStyle(wrapper, {
        borderRadius: `${BORDER_RADIUS}px`,
        overflow: "hidden",
        ...isVertical(direction) ? {
          transform: `scale(${getScale()}) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)`
        } : {
          transform: `scale(${getScale()}) translate3d(calc(env(safe-area-inset-top) + 14px), 0, 0)`
        }
      });
      return () => {
        wrapperStylesCleanup();
        timeoutIdRef.current = window.setTimeout(() => {
          if (initialBackgroundColor) {
            document.body.style.background = initialBackgroundColor;
          } else {
            document.body.style.removeProperty("background");
          }
        }, TRANSITIONS.DURATION * 1e3);
      };
    }
  }, [
    isOpen,
    shouldScaleBackground,
    initialBackgroundColor
  ]);
}
let previousBodyPosition = null;
function usePositionFixed({ isOpen, modal, nested, hasBeenOpened, preventScrollRestoration, noBodyStyles }) {
  const [activeUrl, setActiveUrl] = React.useState(() => typeof window !== "undefined" ? window.location.href : "");
  const scrollPos = React.useRef(0);
  const setPositionFixed = React.useCallback(() => {
    if (!isSafari()) return;
    if (previousBodyPosition === null && isOpen && !noBodyStyles) {
      previousBodyPosition = {
        position: document.body.style.position,
        top: document.body.style.top,
        left: document.body.style.left,
        height: document.body.style.height,
        right: "unset"
      };
      const { scrollX, innerHeight } = window;
      document.body.style.setProperty("position", "fixed", "important");
      Object.assign(document.body.style, {
        top: `${-scrollPos.current}px`,
        left: `${-scrollX}px`,
        right: "0px",
        height: "auto"
      });
      window.setTimeout(() => window.requestAnimationFrame(() => {
        const bottomBarHeight = innerHeight - window.innerHeight;
        if (bottomBarHeight && scrollPos.current >= innerHeight) {
          document.body.style.top = `${-(scrollPos.current + bottomBarHeight)}px`;
        }
      }), 300);
    }
  }, [
    isOpen
  ]);
  const restorePositionSetting = React.useCallback(() => {
    if (!isSafari()) return;
    if (previousBodyPosition !== null && !noBodyStyles) {
      const y = -parseInt(document.body.style.top, 10);
      const x = -parseInt(document.body.style.left, 10);
      Object.assign(document.body.style, previousBodyPosition);
      window.requestAnimationFrame(() => {
        if (preventScrollRestoration && activeUrl !== window.location.href) {
          setActiveUrl(window.location.href);
          return;
        }
        window.scrollTo(x, y);
      });
      previousBodyPosition = null;
    }
  }, [
    activeUrl
  ]);
  React.useEffect(() => {
    function onScroll() {
      scrollPos.current = window.scrollY;
    }
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  React.useEffect(() => {
    if (!modal) return;
    return () => {
      if (typeof document === "undefined") return;
      const hasDrawerOpened = !!document.querySelector("[data-vaul-drawer]");
      if (hasDrawerOpened) return;
      restorePositionSetting();
    };
  }, [
    modal,
    restorePositionSetting
  ]);
  React.useEffect(() => {
    if (nested || !hasBeenOpened) return;
    if (isOpen) {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      !isStandalone && setPositionFixed();
      if (!modal) {
        window.setTimeout(() => {
          restorePositionSetting();
        }, 500);
      }
    } else {
      restorePositionSetting();
    }
  }, [
    isOpen,
    hasBeenOpened,
    activeUrl,
    modal,
    nested,
    setPositionFixed,
    restorePositionSetting
  ]);
  return {
    restorePositionSetting
  };
}
function Root({ open: openProp, onOpenChange, children, onDrag: onDragProp, onRelease: onReleaseProp, snapPoints, shouldScaleBackground = false, setBackgroundColorOnScale = true, closeThreshold = CLOSE_THRESHOLD, scrollLockTimeout = SCROLL_LOCK_TIMEOUT, dismissible = true, handleOnly = false, fadeFromIndex = snapPoints && snapPoints.length - 1, activeSnapPoint: activeSnapPointProp, setActiveSnapPoint: setActiveSnapPointProp, fixed, modal = true, onClose, nested, noBodyStyles = false, direction = "bottom", defaultOpen = false, disablePreventScroll = true, snapToSequentialPoint = false, preventScrollRestoration = false, repositionInputs = true, onAnimationEnd, container, autoFocus = false }) {
  var _drawerRef_current, _drawerRef_current1;
  const [isOpen = false, setIsOpen] = useControllableState({
    defaultProp: defaultOpen,
    prop: openProp,
    onChange: (o) => {
      onOpenChange == null ? void 0 : onOpenChange(o);
      if (!o && !nested) {
        restorePositionSetting();
      }
      setTimeout(() => {
        onAnimationEnd == null ? void 0 : onAnimationEnd(o);
      }, TRANSITIONS.DURATION * 1e3);
      if (o && !modal) {
        if (typeof window !== "undefined") {
          window.requestAnimationFrame(() => {
            document.body.style.pointerEvents = "auto";
          });
        }
      }
      if (!o) {
        document.body.style.pointerEvents = "auto";
      }
    }
  });
  const [hasBeenOpened, setHasBeenOpened] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [justReleased, setJustReleased] = React.useState(false);
  const overlayRef = React.useRef(null);
  const openTime = React.useRef(null);
  const dragStartTime = React.useRef(null);
  const dragEndTime = React.useRef(null);
  const lastTimeDragPrevented = React.useRef(null);
  const isAllowedToDrag = React.useRef(false);
  const nestedOpenChangeTimer = React.useRef(null);
  const pointerStart = React.useRef(0);
  const keyboardIsOpen = React.useRef(false);
  const shouldAnimate = React.useRef(!defaultOpen);
  const previousDiffFromInitial = React.useRef(0);
  const drawerRef = React.useRef(null);
  const drawerHeightRef = React.useRef(((_drawerRef_current = drawerRef.current) == null ? void 0 : _drawerRef_current.getBoundingClientRect().height) || 0);
  const drawerWidthRef = React.useRef(((_drawerRef_current1 = drawerRef.current) == null ? void 0 : _drawerRef_current1.getBoundingClientRect().width) || 0);
  const initialDrawerHeight = React.useRef(0);
  const onSnapPointChange = React.useCallback((activeSnapPointIndex2) => {
    if (snapPoints && activeSnapPointIndex2 === snapPointsOffset.length - 1) openTime.current = /* @__PURE__ */ new Date();
  }, []);
  const { activeSnapPoint, activeSnapPointIndex, setActiveSnapPoint, onRelease: onReleaseSnapPoints, snapPointsOffset, onDrag: onDragSnapPoints, shouldFade, getPercentageDragged: getSnapPointsPercentageDragged } = useSnapPoints({
    snapPoints,
    activeSnapPointProp,
    setActiveSnapPointProp,
    drawerRef,
    fadeFromIndex,
    overlayRef,
    onSnapPointChange,
    direction,
    container,
    snapToSequentialPoint
  });
  usePreventScroll({
    isDisabled: !isOpen || isDragging || !modal || justReleased || !hasBeenOpened || !repositionInputs || !disablePreventScroll
  });
  const { restorePositionSetting } = usePositionFixed({
    isOpen,
    modal,
    nested: nested != null ? nested : false,
    hasBeenOpened,
    preventScrollRestoration,
    noBodyStyles
  });
  function getScale() {
    return (window.innerWidth - WINDOW_TOP_OFFSET) / window.innerWidth;
  }
  function onPress(event) {
    var _drawerRef_current2, _drawerRef_current12;
    if (!dismissible && !snapPoints) return;
    if (drawerRef.current && !drawerRef.current.contains(event.target)) return;
    drawerHeightRef.current = ((_drawerRef_current2 = drawerRef.current) == null ? void 0 : _drawerRef_current2.getBoundingClientRect().height) || 0;
    drawerWidthRef.current = ((_drawerRef_current12 = drawerRef.current) == null ? void 0 : _drawerRef_current12.getBoundingClientRect().width) || 0;
    setIsDragging(true);
    dragStartTime.current = /* @__PURE__ */ new Date();
    if (isIOS()) {
      window.addEventListener("touchend", () => isAllowedToDrag.current = false, {
        once: true
      });
    }
    event.target.setPointerCapture(event.pointerId);
    pointerStart.current = isVertical(direction) ? event.pageY : event.pageX;
  }
  function shouldDrag(el, isDraggingInDirection) {
    var _window_getSelection;
    let element = el;
    const highlightedText = (_window_getSelection = window.getSelection()) == null ? void 0 : _window_getSelection.toString();
    const swipeAmount = drawerRef.current ? getTranslate(drawerRef.current, direction) : null;
    const date = /* @__PURE__ */ new Date();
    if (element.tagName === "SELECT") {
      return false;
    }
    if (element.hasAttribute("data-vaul-no-drag") || element.closest("[data-vaul-no-drag]")) {
      return false;
    }
    if (direction === "right" || direction === "left") {
      return true;
    }
    if (openTime.current && date.getTime() - openTime.current.getTime() < 500) {
      return false;
    }
    if (swipeAmount !== null) {
      if (direction === "bottom" ? swipeAmount > 0 : swipeAmount < 0) {
        return true;
      }
    }
    if (highlightedText && highlightedText.length > 0) {
      return false;
    }
    if (lastTimeDragPrevented.current && date.getTime() - lastTimeDragPrevented.current.getTime() < scrollLockTimeout && swipeAmount === 0) {
      lastTimeDragPrevented.current = date;
      return false;
    }
    if (isDraggingInDirection) {
      lastTimeDragPrevented.current = date;
      return false;
    }
    while (element) {
      if (element.scrollHeight > element.clientHeight) {
        if (element.scrollTop !== 0) {
          lastTimeDragPrevented.current = /* @__PURE__ */ new Date();
          return false;
        }
        if (element.getAttribute("role") === "dialog") {
          return true;
        }
      }
      element = element.parentNode;
    }
    return true;
  }
  function onDrag(event) {
    if (!drawerRef.current) {
      return;
    }
    if (isDragging) {
      const directionMultiplier = direction === "bottom" || direction === "right" ? 1 : -1;
      const draggedDistance = (pointerStart.current - (isVertical(direction) ? event.pageY : event.pageX)) * directionMultiplier;
      const isDraggingInDirection = draggedDistance > 0;
      const noCloseSnapPointsPreCondition = snapPoints && !dismissible && !isDraggingInDirection;
      if (noCloseSnapPointsPreCondition && activeSnapPointIndex === 0) return;
      const absDraggedDistance = Math.abs(draggedDistance);
      const wrapper = document.querySelector("[data-vaul-drawer-wrapper]");
      const drawerDimension = direction === "bottom" || direction === "top" ? drawerHeightRef.current : drawerWidthRef.current;
      let percentageDragged = absDraggedDistance / drawerDimension;
      const snapPointPercentageDragged = getSnapPointsPercentageDragged(absDraggedDistance, isDraggingInDirection);
      if (snapPointPercentageDragged !== null) {
        percentageDragged = snapPointPercentageDragged;
      }
      if (noCloseSnapPointsPreCondition && percentageDragged >= 1) {
        return;
      }
      if (!isAllowedToDrag.current && !shouldDrag(event.target, isDraggingInDirection)) return;
      drawerRef.current.classList.add(DRAG_CLASS);
      isAllowedToDrag.current = true;
      set(drawerRef.current, {
        transition: "none"
      });
      set(overlayRef.current, {
        transition: "none"
      });
      if (snapPoints) {
        onDragSnapPoints({
          draggedDistance
        });
      }
      if (isDraggingInDirection && !snapPoints) {
        const dampenedDraggedDistance = dampenValue(draggedDistance);
        const translateValue = Math.min(dampenedDraggedDistance * -1, 0) * directionMultiplier;
        set(drawerRef.current, {
          transform: isVertical(direction) ? `translate3d(0, ${translateValue}px, 0)` : `translate3d(${translateValue}px, 0, 0)`
        });
        return;
      }
      const opacityValue = 1 - percentageDragged;
      if (shouldFade || fadeFromIndex && activeSnapPointIndex === fadeFromIndex - 1) {
        onDragProp == null ? void 0 : onDragProp(event, percentageDragged);
        set(overlayRef.current, {
          opacity: `${opacityValue}`,
          transition: "none"
        }, true);
      }
      if (wrapper && overlayRef.current && shouldScaleBackground) {
        const scaleValue = Math.min(getScale() + percentageDragged * (1 - getScale()), 1);
        const borderRadiusValue = 8 - percentageDragged * 8;
        const translateValue = Math.max(0, 14 - percentageDragged * 14);
        set(wrapper, {
          borderRadius: `${borderRadiusValue}px`,
          transform: isVertical(direction) ? `scale(${scaleValue}) translate3d(0, ${translateValue}px, 0)` : `scale(${scaleValue}) translate3d(${translateValue}px, 0, 0)`,
          transition: "none"
        }, true);
      }
      if (!snapPoints) {
        const translateValue = absDraggedDistance * directionMultiplier;
        set(drawerRef.current, {
          transform: isVertical(direction) ? `translate3d(0, ${translateValue}px, 0)` : `translate3d(${translateValue}px, 0, 0)`
        });
      }
    }
  }
  React.useEffect(() => {
    window.requestAnimationFrame(() => {
      shouldAnimate.current = true;
    });
  }, []);
  React.useEffect(() => {
    var _window_visualViewport;
    function onVisualViewportChange() {
      if (!drawerRef.current || !repositionInputs) return;
      const focusedElement = document.activeElement;
      if (isInput(focusedElement) || keyboardIsOpen.current) {
        var _window_visualViewport2;
        const visualViewportHeight = ((_window_visualViewport2 = window.visualViewport) == null ? void 0 : _window_visualViewport2.height) || 0;
        const totalHeight = window.innerHeight;
        let diffFromInitial = totalHeight - visualViewportHeight;
        const drawerHeight = drawerRef.current.getBoundingClientRect().height || 0;
        const isTallEnough = drawerHeight > totalHeight * 0.8;
        if (!initialDrawerHeight.current) {
          initialDrawerHeight.current = drawerHeight;
        }
        const offsetFromTop = drawerRef.current.getBoundingClientRect().top;
        if (Math.abs(previousDiffFromInitial.current - diffFromInitial) > 60) {
          keyboardIsOpen.current = !keyboardIsOpen.current;
        }
        if (snapPoints && snapPoints.length > 0 && snapPointsOffset && activeSnapPointIndex) {
          const activeSnapPointHeight = snapPointsOffset[activeSnapPointIndex] || 0;
          diffFromInitial += activeSnapPointHeight;
        }
        previousDiffFromInitial.current = diffFromInitial;
        if (drawerHeight > visualViewportHeight || keyboardIsOpen.current) {
          const height = drawerRef.current.getBoundingClientRect().height;
          let newDrawerHeight = height;
          if (height > visualViewportHeight) {
            newDrawerHeight = visualViewportHeight - (isTallEnough ? offsetFromTop : WINDOW_TOP_OFFSET);
          }
          if (fixed) {
            drawerRef.current.style.height = `${height - Math.max(diffFromInitial, 0)}px`;
          } else {
            drawerRef.current.style.height = `${Math.max(newDrawerHeight, visualViewportHeight - offsetFromTop)}px`;
          }
        } else if (!isMobileFirefox()) {
          drawerRef.current.style.height = `${initialDrawerHeight.current}px`;
        }
        if (snapPoints && snapPoints.length > 0 && !keyboardIsOpen.current) {
          drawerRef.current.style.bottom = `0px`;
        } else {
          drawerRef.current.style.bottom = `${Math.max(diffFromInitial, 0)}px`;
        }
      }
    }
    (_window_visualViewport = window.visualViewport) == null ? void 0 : _window_visualViewport.addEventListener("resize", onVisualViewportChange);
    return () => {
      var _window_visualViewport2;
      return (_window_visualViewport2 = window.visualViewport) == null ? void 0 : _window_visualViewport2.removeEventListener("resize", onVisualViewportChange);
    };
  }, [
    activeSnapPointIndex,
    snapPoints,
    snapPointsOffset
  ]);
  function closeDrawer(fromWithin) {
    cancelDrag();
    onClose == null ? void 0 : onClose();
    if (!fromWithin) {
      setIsOpen(false);
    }
    setTimeout(() => {
      if (snapPoints) {
        setActiveSnapPoint(snapPoints[0]);
      }
    }, TRANSITIONS.DURATION * 1e3);
  }
  function resetDrawer() {
    if (!drawerRef.current) return;
    const wrapper = document.querySelector("[data-vaul-drawer-wrapper]");
    const currentSwipeAmount = getTranslate(drawerRef.current, direction);
    set(drawerRef.current, {
      transform: "translate3d(0, 0, 0)",
      transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`
    });
    set(overlayRef.current, {
      transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
      opacity: "1"
    });
    if (shouldScaleBackground && currentSwipeAmount && currentSwipeAmount > 0 && isOpen) {
      set(wrapper, {
        borderRadius: `${BORDER_RADIUS}px`,
        overflow: "hidden",
        ...isVertical(direction) ? {
          transform: `scale(${getScale()}) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)`,
          transformOrigin: "top"
        } : {
          transform: `scale(${getScale()}) translate3d(calc(env(safe-area-inset-top) + 14px), 0, 0)`,
          transformOrigin: "left"
        },
        transitionProperty: "transform, border-radius",
        transitionDuration: `${TRANSITIONS.DURATION}s`,
        transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(",")})`
      }, true);
    }
  }
  function cancelDrag() {
    if (!isDragging || !drawerRef.current) return;
    drawerRef.current.classList.remove(DRAG_CLASS);
    isAllowedToDrag.current = false;
    setIsDragging(false);
    dragEndTime.current = /* @__PURE__ */ new Date();
  }
  function onRelease(event) {
    if (!isDragging || !drawerRef.current) return;
    drawerRef.current.classList.remove(DRAG_CLASS);
    isAllowedToDrag.current = false;
    setIsDragging(false);
    dragEndTime.current = /* @__PURE__ */ new Date();
    const swipeAmount = getTranslate(drawerRef.current, direction);
    if (!event || !shouldDrag(event.target, false) || !swipeAmount || Number.isNaN(swipeAmount)) return;
    if (dragStartTime.current === null) return;
    const timeTaken = dragEndTime.current.getTime() - dragStartTime.current.getTime();
    const distMoved = pointerStart.current - (isVertical(direction) ? event.pageY : event.pageX);
    const velocity = Math.abs(distMoved) / timeTaken;
    if (velocity > 0.05) {
      setJustReleased(true);
      setTimeout(() => {
        setJustReleased(false);
      }, 200);
    }
    if (snapPoints) {
      const directionMultiplier = direction === "bottom" || direction === "right" ? 1 : -1;
      onReleaseSnapPoints({
        draggedDistance: distMoved * directionMultiplier,
        closeDrawer,
        velocity,
        dismissible
      });
      onReleaseProp == null ? void 0 : onReleaseProp(event, true);
      return;
    }
    if (direction === "bottom" || direction === "right" ? distMoved > 0 : distMoved < 0) {
      resetDrawer();
      onReleaseProp == null ? void 0 : onReleaseProp(event, true);
      return;
    }
    if (velocity > VELOCITY_THRESHOLD) {
      closeDrawer();
      onReleaseProp == null ? void 0 : onReleaseProp(event, false);
      return;
    }
    var _drawerRef_current_getBoundingClientRect_height;
    const visibleDrawerHeight = Math.min((_drawerRef_current_getBoundingClientRect_height = drawerRef.current.getBoundingClientRect().height) != null ? _drawerRef_current_getBoundingClientRect_height : 0, window.innerHeight);
    var _drawerRef_current_getBoundingClientRect_width;
    const visibleDrawerWidth = Math.min((_drawerRef_current_getBoundingClientRect_width = drawerRef.current.getBoundingClientRect().width) != null ? _drawerRef_current_getBoundingClientRect_width : 0, window.innerWidth);
    const isHorizontalSwipe = direction === "left" || direction === "right";
    if (Math.abs(swipeAmount) >= (isHorizontalSwipe ? visibleDrawerWidth : visibleDrawerHeight) * closeThreshold) {
      closeDrawer();
      onReleaseProp == null ? void 0 : onReleaseProp(event, false);
      return;
    }
    onReleaseProp == null ? void 0 : onReleaseProp(event, true);
    resetDrawer();
  }
  React.useEffect(() => {
    if (isOpen) {
      set(document.documentElement, {
        scrollBehavior: "auto"
      });
      openTime.current = /* @__PURE__ */ new Date();
    }
    return () => {
      reset(document.documentElement, "scrollBehavior");
    };
  }, [
    isOpen
  ]);
  function onNestedOpenChange(o) {
    const scale = o ? (window.innerWidth - NESTED_DISPLACEMENT) / window.innerWidth : 1;
    const initialTranslate = o ? -NESTED_DISPLACEMENT : 0;
    if (nestedOpenChangeTimer.current) {
      window.clearTimeout(nestedOpenChangeTimer.current);
    }
    set(drawerRef.current, {
      transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
      transform: isVertical(direction) ? `scale(${scale}) translate3d(0, ${initialTranslate}px, 0)` : `scale(${scale}) translate3d(${initialTranslate}px, 0, 0)`
    });
    if (!o && drawerRef.current) {
      nestedOpenChangeTimer.current = setTimeout(() => {
        const translateValue = getTranslate(drawerRef.current, direction);
        set(drawerRef.current, {
          transition: "none",
          transform: isVertical(direction) ? `translate3d(0, ${translateValue}px, 0)` : `translate3d(${translateValue}px, 0, 0)`
        });
      }, 500);
    }
  }
  function onNestedDrag(_event, percentageDragged) {
    if (percentageDragged < 0) return;
    const initialScale = (window.innerWidth - NESTED_DISPLACEMENT) / window.innerWidth;
    const newScale = initialScale + percentageDragged * (1 - initialScale);
    const newTranslate = -NESTED_DISPLACEMENT + percentageDragged * NESTED_DISPLACEMENT;
    set(drawerRef.current, {
      transform: isVertical(direction) ? `scale(${newScale}) translate3d(0, ${newTranslate}px, 0)` : `scale(${newScale}) translate3d(${newTranslate}px, 0, 0)`,
      transition: "none"
    });
  }
  function onNestedRelease(_event, o) {
    const dim = isVertical(direction) ? window.innerHeight : window.innerWidth;
    const scale = o ? (dim - NESTED_DISPLACEMENT) / dim : 1;
    const translate = o ? -NESTED_DISPLACEMENT : 0;
    if (o) {
      set(drawerRef.current, {
        transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
        transform: isVertical(direction) ? `scale(${scale}) translate3d(0, ${translate}px, 0)` : `scale(${scale}) translate3d(${translate}px, 0, 0)`
      });
    }
  }
  React.useEffect(() => {
    if (!modal) {
      window.requestAnimationFrame(() => {
        document.body.style.pointerEvents = "auto";
      });
    }
  }, [
    modal
  ]);
  return /* @__PURE__ */ React.createElement(Root$1, {
    defaultOpen,
    onOpenChange: (open) => {
      if (!dismissible && !open) return;
      if (open) {
        setHasBeenOpened(true);
      } else {
        closeDrawer(true);
      }
      setIsOpen(open);
    },
    open: isOpen
  }, /* @__PURE__ */ React.createElement(DrawerContext.Provider, {
    value: {
      activeSnapPoint,
      snapPoints,
      setActiveSnapPoint,
      drawerRef,
      overlayRef,
      onOpenChange,
      onPress,
      onRelease,
      onDrag,
      dismissible,
      shouldAnimate,
      handleOnly,
      isOpen,
      isDragging,
      shouldFade,
      closeDrawer,
      onNestedDrag,
      onNestedOpenChange,
      onNestedRelease,
      keyboardIsOpen,
      modal,
      snapPointsOffset,
      activeSnapPointIndex,
      direction,
      shouldScaleBackground,
      setBackgroundColorOnScale,
      noBodyStyles,
      container,
      autoFocus
    }
  }, children));
}
const Overlay = /* @__PURE__ */ React.forwardRef(function({ ...rest }, ref) {
  const { overlayRef, snapPoints, onRelease, shouldFade, isOpen, modal, shouldAnimate } = useDrawerContext();
  const composedRef = useComposedRefs(ref, overlayRef);
  const hasSnapPoints = snapPoints && snapPoints.length > 0;
  if (!modal) {
    return null;
  }
  const onMouseUp = React.useCallback((event) => onRelease(event), [
    onRelease
  ]);
  return /* @__PURE__ */ React.createElement(Overlay$1, {
    onMouseUp,
    ref: composedRef,
    "data-vaul-overlay": "",
    "data-vaul-snap-points": isOpen && hasSnapPoints ? "true" : "false",
    "data-vaul-snap-points-overlay": isOpen && shouldFade ? "true" : "false",
    "data-vaul-animate": (shouldAnimate == null ? void 0 : shouldAnimate.current) ? "true" : "false",
    ...rest
  });
});
Overlay.displayName = "Drawer.Overlay";
const Content = /* @__PURE__ */ React.forwardRef(function({ onPointerDownOutside, style, onOpenAutoFocus, ...rest }, ref) {
  const { drawerRef, onPress, onRelease, onDrag, keyboardIsOpen, snapPointsOffset, activeSnapPointIndex, modal, isOpen, direction, snapPoints, container, handleOnly, shouldAnimate, autoFocus } = useDrawerContext();
  const [delayedSnapPoints, setDelayedSnapPoints] = React.useState(false);
  const composedRef = useComposedRefs(ref, drawerRef);
  const pointerStartRef = React.useRef(null);
  const lastKnownPointerEventRef = React.useRef(null);
  const wasBeyondThePointRef = React.useRef(false);
  const hasSnapPoints = snapPoints && snapPoints.length > 0;
  useScaleBackground();
  const isDeltaInDirection = (delta, direction2, threshold = 0) => {
    if (wasBeyondThePointRef.current) return true;
    const deltaY = Math.abs(delta.y);
    const deltaX = Math.abs(delta.x);
    const isDeltaX = deltaX > deltaY;
    const dFactor = [
      "bottom",
      "right"
    ].includes(direction2) ? 1 : -1;
    if (direction2 === "left" || direction2 === "right") {
      const isReverseDirection = delta.x * dFactor < 0;
      if (!isReverseDirection && deltaX >= 0 && deltaX <= threshold) {
        return isDeltaX;
      }
    } else {
      const isReverseDirection = delta.y * dFactor < 0;
      if (!isReverseDirection && deltaY >= 0 && deltaY <= threshold) {
        return !isDeltaX;
      }
    }
    wasBeyondThePointRef.current = true;
    return true;
  };
  React.useEffect(() => {
    if (hasSnapPoints) {
      window.requestAnimationFrame(() => {
        setDelayedSnapPoints(true);
      });
    }
  }, []);
  function handleOnPointerUp(event) {
    pointerStartRef.current = null;
    wasBeyondThePointRef.current = false;
    onRelease(event);
  }
  return /* @__PURE__ */ React.createElement(Content$1, {
    "data-vaul-drawer-direction": direction,
    "data-vaul-drawer": "",
    "data-vaul-delayed-snap-points": delayedSnapPoints ? "true" : "false",
    "data-vaul-snap-points": isOpen && hasSnapPoints ? "true" : "false",
    "data-vaul-custom-container": container ? "true" : "false",
    "data-vaul-animate": (shouldAnimate == null ? void 0 : shouldAnimate.current) ? "true" : "false",
    ...rest,
    ref: composedRef,
    style: snapPointsOffset && snapPointsOffset.length > 0 ? {
      "--snap-point-height": `${snapPointsOffset[activeSnapPointIndex != null ? activeSnapPointIndex : 0]}px`,
      ...style
    } : style,
    onPointerDown: (event) => {
      if (handleOnly) return;
      rest.onPointerDown == null ? void 0 : rest.onPointerDown.call(rest, event);
      pointerStartRef.current = {
        x: event.pageX,
        y: event.pageY
      };
      onPress(event);
    },
    onOpenAutoFocus: (e) => {
      onOpenAutoFocus == null ? void 0 : onOpenAutoFocus(e);
      if (!autoFocus) {
        e.preventDefault();
      }
    },
    onPointerDownOutside: (e) => {
      onPointerDownOutside == null ? void 0 : onPointerDownOutside(e);
      if (!modal || e.defaultPrevented) {
        e.preventDefault();
        return;
      }
      if (keyboardIsOpen.current) {
        keyboardIsOpen.current = false;
      }
    },
    onFocusOutside: (e) => {
      if (!modal) {
        e.preventDefault();
        return;
      }
    },
    onPointerMove: (event) => {
      lastKnownPointerEventRef.current = event;
      if (handleOnly) return;
      rest.onPointerMove == null ? void 0 : rest.onPointerMove.call(rest, event);
      if (!pointerStartRef.current) return;
      const yPosition = event.pageY - pointerStartRef.current.y;
      const xPosition = event.pageX - pointerStartRef.current.x;
      const swipeStartThreshold = event.pointerType === "touch" ? 10 : 2;
      const delta = {
        x: xPosition,
        y: yPosition
      };
      const isAllowedToSwipe = isDeltaInDirection(delta, direction, swipeStartThreshold);
      if (isAllowedToSwipe) onDrag(event);
      else if (Math.abs(xPosition) > swipeStartThreshold || Math.abs(yPosition) > swipeStartThreshold) {
        pointerStartRef.current = null;
      }
    },
    onPointerUp: (event) => {
      rest.onPointerUp == null ? void 0 : rest.onPointerUp.call(rest, event);
      pointerStartRef.current = null;
      wasBeyondThePointRef.current = false;
      onRelease(event);
    },
    onPointerOut: (event) => {
      rest.onPointerOut == null ? void 0 : rest.onPointerOut.call(rest, event);
      handleOnPointerUp(lastKnownPointerEventRef.current);
    },
    onContextMenu: (event) => {
      rest.onContextMenu == null ? void 0 : rest.onContextMenu.call(rest, event);
      if (lastKnownPointerEventRef.current) {
        handleOnPointerUp(lastKnownPointerEventRef.current);
      }
    }
  });
});
Content.displayName = "Drawer.Content";
const LONG_HANDLE_PRESS_TIMEOUT = 250;
const DOUBLE_TAP_TIMEOUT = 120;
const Handle = /* @__PURE__ */ React.forwardRef(function({ preventCycle = false, children, ...rest }, ref) {
  const { closeDrawer, isDragging, snapPoints, activeSnapPoint, setActiveSnapPoint, dismissible, handleOnly, isOpen, onPress, onDrag } = useDrawerContext();
  const closeTimeoutIdRef = React.useRef(null);
  const shouldCancelInteractionRef = React.useRef(false);
  function handleStartCycle() {
    if (shouldCancelInteractionRef.current) {
      handleCancelInteraction();
      return;
    }
    window.setTimeout(() => {
      handleCycleSnapPoints();
    }, DOUBLE_TAP_TIMEOUT);
  }
  function handleCycleSnapPoints() {
    if (isDragging || preventCycle || shouldCancelInteractionRef.current) {
      handleCancelInteraction();
      return;
    }
    handleCancelInteraction();
    if (!snapPoints || snapPoints.length === 0) {
      if (!dismissible) {
        closeDrawer();
      }
      return;
    }
    const isLastSnapPoint = activeSnapPoint === snapPoints[snapPoints.length - 1];
    if (isLastSnapPoint && dismissible) {
      closeDrawer();
      return;
    }
    const currentSnapIndex = snapPoints.findIndex((point) => point === activeSnapPoint);
    if (currentSnapIndex === -1) return;
    const nextSnapPoint = snapPoints[currentSnapIndex + 1];
    setActiveSnapPoint(nextSnapPoint);
  }
  function handleStartInteraction() {
    closeTimeoutIdRef.current = window.setTimeout(() => {
      shouldCancelInteractionRef.current = true;
    }, LONG_HANDLE_PRESS_TIMEOUT);
  }
  function handleCancelInteraction() {
    if (closeTimeoutIdRef.current) {
      window.clearTimeout(closeTimeoutIdRef.current);
    }
    shouldCancelInteractionRef.current = false;
  }
  return /* @__PURE__ */ React.createElement("div", {
    onClick: handleStartCycle,
    onPointerCancel: handleCancelInteraction,
    onPointerDown: (e) => {
      if (handleOnly) onPress(e);
      handleStartInteraction();
    },
    onPointerMove: (e) => {
      if (handleOnly) onDrag(e);
    },
    // onPointerUp is already handled by the content component
    ref,
    "data-vaul-drawer-visible": isOpen ? "true" : "false",
    "data-vaul-handle": "",
    "aria-hidden": "true",
    ...rest
  }, /* @__PURE__ */ React.createElement("span", {
    "data-vaul-handle-hitarea": "",
    "aria-hidden": "true"
  }, children));
});
Handle.displayName = "Drawer.Handle";
function Portal(props) {
  const context = useDrawerContext();
  const { container = context.container, ...portalProps } = props;
  return /* @__PURE__ */ React.createElement(Portal$1, {
    container,
    ...portalProps
  });
}
const Drawer$1 = {
  Root,
  Content,
  Overlay,
  Portal,
  Title,
  Description
};
const Drawer = ({
  shouldScaleBackground = true,
  ...props
}) => /* @__PURE__ */ jsxRuntimeExports.jsx(Drawer$1.Root, { shouldScaleBackground, ...props });
Drawer.displayName = "Drawer";
const DrawerPortal = Drawer$1.Portal;
const DrawerOverlay = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Drawer$1.Overlay,
  {
    ref,
    className: cn("fixed inset-0 z-50 bg-black/80", className),
    ...props
  }
));
DrawerOverlay.displayName = Drawer$1.Overlay.displayName;
const DrawerContent = reactExports.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs(DrawerPortal, { children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx(DrawerOverlay, {}),
  /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Drawer$1.Content,
    {
      ref,
      className: cn(
        "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
        className
      ),
      ...props,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" }),
        children
      ]
    }
  )
] }));
DrawerContent.displayName = "DrawerContent";
const DrawerHeader = ({ className, ...props }) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("grid gap-1.5 p-4 text-center sm:text-left", className), ...props });
DrawerHeader.displayName = "DrawerHeader";
const DrawerFooter = ({ className, ...props }) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("mt-auto flex flex-col gap-2 p-4", className), ...props });
DrawerFooter.displayName = "DrawerFooter";
const DrawerTitle = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Drawer$1.Title,
  {
    ref,
    className: cn("text-lg font-semibold leading-none tracking-tight", className),
    ...props
  }
));
DrawerTitle.displayName = Drawer$1.Title.displayName;
const DrawerDescription = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Drawer$1.Description,
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
DrawerDescription.displayName = Drawer$1.Description.displayName;
function gt(e, t) {
  const n = getComputedStyle(e), o = parseFloat(n.fontSize);
  return t * o;
}
function yt(e, t) {
  const n = getComputedStyle(e.ownerDocument.body), o = parseFloat(n.fontSize);
  return t * o;
}
function St(e) {
  return e / 100 * window.innerHeight;
}
function vt(e) {
  return e / 100 * window.innerWidth;
}
function bt(e) {
  switch (typeof e) {
    case "number":
      return [e, "px"];
    case "string": {
      const t = parseFloat(e);
      return e.endsWith("%") ? [t, "%"] : e.endsWith("px") ? [t, "px"] : e.endsWith("rem") ? [t, "rem"] : e.endsWith("em") ? [t, "em"] : e.endsWith("vh") ? [t, "vh"] : e.endsWith("vw") ? [t, "vw"] : [t, "%"];
    }
  }
}
function ie({
  groupSize: e,
  panelElement: t,
  styleProp: n
}) {
  let o;
  const [i, s] = bt(n);
  switch (s) {
    case "%": {
      o = i / 100 * e;
      break;
    }
    case "px": {
      o = i;
      break;
    }
    case "rem": {
      o = yt(t, i);
      break;
    }
    case "em": {
      o = gt(t, i);
      break;
    }
    case "vh": {
      o = St(i);
      break;
    }
    case "vw": {
      o = vt(i);
      break;
    }
  }
  return o;
}
function T(e) {
  return parseFloat(e.toFixed(3));
}
function ne({
  group: e
}) {
  const { orientation: t, panels: n } = e;
  return n.reduce((o, i) => (o += t === "horizontal" ? i.element.offsetWidth : i.element.offsetHeight, o), 0);
}
function ve(e) {
  const { panels: t } = e, n = ne({ group: e });
  return n === 0 ? t.map((o) => ({
    groupResizeBehavior: o.panelConstraints.groupResizeBehavior,
    collapsedSize: 0,
    collapsible: o.panelConstraints.collapsible === true,
    defaultSize: void 0,
    disabled: o.panelConstraints.disabled,
    minSize: 0,
    maxSize: 100,
    panelId: o.id
  })) : t.map((o) => {
    const { element: i, panelConstraints: s } = o;
    let l = 0;
    if (s.collapsedSize !== void 0) {
      const f = ie({
        groupSize: n,
        panelElement: i,
        styleProp: s.collapsedSize
      });
      l = T(f / n * 100);
    }
    let r;
    if (s.defaultSize !== void 0) {
      const f = ie({
        groupSize: n,
        panelElement: i,
        styleProp: s.defaultSize
      });
      r = T(f / n * 100);
    }
    let a = 0;
    if (s.minSize !== void 0) {
      const f = ie({
        groupSize: n,
        panelElement: i,
        styleProp: s.minSize
      });
      a = T(f / n * 100);
    }
    let c = 100;
    if (s.maxSize !== void 0) {
      const f = ie({
        groupSize: n,
        panelElement: i,
        styleProp: s.maxSize
      });
      c = T(f / n * 100);
    }
    return {
      groupResizeBehavior: s.groupResizeBehavior,
      collapsedSize: l,
      collapsible: s.collapsible === true,
      defaultSize: r,
      disabled: s.disabled,
      minSize: a,
      maxSize: c,
      panelId: o.id
    };
  });
}
function C(e, t = "Assertion error") {
  if (!e)
    throw Error(t);
}
function be(e, t) {
  return Array.from(t).sort(
    e === "horizontal" ? zt : xt
  );
}
function zt(e, t) {
  const n = e.element.offsetLeft - t.element.offsetLeft;
  return n !== 0 ? n : e.element.offsetWidth - t.element.offsetWidth;
}
function xt(e, t) {
  const n = e.element.offsetTop - t.element.offsetTop;
  return n !== 0 ? n : e.element.offsetHeight - t.element.offsetHeight;
}
function qe(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.ELEMENT_NODE;
}
function Ye(e, t) {
  return {
    x: e.x >= t.left && e.x <= t.right ? 0 : Math.min(
      Math.abs(e.x - t.left),
      Math.abs(e.x - t.right)
    ),
    y: e.y >= t.top && e.y <= t.bottom ? 0 : Math.min(
      Math.abs(e.y - t.top),
      Math.abs(e.y - t.bottom)
    )
  };
}
function wt({
  orientation: e,
  rects: t,
  targetRect: n
}) {
  const o = {
    x: n.x + n.width / 2,
    y: n.y + n.height / 2
  };
  let i, s = Number.MAX_VALUE;
  for (const l of t) {
    const { x: r, y: a } = Ye(o, l), c = e === "horizontal" ? r : a;
    c < s && (s = c, i = l);
  }
  return C(i, "No rect found"), i;
}
let fe;
function Pt() {
  return fe === void 0 && (typeof matchMedia == "function" ? fe = !!matchMedia("(pointer:coarse)").matches : fe = false), fe;
}
function Je(e) {
  const { element: t, orientation: n, panels: o, separators: i } = e, s = be(
    n,
    Array.from(t.children).filter(qe).map((x) => ({ element: x }))
  ).map(({ element: x }) => x), l = [];
  let r = false, a = false, c = -1, f = -1, g = 0, d, b = [];
  {
    let x = -1;
    for (const u of s)
      u.hasAttribute("data-panel") && (x++, u.hasAttribute("data-disabled") || (g++, c === -1 && (c = x), f = x));
  }
  if (g > 1) {
    let x = -1;
    for (const u of s)
      if (u.hasAttribute("data-panel")) {
        x++;
        const p = o.find(
          (m) => m.element === u
        );
        if (p) {
          if (d) {
            const m = d.element.getBoundingClientRect(), S = u.getBoundingClientRect();
            let v;
            if (a) {
              const y = n === "horizontal" ? new DOMRect(
                m.right,
                m.top,
                0,
                m.height
              ) : new DOMRect(
                m.left,
                m.bottom,
                m.width,
                0
              ), h = n === "horizontal" ? new DOMRect(S.left, S.top, 0, S.height) : new DOMRect(S.left, S.top, S.width, 0);
              switch (b.length) {
                case 0: {
                  v = [
                    y,
                    h
                  ];
                  break;
                }
                case 1: {
                  const w = b[0], M = wt({
                    orientation: n,
                    rects: [m, S],
                    targetRect: w.element.getBoundingClientRect()
                  });
                  v = [
                    w,
                    M === m ? h : y
                  ];
                  break;
                }
                default: {
                  v = b;
                  break;
                }
              }
            } else
              b.length ? v = b : v = [
                n === "horizontal" ? new DOMRect(
                  m.right,
                  S.top,
                  S.left - m.right,
                  S.height
                ) : new DOMRect(
                  S.left,
                  m.bottom,
                  S.width,
                  S.top - m.bottom
                )
              ];
            for (const y of v) {
              let h = "width" in y ? y : y.element.getBoundingClientRect();
              const w = Pt() ? e.resizeTargetMinimumSize.coarse : e.resizeTargetMinimumSize.fine;
              if (h.width < w) {
                const P = w - h.width;
                h = new DOMRect(
                  h.x - P / 2,
                  h.y,
                  h.width + P,
                  h.height
                );
              }
              if (h.height < w) {
                const P = w - h.height;
                h = new DOMRect(
                  h.x,
                  h.y - P / 2,
                  h.width,
                  h.height + P
                );
              }
              const M = x <= c || x > f;
              !r && !M && l.push({
                group: e,
                groupSize: ne({ group: e }),
                panels: [d, p],
                separator: "width" in y ? void 0 : y,
                rect: h
              }), r = false;
            }
          }
          a = false, d = p, b = [];
        }
      } else if (u.hasAttribute("data-separator")) {
        u.ariaDisabled !== null && (r = true);
        const p = i.find(
          (m) => m.element === u
        );
        p ? b.push(p) : (d = void 0, b = []);
      } else
        a = true;
  }
  return l;
}
class Ze {
  #e = {};
  addListener(t, n) {
    const o = this.#e[t];
    return o === void 0 ? this.#e[t] = [n] : o.includes(n) || o.push(n), () => {
      this.removeListener(t, n);
    };
  }
  emit(t, n) {
    const o = this.#e[t];
    if (o !== void 0)
      if (o.length === 1)
        o[0].call(null, n);
      else {
        let i = false, s = null;
        const l = Array.from(o);
        for (let r = 0; r < l.length; r++) {
          const a = l[r];
          try {
            a.call(null, n);
          } catch (c) {
            s === null && (i = true, s = c);
          }
        }
        if (i)
          throw s;
      }
  }
  removeAllListeners() {
    this.#e = {};
  }
  removeListener(t, n) {
    const o = this.#e[t];
    if (o !== void 0) {
      const i = o.indexOf(n);
      i >= 0 && o.splice(i, 1);
    }
  }
}
let F = /* @__PURE__ */ new Map();
const Qe = new Ze();
function Lt(e) {
  F = new Map(F), F.delete(e);
}
function ke(e, t) {
  for (const [n] of F)
    if (n.id === e)
      return n;
}
function H(e, t) {
  for (const [n, o] of F)
    if (n.id === e)
      return o;
  if (t)
    throw Error(`Could not find data for Group with id ${e}`);
}
function X() {
  return F;
}
function ze(e, t) {
  return Qe.addListener("groupChange", (n) => {
    n.group.id === e && t(n);
  });
}
function $(e, t) {
  const n = F.get(e);
  F = new Map(F), F.set(e, t), Qe.emit("groupChange", {
    group: e,
    prev: n,
    next: t
  });
}
function Ct(e, t, n) {
  let o, i = {
    x: 1 / 0,
    y: 1 / 0
  };
  for (const s of t) {
    const l = Ye(n, s.rect);
    switch (e) {
      case "horizontal": {
        l.x <= i.x && (o = s, i = l);
        break;
      }
      case "vertical": {
        l.y <= i.y && (o = s, i = l);
        break;
      }
    }
  }
  return o ? {
    distance: i,
    hitRegion: o
  } : void 0;
}
function Rt(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}
function Mt(e, t) {
  if (e === t) throw new Error("Cannot compare node with itself");
  const n = {
    a: Te(e),
    b: Te(t)
  };
  let o;
  for (; n.a.at(-1) === n.b.at(-1); )
    o = n.a.pop(), n.b.pop();
  C(
    o,
    "Stacking order can only be calculated for elements with a common ancestor"
  );
  const i = {
    a: De(Ie(n.a)),
    b: De(Ie(n.b))
  };
  if (i.a === i.b) {
    const s = o.childNodes, l = {
      a: n.a.at(-1),
      b: n.b.at(-1)
    };
    let r = s.length;
    for (; r--; ) {
      const a = s[r];
      if (a === l.a) return 1;
      if (a === l.b) return -1;
    }
  }
  return Math.sign(i.a - i.b);
}
const Et = /\b(?:position|zIndex|opacity|transform|webkitTransform|mixBlendMode|filter|webkitFilter|isolation)\b/;
function kt(e) {
  const t = getComputedStyle(et(e) ?? e).display;
  return t === "flex" || t === "inline-flex";
}
function It(e) {
  const t = getComputedStyle(e);
  return !!(t.position === "fixed" || t.zIndex !== "auto" && (t.position !== "static" || kt(e)) || +t.opacity < 1 || "transform" in t && t.transform !== "none" || "webkitTransform" in t && t.webkitTransform !== "none" || "mixBlendMode" in t && t.mixBlendMode !== "normal" || "filter" in t && t.filter !== "none" || "webkitFilter" in t && t.webkitFilter !== "none" || "isolation" in t && t.isolation === "isolate" || Et.test(t.willChange) || t.webkitOverflowScrolling === "touch");
}
function Ie(e) {
  let t = e.length;
  for (; t--; ) {
    const n = e[t];
    if (C(n, "Missing node"), It(n)) return n;
  }
  return null;
}
function De(e) {
  return e && Number(getComputedStyle(e).zIndex) || 0;
}
function Te(e) {
  const t = [];
  for (; e; )
    t.push(e), e = et(e);
  return t;
}
function et(e) {
  const { parentNode: t } = e;
  return Rt(t) ? t.host : t;
}
function Dt(e, t) {
  return e.x < t.x + t.width && e.x + e.width > t.x && e.y < t.y + t.height && e.y + e.height > t.y;
}
function Tt({
  groupElement: e,
  hitRegion: t,
  pointerEventTarget: n
}) {
  if (!qe(n) || n.contains(e) || e.contains(n))
    return true;
  if (Mt(n, e) > 0) {
    let o = n;
    for (; o; ) {
      if (o.contains(e))
        return true;
      if (Dt(o.getBoundingClientRect(), t))
        return false;
      o = o.parentElement;
    }
  }
  return true;
}
function xe(e, t) {
  const n = [];
  return t.forEach((o, i) => {
    if (i.disabled)
      return;
    const s = Je(i), l = Ct(i.orientation, s, {
      x: e.clientX,
      y: e.clientY
    });
    l && l.distance.x <= 0 && l.distance.y <= 0 && Tt({
      groupElement: i.element,
      hitRegion: l.hitRegion.rect,
      pointerEventTarget: e.target
    }) && n.push(l.hitRegion);
  }), n;
}
function Ot(e, t) {
  if (e.length !== t.length)
    return false;
  for (let n = 0; n < e.length; n++)
    if (e[n] != t[n])
      return false;
  return true;
}
function D(e, t, n = 0) {
  return Math.abs(T(e) - T(t)) <= n;
}
function A(e, t) {
  return D(e, t) ? 0 : e > t ? 1 : -1;
}
function Z({
  overrideDisabledPanels: e,
  panelConstraints: t,
  prevSize: n,
  size: o
}) {
  const {
    collapsedSize: i = 0,
    collapsible: s,
    disabled: l,
    maxSize: r = 100,
    minSize: a = 0
  } = t;
  if (l && !e)
    return n;
  if (A(o, a) < 0)
    if (s) {
      const c = (i + a) / 2;
      A(o, c) < 0 ? o = i : o = a;
    } else
      o = a;
  return o = Math.min(r, o), o = T(o), o;
}
function le({
  delta: e,
  initialLayout: t,
  panelConstraints: n,
  pivotIndices: o,
  prevLayout: i,
  trigger: s
}) {
  if (D(e, 0))
    return t;
  const l = s === "imperative-api", r = Object.values(t), a = Object.values(i), c = [...r], [f, g] = o;
  C(f != null, "Invalid first pivot index"), C(g != null, "Invalid second pivot index");
  let d = 0;
  switch (s) {
    case "keyboard": {
      {
        const u = e < 0 ? g : f, p = n[u];
        C(
          p,
          `Panel constraints not found for index ${u}`
        );
        const {
          collapsedSize: m = 0,
          collapsible: S,
          minSize: v = 0
        } = p;
        if (S) {
          const y = r[u];
          if (C(
            y != null,
            `Previous layout not found for panel index ${u}`
          ), D(y, m)) {
            const h = v - y;
            A(h, Math.abs(e)) > 0 && (e = e < 0 ? 0 - h : h);
          }
        }
      }
      {
        const u = e < 0 ? f : g, p = n[u];
        C(
          p,
          `No panel constraints found for index ${u}`
        );
        const {
          collapsedSize: m = 0,
          collapsible: S,
          minSize: v = 0
        } = p;
        if (S) {
          const y = r[u];
          if (C(
            y != null,
            `Previous layout not found for panel index ${u}`
          ), D(y, v)) {
            const h = y - m;
            A(h, Math.abs(e)) > 0 && (e = e < 0 ? 0 - h : h);
          }
        }
      }
      break;
    }
    default: {
      const u = e < 0 ? g : f, p = n[u];
      C(
        p,
        `Panel constraints not found for index ${u}`
      );
      const m = r[u], { collapsible: S, collapsedSize: v, minSize: y } = p;
      if (S && A(m, y) < 0)
        if (e > 0) {
          const h = y - v, w = h / 2, M = m + e;
          A(M, y) < 0 && (e = A(e, w) <= 0 ? 0 : h);
        } else {
          const h = y - v, w = 100 - h / 2, M = m - e;
          A(M, y) < 0 && (e = A(100 + e, w) > 0 ? 0 : -h);
        }
      break;
    }
  }
  {
    const u = e < 0 ? 1 : -1;
    let p = e < 0 ? g : f, m = 0;
    for (; ; ) {
      const v = r[p];
      C(
        v != null,
        `Previous layout not found for panel index ${p}`
      );
      const h = Z({
        overrideDisabledPanels: l,
        panelConstraints: n[p],
        prevSize: v,
        size: 100
      }) - v;
      if (m += h, p += u, p < 0 || p >= n.length)
        break;
    }
    const S = Math.min(Math.abs(e), Math.abs(m));
    e = e < 0 ? 0 - S : S;
  }
  {
    let p = e < 0 ? f : g;
    for (; p >= 0 && p < n.length; ) {
      const m = Math.abs(e) - Math.abs(d), S = r[p];
      C(
        S != null,
        `Previous layout not found for panel index ${p}`
      );
      const v = S - m, y = Z({
        overrideDisabledPanels: l,
        panelConstraints: n[p],
        prevSize: S,
        size: v
      });
      if (!D(S, y) && (d += S - y, c[p] = y, d.toFixed(3).localeCompare(Math.abs(e).toFixed(3), void 0, {
        numeric: true
      }) >= 0))
        break;
      e < 0 ? p-- : p++;
    }
  }
  if (Ot(a, c))
    return i;
  {
    const u = e < 0 ? g : f, p = r[u];
    C(
      p != null,
      `Previous layout not found for panel index ${u}`
    );
    const m = p + d, S = Z({
      overrideDisabledPanels: l,
      panelConstraints: n[u],
      prevSize: p,
      size: m
    });
    if (c[u] = S, !D(S, m)) {
      let v = m - S, h = e < 0 ? g : f;
      for (; h >= 0 && h < n.length; ) {
        const w = c[h];
        C(
          w != null,
          `Previous layout not found for panel index ${h}`
        );
        const M = w + v, P = Z({
          overrideDisabledPanels: l,
          panelConstraints: n[h],
          prevSize: w,
          size: M
        });
        if (D(w, P) || (v -= P - w, c[h] = P), D(v, 0))
          break;
        e > 0 ? h-- : h++;
      }
    }
  }
  const b = Object.values(c).reduce(
    (u, p) => p + u,
    0
  );
  if (!D(b, 100, 0.1))
    return i;
  const x = Object.keys(i);
  return c.reduce((u, p, m) => (u[x[m]] = p, u), {});
}
function W(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return false;
  for (const n in e)
    if (t[n] === void 0 || A(e[n], t[n]) !== 0)
      return false;
  return true;
}
function U({
  layout: e,
  panelConstraints: t
}) {
  const n = Object.values(e), o = [...n], i = o.reduce(
    (r, a) => r + a,
    0
  );
  if (o.length !== t.length)
    throw Error(
      `Invalid ${t.length} panel layout: ${o.map((r) => `${r}%`).join(", ")}`
    );
  if (!D(i, 100) && o.length > 0)
    for (let r = 0; r < t.length; r++) {
      const a = o[r];
      C(a != null, `No layout data found for index ${r}`);
      const c = 100 / i * a;
      o[r] = c;
    }
  let s = 0;
  for (let r = 0; r < t.length; r++) {
    const a = n[r];
    C(a != null, `No layout data found for index ${r}`);
    const c = o[r];
    C(c != null, `No layout data found for index ${r}`);
    const f = Z({
      overrideDisabledPanels: true,
      panelConstraints: t[r],
      prevSize: a,
      size: c
    });
    c != f && (s += c - f, o[r] = f);
  }
  if (!D(s, 0))
    for (let r = 0; r < t.length; r++) {
      const a = o[r];
      C(a != null, `No layout data found for index ${r}`);
      const c = a + s, f = Z({
        overrideDisabledPanels: true,
        panelConstraints: t[r],
        prevSize: a,
        size: c
      });
      if (a !== f && (s -= f - a, o[r] = f, D(s, 0)))
        break;
    }
  const l = Object.keys(e);
  return o.reduce((r, a, c) => (r[l[c]] = a, r), {});
}
function tt({
  groupId: e,
  panelId: t
}) {
  const n = () => {
    const r = X();
    for (const [
      a,
      {
        defaultLayoutDeferred: c,
        derivedPanelConstraints: f,
        layout: g,
        groupSize: d,
        separatorToPanels: b
      }
    ] of r)
      if (a.id === e)
        return {
          defaultLayoutDeferred: c,
          derivedPanelConstraints: f,
          group: a,
          groupSize: d,
          layout: g,
          separatorToPanels: b
        };
    throw Error(`Group ${e} not found`);
  }, o = () => {
    const r = n().derivedPanelConstraints.find(
      (a) => a.panelId === t
    );
    if (r !== void 0)
      return r;
    throw Error(`Panel constraints not found for Panel ${t}`);
  }, i = () => {
    const r = n().group.panels.find((a) => a.id === t);
    if (r !== void 0)
      return r;
    throw Error(`Layout not found for Panel ${t}`);
  }, s = () => {
    const r = n().layout[t];
    if (r !== void 0)
      return r;
    throw Error(`Layout not found for Panel ${t}`);
  }, l = (r) => {
    const a = s();
    if (r === a)
      return;
    const {
      defaultLayoutDeferred: c,
      derivedPanelConstraints: f,
      group: g,
      groupSize: d,
      layout: b,
      separatorToPanels: x
    } = n(), u = g.panels.findIndex((v) => v.id === t), p = u === g.panels.length - 1, m = le({
      delta: p ? a - r : r - a,
      initialLayout: b,
      panelConstraints: f,
      pivotIndices: p ? [u - 1, u] : [u, u + 1],
      prevLayout: b,
      trigger: "imperative-api"
    }), S = U({
      layout: m,
      panelConstraints: f
    });
    W(b, S) || $(g, {
      defaultLayoutDeferred: c,
      derivedPanelConstraints: f,
      groupSize: d,
      layout: S,
      separatorToPanels: x
    });
  };
  return {
    collapse: () => {
      const { collapsible: r, collapsedSize: a } = o(), { mutableValues: c } = i(), f = s();
      r && f !== a && (c.expandToSize = f, l(a));
    },
    expand: () => {
      const { collapsible: r, collapsedSize: a, minSize: c } = o(), { mutableValues: f } = i(), g = s();
      if (r && g === a) {
        let d = f.expandToSize ?? c;
        d === 0 && (d = 1), l(d);
      }
    },
    getSize: () => {
      const { group: r } = n(), a = s(), { element: c } = i(), f = r.orientation === "horizontal" ? c.offsetWidth : c.offsetHeight;
      return {
        asPercentage: a,
        inPixels: f
      };
    },
    isCollapsed: () => {
      const { collapsible: r, collapsedSize: a } = o(), c = s();
      return r && D(a, c);
    },
    resize: (r) => {
      const { group: a } = n(), { element: c } = i(), f = ne({ group: a }), g = ie({
        groupSize: f,
        panelElement: c,
        styleProp: r
      }), d = T(g / f * 100);
      l(d);
    }
  };
}
function Oe(e) {
  if (e.defaultPrevented)
    return;
  const t = X();
  xe(e, t).forEach((o) => {
    if (o.separator && !o.separator.disableDoubleClick) {
      const i = o.panels.find(
        (s) => s.panelConstraints.defaultSize !== void 0
      );
      if (i) {
        const s = i.panelConstraints.defaultSize, l = tt({
          groupId: o.group.id,
          panelId: i.id
        });
        l && s !== void 0 && (l.resize(s), e.preventDefault());
      }
    }
  });
}
function pe(e) {
  const t = X();
  for (const [n] of t)
    if (n.separators.some(
      (o) => o.element === e
    ))
      return n;
  throw Error("Could not find parent Group for separator element");
}
function nt({
  groupId: e
}) {
  const t = () => {
    const n = X();
    for (const [o, i] of n)
      if (o.id === e)
        return { group: o, ...i };
    throw Error(`Could not find Group with id "${e}"`);
  };
  return {
    getLayout() {
      const { defaultLayoutDeferred: n, layout: o } = t();
      return n ? {} : o;
    },
    setLayout(n) {
      const {
        defaultLayoutDeferred: o,
        derivedPanelConstraints: i,
        group: s,
        groupSize: l,
        layout: r,
        separatorToPanels: a
      } = t(), c = U({
        layout: n,
        panelConstraints: i
      });
      return o ? r : (W(r, c) || $(s, {
        defaultLayoutDeferred: o,
        derivedPanelConstraints: i,
        groupSize: l,
        layout: c,
        separatorToPanels: a
      }), c);
    }
  };
}
function B(e, t) {
  const n = pe(e), o = H(n.id, true), i = n.separators.find(
    (g) => g.element === e
  );
  C(i, "Matching separator not found");
  const s = o.separatorToPanels.get(i);
  C(s, "Matching panels not found");
  const l = s.map((g) => n.panels.indexOf(g)), a = nt({ groupId: n.id }).getLayout(), c = le({
    delta: t,
    initialLayout: a,
    panelConstraints: o.derivedPanelConstraints,
    pivotIndices: l,
    prevLayout: a,
    trigger: "keyboard"
  }), f = U({
    layout: c,
    panelConstraints: o.derivedPanelConstraints
  });
  W(a, f) || $(n, {
    defaultLayoutDeferred: o.defaultLayoutDeferred,
    derivedPanelConstraints: o.derivedPanelConstraints,
    groupSize: o.groupSize,
    layout: f,
    separatorToPanels: o.separatorToPanels
  });
}
function Ge(e) {
  if (e.defaultPrevented)
    return;
  const t = e.currentTarget, n = pe(t);
  if (!n.disabled)
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault(), n.orientation === "vertical" && B(t, 5);
        break;
      }
      case "ArrowLeft": {
        e.preventDefault(), n.orientation === "horizontal" && B(t, -5);
        break;
      }
      case "ArrowRight": {
        e.preventDefault(), n.orientation === "horizontal" && B(t, 5);
        break;
      }
      case "ArrowUp": {
        e.preventDefault(), n.orientation === "vertical" && B(t, -5);
        break;
      }
      case "End": {
        e.preventDefault(), B(t, 100);
        break;
      }
      case "Enter": {
        e.preventDefault();
        const o = pe(t), i = H(o.id, true), { derivedPanelConstraints: s, layout: l, separatorToPanels: r } = i, a = o.separators.find(
          (d) => d.element === t
        );
        C(a, "Matching separator not found");
        const c = r.get(a);
        C(c, "Matching panels not found");
        const f = c[0], g = s.find(
          (d) => d.panelId === f.id
        );
        if (C(g, "Panel metadata not found"), g.collapsible) {
          const d = l[f.id], b = g.collapsedSize === d ? o.mutableState.expandedPanelSizes[f.id] ?? g.minSize : g.collapsedSize;
          B(t, b - d);
        }
        break;
      }
      case "F6": {
        e.preventDefault();
        const i = pe(t).separators.map(
          (a) => a.element
        ), s = Array.from(i).findIndex(
          (a) => a === e.currentTarget
        );
        C(s !== null, "Index not found");
        const l = e.shiftKey ? s > 0 ? s - 1 : i.length - 1 : s + 1 < i.length ? s + 1 : 0;
        i[l].focus({
          preventScroll: true
        });
        break;
      }
      case "Home": {
        e.preventDefault(), B(t, -100);
        break;
      }
    }
}
let ee = {
  cursorFlags: 0,
  state: "inactive"
};
const we = new Ze();
function K() {
  return ee;
}
function Gt(e) {
  return we.addListener("change", e);
}
function At(e) {
  const t = ee, n = { ...ee };
  n.cursorFlags = e, ee = n, we.emit("change", {
    prev: t,
    next: n
  });
}
function te(e) {
  const t = ee;
  ee = e, we.emit("change", {
    prev: t,
    next: e
  });
}
function Ae(e) {
  if (e.defaultPrevented)
    return;
  if (e.pointerType === "mouse" && e.button > 0)
    return;
  const t = X(), n = xe(e, t), o = /* @__PURE__ */ new Map();
  let i = false;
  n.forEach((s) => {
    s.separator && (i || (i = true, s.separator.element.focus({
      preventScroll: true
    })));
    const l = t.get(s.group);
    l && o.set(s.group, l.layout);
  }), te({
    cursorFlags: 0,
    hitRegions: n,
    initialLayoutMap: o,
    pointerDownAtPoint: { x: e.clientX, y: e.clientY },
    state: "active"
  }), n.length && e.preventDefault();
}
const Ft = (e) => e, ye = () => {
}, ot = 1, it = 2, rt = 4, st = 8, Fe = 3, Ne = 12;
let de;
function _e() {
  return de === void 0 && (de = false, typeof window < "u" && (window.navigator.userAgent.includes("Chrome") || window.navigator.userAgent.includes("Firefox")) && (de = true)), de;
}
function Nt({
  cursorFlags: e,
  groups: t,
  state: n
}) {
  let o = 0, i = 0;
  switch (n) {
    case "active":
    case "hover":
      t.forEach((s) => {
        if (!s.mutableState.disableCursor)
          switch (s.orientation) {
            case "horizontal": {
              o++;
              break;
            }
            case "vertical": {
              i++;
              break;
            }
          }
      });
  }
  if (!(o === 0 && i === 0)) {
    switch (n) {
      case "active": {
        if (e && _e()) {
          const s = (e & ot) !== 0, l = (e & it) !== 0, r = (e & rt) !== 0, a = (e & st) !== 0;
          if (s)
            return r ? "se-resize" : a ? "ne-resize" : "e-resize";
          if (l)
            return r ? "sw-resize" : a ? "nw-resize" : "w-resize";
          if (r)
            return "s-resize";
          if (a)
            return "n-resize";
        }
        break;
      }
    }
    return _e() ? o > 0 && i > 0 ? "move" : o > 0 ? "ew-resize" : "ns-resize" : o > 0 && i > 0 ? "grab" : o > 0 ? "col-resize" : "row-resize";
  }
}
const $e = /* @__PURE__ */ new WeakMap();
function Pe(e) {
  if (e.defaultView === null || e.defaultView === void 0)
    return;
  let { prevStyle: t, styleSheet: n } = $e.get(e) ?? {};
  n === void 0 && (n = new e.defaultView.CSSStyleSheet(), e.adoptedStyleSheets && e.adoptedStyleSheets.push(n));
  const o = K();
  switch (o.state) {
    case "active":
    case "hover": {
      const i = Nt({
        cursorFlags: o.cursorFlags,
        groups: o.hitRegions.map((l) => l.group),
        state: o.state
      }), s = `*, *:hover {cursor: ${i} !important; }`;
      if (t === s)
        return;
      t = s, i ? n.cssRules.length === 0 ? n.insertRule(s) : n.replaceSync(s) : n.cssRules.length === 1 && n.deleteRule(0);
      break;
    }
    case "inactive": {
      t = void 0, n.cssRules.length === 1 && n.deleteRule(0);
      break;
    }
  }
  $e.set(e, {
    prevStyle: t,
    styleSheet: n
  });
}
function at({
  document: e,
  event: t,
  hitRegions: n,
  initialLayoutMap: o,
  mountedGroups: i,
  pointerDownAtPoint: s,
  prevCursorFlags: l
}) {
  let r = 0;
  n.forEach((c) => {
    const { group: f, groupSize: g } = c, { orientation: d, panels: b } = f, { disableCursor: x } = f.mutableState;
    let u = 0;
    s ? d === "horizontal" ? u = (t.clientX - s.x) / g * 100 : u = (t.clientY - s.y) / g * 100 : d === "horizontal" ? u = t.clientX < 0 ? -100 : 100 : u = t.clientY < 0 ? -100 : 100;
    const p = o.get(f), m = i.get(f);
    if (!p || !m)
      return;
    const {
      defaultLayoutDeferred: S,
      derivedPanelConstraints: v,
      groupSize: y,
      layout: h,
      separatorToPanels: w
    } = m;
    if (v && h && w) {
      const M = le({
        delta: u,
        initialLayout: p,
        panelConstraints: v,
        pivotIndices: c.panels.map((P) => b.indexOf(P)),
        prevLayout: h,
        trigger: "mouse-or-touch"
      });
      if (W(M, h)) {
        if (u !== 0 && !x)
          switch (d) {
            case "horizontal": {
              r |= u < 0 ? ot : it;
              break;
            }
            case "vertical": {
              r |= u < 0 ? rt : st;
              break;
            }
          }
      } else
        $(c.group, {
          defaultLayoutDeferred: S,
          derivedPanelConstraints: v,
          groupSize: y,
          layout: M,
          separatorToPanels: w
        });
    }
  });
  let a = 0;
  t.movementX === 0 ? a |= l & Fe : a |= r & Fe, t.movementY === 0 ? a |= l & Ne : a |= r & Ne, At(a), Pe(e);
}
function je(e) {
  const t = X(), n = K();
  switch (n.state) {
    case "active":
      at({
        document: e.currentTarget,
        event: e,
        hitRegions: n.hitRegions,
        initialLayoutMap: n.initialLayoutMap,
        mountedGroups: t,
        prevCursorFlags: n.cursorFlags
      });
  }
}
function He(e) {
  if (e.defaultPrevented)
    return;
  const t = K(), n = X();
  switch (t.state) {
    case "active": {
      if (
        // Skip this check for "pointerleave" events, else Firefox triggers a false positive (see #514)
        e.buttons === 0
      ) {
        te({
          cursorFlags: 0,
          state: "inactive"
        }), t.hitRegions.forEach((o) => {
          const i = H(o.group.id, true);
          $(o.group, i);
        });
        return;
      }
      for (const o of t.hitRegions)
        if (o.separator) {
          const { element: i } = o.separator;
          i.hasPointerCapture?.(e.pointerId) || i.setPointerCapture?.(e.pointerId);
        }
      at({
        document: e.currentTarget,
        event: e,
        hitRegions: t.hitRegions,
        initialLayoutMap: t.initialLayoutMap,
        mountedGroups: n,
        pointerDownAtPoint: t.pointerDownAtPoint,
        prevCursorFlags: t.cursorFlags
      });
      break;
    }
    default: {
      const o = xe(e, n);
      o.length === 0 ? t.state !== "inactive" && te({
        cursorFlags: 0,
        state: "inactive"
      }) : te({
        cursorFlags: 0,
        hitRegions: o,
        state: "hover"
      }), Pe(e.currentTarget);
      break;
    }
  }
}
function Ve(e) {
  if (e.relatedTarget instanceof HTMLIFrameElement)
    switch (K().state) {
      case "hover":
        te({
          cursorFlags: 0,
          state: "inactive"
        });
    }
}
function Be(e) {
  if (e.defaultPrevented)
    return;
  if (e.pointerType === "mouse" && e.button > 0)
    return;
  const t = K();
  switch (t.state) {
    case "active":
      te({
        cursorFlags: 0,
        state: "inactive"
      }), t.hitRegions.length > 0 && (Pe(e.currentTarget), t.hitRegions.forEach((n) => {
        const o = H(n.group.id, true);
        $(n.group, o);
      }), e.preventDefault());
  }
}
function We(e) {
  let t = 0, n = 0;
  const o = {};
  for (const s of e)
    if (s.defaultSize !== void 0) {
      t++;
      const l = T(s.defaultSize);
      n += l, o[s.panelId] = l;
    } else
      o[s.panelId] = void 0;
  const i = e.length - t;
  if (i !== 0) {
    const s = T((100 - n) / i);
    for (const l of e)
      l.defaultSize === void 0 && (o[l.panelId] = s);
  }
  return o;
}
function _t(e, t, n) {
  if (!n[0])
    return;
  const i = e.panels.find((c) => c.element === t);
  if (!i || !i.onResize)
    return;
  const s = ne({ group: e }), l = e.orientation === "horizontal" ? i.element.offsetWidth : i.element.offsetHeight, r = i.mutableValues.prevSize, a = {
    asPercentage: T(l / s * 100),
    inPixels: l
  };
  i.mutableValues.prevSize = a, i.onResize(a, i.id, r);
}
function $t(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return false;
  for (const o in e)
    if (e[o] !== t[o])
      return false;
  return true;
}
function jt({
  group: e,
  nextGroupSize: t,
  prevGroupSize: n,
  prevLayout: o
}) {
  if (n <= 0 || t <= 0 || n === t)
    return o;
  let i = 0, s = 0, l = false;
  const r = /* @__PURE__ */ new Map(), a = [];
  for (const g of e.panels) {
    const d = o[g.id] ?? 0;
    switch (g.panelConstraints.groupResizeBehavior) {
      case "preserve-pixel-size": {
        l = true;
        const b = d / 100 * n, x = T(
          b / t * 100
        );
        r.set(g.id, x), i += x;
        break;
      }
      case "preserve-relative-size":
      default: {
        a.push(g.id), s += d;
        break;
      }
    }
  }
  if (!l || a.length === 0)
    return o;
  const c = 100 - i, f = { ...o };
  if (r.forEach((g, d) => {
    f[d] = g;
  }), s > 0)
    for (const g of a) {
      const d = o[g] ?? 0;
      f[g] = T(
        d / s * c
      );
    }
  else {
    const g = T(
      c / a.length
    );
    for (const d of a)
      f[d] = g;
  }
  return f;
}
function Ht(e, t) {
  const n = e.map((i) => i.id), o = Object.keys(t);
  if (n.length !== o.length)
    return false;
  for (const i of n)
    if (!o.includes(i))
      return false;
  return true;
}
const J = /* @__PURE__ */ new Map();
function Vt(e) {
  let t = true;
  C(
    e.element.ownerDocument.defaultView,
    "Cannot register an unmounted Group"
  );
  const n = e.element.ownerDocument.defaultView.ResizeObserver, o = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Set(), s = new n((u) => {
    for (const p of u) {
      const { borderBoxSize: m, target: S } = p;
      if (S === e.element) {
        if (t) {
          const v = ne({ group: e });
          if (v === 0)
            return;
          const y = H(e.id);
          if (!y)
            return;
          const h = ve(e), w = y.defaultLayoutDeferred ? We(h) : y.layout, M = jt({
            group: e,
            nextGroupSize: v,
            prevGroupSize: y.groupSize,
            prevLayout: w
          }), P = U({
            layout: M,
            panelConstraints: h
          });
          if (!y.defaultLayoutDeferred && W(y.layout, P) && $t(
            y.derivedPanelConstraints,
            h
          ) && y.groupSize === v)
            return;
          $(e, {
            defaultLayoutDeferred: false,
            derivedPanelConstraints: h,
            groupSize: v,
            layout: P,
            separatorToPanels: y.separatorToPanels
          });
        }
      } else
        _t(e, S, m);
    }
  });
  s.observe(e.element), e.panels.forEach((u) => {
    C(
      !o.has(u.id),
      `Panel ids must be unique; id "${u.id}" was used more than once`
    ), o.add(u.id), u.onResize && s.observe(u.element);
  });
  const l = ne({ group: e }), r = ve(e), a = e.panels.map(({ id: u }) => u).join(",");
  let c = e.mutableState.defaultLayout;
  c && (Ht(e.panels, c) || (c = void 0));
  const f = e.mutableState.layouts[a] ?? c ?? We(r), g = U({
    layout: f,
    panelConstraints: r
  }), d = e.element.ownerDocument;
  J.set(
    d,
    (J.get(d) ?? 0) + 1
  );
  const b = /* @__PURE__ */ new Map();
  return Je(e).forEach((u) => {
    u.separator && b.set(u.separator, u.panels);
  }), $(e, {
    defaultLayoutDeferred: l === 0,
    derivedPanelConstraints: r,
    groupSize: l,
    layout: g,
    separatorToPanels: b
  }), e.separators.forEach((u) => {
    C(
      !i.has(u.id),
      `Separator ids must be unique; id "${u.id}" was used more than once`
    ), i.add(u.id), u.element.addEventListener("keydown", Ge);
  }), J.get(d) === 1 && (d.addEventListener("dblclick", Oe, true), d.addEventListener("pointerdown", Ae, true), d.addEventListener("pointerleave", je), d.addEventListener("pointermove", He), d.addEventListener("pointerout", Ve), d.addEventListener("pointerup", Be, true)), function() {
    t = false, J.set(
      d,
      Math.max(0, (J.get(d) ?? 0) - 1)
    ), Lt(e), e.separators.forEach((p) => {
      p.element.removeEventListener("keydown", Ge);
    }), J.get(d) || (d.removeEventListener(
      "dblclick",
      Oe,
      true
    ), d.removeEventListener(
      "pointerdown",
      Ae,
      true
    ), d.removeEventListener("pointerleave", je), d.removeEventListener("pointermove", He), d.removeEventListener("pointerout", Ve), d.removeEventListener("pointerup", Be, true)), s.disconnect();
  };
}
function Bt() {
  const [e, t] = reactExports.useState({}), n = reactExports.useCallback(() => t({}), []);
  return [e, n];
}
function Le(e) {
  const t = reactExports.useId();
  return `${e ?? t}`;
}
const q = typeof window < "u" ? reactExports.useLayoutEffect : reactExports.useEffect;
function se(e) {
  const t = reactExports.useRef(e);
  return q(() => {
    t.current = e;
  }, [e]), reactExports.useCallback(
    (...n) => t.current?.(...n),
    [t]
  );
}
function Ce(...e) {
  return se((t) => {
    e.forEach((n) => {
      if (n)
        switch (typeof n) {
          case "function": {
            n(t);
            break;
          }
          case "object": {
            n.current = t;
            break;
          }
        }
    });
  });
}
function Re(e) {
  const t = reactExports.useRef({ ...e });
  return q(() => {
    for (const n in e)
      t.current[n] = e[n];
  }, [e]), t.current;
}
const lt = reactExports.createContext(null);
function Wt(e, t) {
  const n = reactExports.useRef({
    getLayout: () => ({}),
    setLayout: Ft
  });
  reactExports.useImperativeHandle(t, () => n.current, []), q(() => {
    Object.assign(
      n.current,
      nt({ groupId: e })
    );
  });
}
function Ut({
  children: e,
  className: t,
  defaultLayout: n,
  disableCursor: o,
  disabled: i,
  elementRef: s,
  groupRef: l,
  id: r,
  onLayoutChange: a,
  onLayoutChanged: c,
  orientation: f = "horizontal",
  resizeTargetMinimumSize: g = {
    coarse: 20,
    fine: 10
  },
  style: d,
  ...b
}) {
  const x = reactExports.useRef({
    onLayoutChange: {},
    onLayoutChanged: {}
  }), u = se((z) => {
    W(x.current.onLayoutChange, z) || (x.current.onLayoutChange = z, a?.(z));
  }), p = se((z) => {
    W(x.current.onLayoutChanged, z) || (x.current.onLayoutChanged = z, c?.(z));
  }), m = Le(r), S = reactExports.useRef(null), [v, y] = Bt(), h = reactExports.useRef({
    lastExpandedPanelSizes: {},
    layouts: {},
    panels: [],
    resizeTargetMinimumSize: g,
    separators: []
  }), w = Ce(S, s);
  Wt(m, l);
  const M = se(
    (z, L) => {
      const k = K(), R = ke(z), E = H(z);
      if (E) {
        let I = false;
        switch (k.state) {
          case "active": {
            I = k.hitRegions.some(
              (V) => V.group === R
            );
            break;
          }
        }
        return {
          flexGrow: E.layout[L] ?? 1,
          pointerEvents: I ? "none" : void 0
        };
      }
      if (n?.[L])
        return {
          flexGrow: n?.[L]
        };
    }
  ), P = Re({
    defaultLayout: n,
    disableCursor: o
  }), G = reactExports.useMemo(
    () => ({
      get disableCursor() {
        return !!P.disableCursor;
      },
      getPanelStyles: M,
      id: m,
      orientation: f,
      registerPanel: (z) => {
        const L = h.current;
        return L.panels = be(f, [
          ...L.panels,
          z
        ]), y(), () => {
          L.panels = L.panels.filter(
            (k) => k !== z
          ), y();
        };
      },
      registerSeparator: (z) => {
        const L = h.current;
        return L.separators = be(f, [
          ...L.separators,
          z
        ]), y(), () => {
          L.separators = L.separators.filter(
            (k) => k !== z
          ), y();
        };
      },
      updatePanelProps: (z, { disabled: L }) => {
        const R = h.current.panels.find(
          (V) => V.id === z
        );
        R && (R.panelConstraints.disabled = L);
        const E = ke(m), I = H(m);
        E && I && $(E, {
          ...I,
          derivedPanelConstraints: ve(E)
        });
      },
      updateSeparatorProps: (z, {
        disabled: L,
        disableDoubleClick: k
      }) => {
        const E = h.current.separators.find(
          (I) => I.id === z
        );
        E && (E.disabled = L, E.disableDoubleClick = k);
      }
    }),
    [M, m, y, f, P]
  ), N = reactExports.useRef(null);
  return q(() => {
    const z = S.current;
    if (z === null)
      return;
    const L = h.current;
    let k;
    if (P.defaultLayout !== void 0 && Object.keys(P.defaultLayout).length === L.panels.length) {
      k = {};
      for (const j of L.panels) {
        const Y = P.defaultLayout[j.id];
        Y !== void 0 && (k[j.id] = Y);
      }
    }
    const R = {
      disabled: !!i,
      element: z,
      id: m,
      mutableState: {
        defaultLayout: k,
        disableCursor: !!P.disableCursor,
        expandedPanelSizes: h.current.lastExpandedPanelSizes,
        layouts: h.current.layouts
      },
      orientation: f,
      panels: L.panels,
      resizeTargetMinimumSize: L.resizeTargetMinimumSize,
      separators: L.separators
    };
    N.current = R;
    const E = Vt(R), { defaultLayoutDeferred: I, derivedPanelConstraints: V, layout: ue } = H(R.id, true);
    !I && V.length > 0 && (u(ue), p(ue));
    const oe = ze(m, (j) => {
      const { defaultLayoutDeferred: Y, derivedPanelConstraints: Ee, layout: ce } = j.next;
      if (Y || Ee.length === 0)
        return;
      const ut = R.panels.map(({ id: _ }) => _).join(",");
      R.mutableState.layouts[ut] = ce, Ee.forEach((_) => {
        if (_.collapsible) {
          const { layout: ge } = j.prev ?? {};
          if (ge) {
            const ft = D(
              _.collapsedSize,
              ce[_.panelId]
            ), dt = D(
              _.collapsedSize,
              ge[_.panelId]
            );
            ft && !dt && (R.mutableState.expandedPanelSizes[_.panelId] = ge[_.panelId]);
          }
        }
      });
      const ct = K().state !== "active";
      u(ce), ct && p(ce);
    });
    return () => {
      N.current = null, E(), oe();
    };
  }, [
    i,
    m,
    p,
    u,
    f,
    v,
    P
  ]), reactExports.useEffect(() => {
    const z = N.current;
    z && (z.mutableState.defaultLayout = n, z.mutableState.disableCursor = !!o);
  }), /* @__PURE__ */ jsxRuntimeExports.jsx(lt.Provider, { value: G, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      ...b,
      className: t,
      "data-group": true,
      "data-testid": m,
      id: m,
      ref: w,
      style: {
        height: "100%",
        width: "100%",
        overflow: "hidden",
        ...d,
        display: "flex",
        flexDirection: f === "horizontal" ? "row" : "column",
        flexWrap: "nowrap",
        // Inform the browser that the library is handling touch events for this element
        // but still allow users to scroll content within panels in the non-resizing direction
        // NOTE This is not an inherited style
        // See github.com/bvaughn/react-resizable-panels/issues/662
        touchAction: f === "horizontal" ? "pan-y" : "pan-x"
      },
      children: e
    }
  ) });
}
Ut.displayName = "Group";
function Me() {
  const e = reactExports.useContext(lt);
  return C(
    e,
    "Group Context not found; did you render a Panel or Separator outside of a Group?"
  ), e;
}
function qt(e, t) {
  const { id: n } = Me(), o = reactExports.useRef({
    collapse: ye,
    expand: ye,
    getSize: () => ({
      asPercentage: 0,
      inPixels: 0
    }),
    isCollapsed: () => false,
    resize: ye
  });
  reactExports.useImperativeHandle(t, () => o.current, []), q(() => {
    Object.assign(
      o.current,
      tt({ groupId: n, panelId: e })
    );
  });
}
function Yt({
  children: e,
  className: t,
  collapsedSize: n = "0%",
  collapsible: o = false,
  defaultSize: i,
  disabled: s,
  elementRef: l,
  groupResizeBehavior: r = "preserve-relative-size",
  id: a,
  maxSize: c = "100%",
  minSize: f = "0%",
  onResize: g,
  panelRef: d,
  style: b,
  ...x
}) {
  const u = !!a, p = Le(a), m = Re({
    disabled: s
  }), S = reactExports.useRef(null), v = Ce(S, l), {
    getPanelStyles: y,
    id: h,
    orientation: w,
    registerPanel: M,
    updatePanelProps: P
  } = Me(), G = g !== null, N = se(
    (R, E, I) => {
      g?.(R, a, I);
    }
  );
  q(() => {
    const R = S.current;
    if (R !== null) {
      const E = {
        element: R,
        id: p,
        idIsStable: u,
        mutableValues: {
          expandToSize: void 0,
          prevSize: void 0
        },
        onResize: G ? N : void 0,
        panelConstraints: {
          groupResizeBehavior: r,
          collapsedSize: n,
          collapsible: o,
          defaultSize: i,
          disabled: m.disabled,
          maxSize: c,
          minSize: f
        }
      };
      return M(E);
    }
  }, [
    r,
    n,
    o,
    i,
    G,
    p,
    u,
    c,
    f,
    N,
    M,
    m
  ]), reactExports.useEffect(() => {
    P(p, { disabled: s });
  }, [s, p, P]), qt(p, d);
  const z = () => {
    const R = y(h, p);
    if (R)
      return JSON.stringify(R);
  }, L = reactExports.useSyncExternalStore(
    (R) => ze(h, R),
    z,
    z
  );
  let k;
  return L ? k = JSON.parse(L) : i ? k = {
    flexGrow: void 0,
    flexShrink: void 0,
    flexBasis: i
  } : k = { flexGrow: 1 }, /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      ...x,
      "data-disabled": s || void 0,
      "data-panel": true,
      "data-testid": p,
      id: p,
      ref: v,
      style: {
        ...Jt,
        display: "flex",
        flexBasis: 0,
        flexShrink: 1,
        overflow: "visible",
        ...k
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: t,
          style: {
            maxHeight: "100%",
            maxWidth: "100%",
            flexGrow: 1,
            overflow: "auto",
            ...b,
            // Inform the browser that the library is handling touch events for this element
            // but still allow users to scroll content within panels in the non-resizing direction
            // NOTE This is not an inherited style
            // See github.com/bvaughn/react-resizable-panels/issues/662
            touchAction: w === "horizontal" ? "pan-y" : "pan-x"
          },
          children: e
        }
      )
    }
  );
}
Yt.displayName = "Panel";
const Jt = {
  minHeight: 0,
  maxHeight: "100%",
  height: "auto",
  minWidth: 0,
  maxWidth: "100%",
  width: "auto",
  border: "none",
  borderWidth: 0,
  padding: 0,
  margin: 0
};
function Zt({
  layout: e,
  panelConstraints: t,
  panelId: n,
  panelIndex: o
}) {
  let i, s;
  const l = e[n], r = t.find(
    (a) => a.panelId === n
  );
  if (r) {
    const a = r.maxSize, c = r.collapsible ? r.collapsedSize : r.minSize, f = [o, o + 1];
    s = U({
      layout: le({
        delta: c - l,
        initialLayout: e,
        panelConstraints: t,
        pivotIndices: f,
        prevLayout: e
      }),
      panelConstraints: t
    })[n], i = U({
      layout: le({
        delta: a - l,
        initialLayout: e,
        panelConstraints: t,
        pivotIndices: f,
        prevLayout: e
      }),
      panelConstraints: t
    })[n];
  }
  return {
    valueControls: n,
    valueMax: i,
    valueMin: s,
    valueNow: l
  };
}
function Qt({
  children: e,
  className: t,
  disabled: n,
  disableDoubleClick: o,
  elementRef: i,
  id: s,
  style: l,
  ...r
}) {
  const a = Le(s), c = Re({
    disabled: n,
    disableDoubleClick: o
  }), [f, g] = reactExports.useState({}), [d, b] = reactExports.useState("inactive"), [x, u] = reactExports.useState(false), p = reactExports.useRef(null), m = Ce(p, i), {
    disableCursor: S,
    id: v,
    orientation: y,
    registerSeparator: h,
    updateSeparatorProps: w
  } = Me(), M = y === "horizontal" ? "vertical" : "horizontal";
  q(() => {
    const N = p.current;
    if (N !== null) {
      const z = {
        disabled: c.disabled,
        disableDoubleClick: c.disableDoubleClick,
        element: N,
        id: a
      }, L = h(z), k = Gt(
        (E) => {
          b(
            E.next.state !== "inactive" && E.next.hitRegions.some(
              (I) => I.separator === z
            ) ? E.next.state : "inactive"
          );
        }
      ), R = ze(
        v,
        (E) => {
          const { derivedPanelConstraints: I, layout: V, separatorToPanels: ue } = E.next, oe = ue.get(z);
          if (oe) {
            const j = oe[0], Y = oe.indexOf(j);
            g(
              Zt({
                layout: V,
                panelConstraints: I,
                panelId: j.id,
                panelIndex: Y
              })
            );
          }
        }
      );
      return () => {
        k(), R(), L();
      };
    }
  }, [v, a, h, c]), reactExports.useEffect(() => {
    w(a, { disabled: n, disableDoubleClick: o });
  }, [n, o, a, w]);
  let P;
  n && !S && (P = "not-allowed");
  let G;
  if (n)
    G = "disabled";
  else
    switch (d) {
      case "active": {
        G = "active";
        break;
      }
      default:
        x ? G = "focus" : G = d;
    }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      ...r,
      "aria-controls": f.valueControls,
      "aria-disabled": n || void 0,
      "aria-orientation": M,
      "aria-valuemax": f.valueMax,
      "aria-valuemin": f.valueMin,
      "aria-valuenow": f.valueNow,
      children: e,
      className: t,
      "data-separator": G,
      "data-testid": a,
      id: a,
      onBlur: () => u(false),
      onFocus: () => u(true),
      ref: m,
      role: "separator",
      style: {
        flexBasis: "auto",
        cursor: P,
        ...l,
        flexGrow: 0,
        flexShrink: 0,
        // Inform the browser that the library is handling touch events for this element
        // See github.com/bvaughn/react-resizable-panels/issues/662
        touchAction: "none"
      },
      tabIndex: n ? void 0 : 0
    }
  );
}
Qt.displayName = "Separator";
const ResizablePanelGroup = ({ className, ...props }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Ut,
  {
    className: cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className),
    ...props
  }
);
const ResizablePanel = Yt;
const ResizableHandle = ({
  withHandle,
  className,
  ...props
}) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Qt,
  {
    className: cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className
    ),
    ...props,
    children: withHandle && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border", children: /* @__PURE__ */ jsxRuntimeExports.jsx(GripVertical, { className: "h-2.5 w-2.5" }) })
  }
);
const FOLDERS_STORAGE_KEY = "drakon.folders";
const DEFAULT_FOLDER = { id: "general", name: "Загальні", slug: "general" };
function readFoldersFromStorage() {
  try {
    const raw = localStorage.getItem(FOLDERS_STORAGE_KEY);
    if (!raw) return [DEFAULT_FOLDER];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [DEFAULT_FOLDER];
    const hasGeneral = parsed.some((folder) => folder.slug === DEFAULT_FOLDER.slug);
    return hasGeneral ? parsed : [DEFAULT_FOLDER, ...parsed];
  } catch {
    return [DEFAULT_FOLDER];
  }
}
const MOBILE_BREAKPOINT = 768;
function useIsMobile() {
  const [isMobile, setIsMobile] = reactExports.useState(void 0);
  reactExports.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return !!isMobile;
}
function getParentPath(path) {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
}
function getBreadcrumbs(path) {
  const parts = path.split("/").filter(Boolean);
  const crumbs = [{
    name: "🏠",
    path: ""
  }];
  let acc = "";
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    crumbs.push({
      name: part,
      path: acc
    });
  }
  return crumbs;
}
function formatSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
function fileIcon(name) {
  if (/\.(ts|tsx|js|jsx)$/i.test(name)) return /* @__PURE__ */ jsxRuntimeExports.jsx(FileCodeCorner, { className: "h-4 w-4" });
  if (/\.json$/i.test(name)) return /* @__PURE__ */ jsxRuntimeExports.jsx(FileBracesCorner, { className: "h-4 w-4" });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "h-4 w-4" });
}
function isDrakonDiagram(value) {
  if (!value || typeof value !== "object") return false;
  const maybe = value;
  return typeof maybe.name === "string" && typeof maybe.items === "object" && maybe.items !== null;
}
function trimLines(content, count) {
  return content.split("\n").slice(0, count).join("\n");
}
function GitHubRoute() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const holdTimerRef = reactExports.useRef(null);
  const githubDefaults = readSettings().github;
  const owner = githubDefaults.owner;
  const repo = githubDefaults.repo;
  const [branch, setBranch] = reactExports.useState(githubDefaults.branch || "main");
  const token = githubDefaults.token || "";
  const [branches, setBranches] = reactExports.useState([githubDefaults.branch || "main"]);
  const [isLoadingBranches, setIsLoadingBranches] = reactExports.useState(false);
  const [currentPath, setCurrentPath] = reactExports.useState("");
  const [cache2, setCache] = reactExports.useState({});
  const [entries, setEntries] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [query, setQuery] = reactExports.useState("");
  const [preview, setPreview] = reactExports.useState(null);
  const [loadingPreview, setLoadingPreview] = reactExports.useState(false);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = reactExports.useState(false);
  const [contextTarget, setContextTarget] = reactExports.useState(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = reactExports.useState(false);
  const [importFolderSlug, setImportFolderSlug] = reactExports.useState(readFoldersFromStorage()[0]?.slug ?? "general");
  const canLoad = owner.trim().length > 0 && repo.trim().length > 0;
  const breadcrumbs = reactExports.useMemo(() => getBreadcrumbs(currentPath), [currentPath]);
  const filteredEntries = reactExports.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter((entry) => entry.name.toLowerCase().includes(term));
  }, [entries, query]);
  const loadPath = async (path) => {
    if (!canLoad) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.githubListTree(owner.trim(), repo.trim(), path, branch, token.trim() || void 0);
      if (!response.success) {
        throw new Error("Не вдалося завантажити дерево");
      }
      const sorted = [...response.entries].sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setEntries(sorted);
      setCurrentPath(path);
      setCache((prev) => ({
        ...prev,
        [path]: sorted
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка GitHub API");
    } finally {
      setLoading(false);
    }
  };
  const loadBranches = async () => {
    if (!canLoad) return;
    setIsLoadingBranches(true);
    try {
      const response = await api.githubListBranches(owner.trim(), repo.trim(), token.trim() || void 0);
      if (!response.success) {
        throw new Error("Не вдалося завантажити гілки");
      }
      const next = response.branches.length ? response.branches : ["main"];
      setBranches(next);
      if (!next.includes(branch)) {
        setBranch(next[0]);
      }
    } catch {
      setBranches(["main"]);
      if (branch !== "main") setBranch("main");
    } finally {
      setIsLoadingBranches(false);
    }
  };
  reactExports.useEffect(() => {
    void loadBranches();
  }, [owner, repo, token]);
  reactExports.useEffect(() => {
    setCache({});
    setPreview(null);
    setCurrentPath("");
    if (canLoad) {
      void loadPath("");
    }
  }, [owner, repo, branch, token]);
  const openFile = async (entry) => {
    setLoadingPreview(true);
    try {
      const response = await api.githubGetFile(owner.trim(), repo.trim(), entry.path, branch, token.trim() || void 0);
      if (!response.success) {
        throw new Error("Не вдалося завантажити файл");
      }
      const raw = response.content || "";
      const isCode = /\.(ts|tsx|js|jsx)$/i.test(entry.name);
      const isJson = /\.json$/i.test(entry.name);
      const previewText = isCode ? trimLines(raw, 80) : trimLines(raw, 50);
      let parsedDiagram;
      if (isJson) {
        try {
          const parsed = JSON.parse(raw);
          if (isDrakonDiagram(parsed)) {
            parsedDiagram = parsed;
          }
        } catch {
          parsedDiagram = void 0;
        }
      }
      setPreview({
        path: entry.path,
        name: entry.name,
        size: entry.size,
        content: previewText,
        kind: isCode ? "code" : isJson ? "json" : "text",
        canImportDrakon: Boolean(parsedDiagram),
        parsedDiagram
      });
      if (isMobile) {
        setIsMobilePreviewOpen(true);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Помилка preview");
    } finally {
      setLoadingPreview(false);
    }
  };
  const analyzePath = (path) => {
    const cleaned = path || currentPath || "src";
    navigate({
      to: "/diagrams",
      search: {
        autoAnalyze: "true",
        analyzePath: cleaned,
        analyzeRepo: `${owner.trim()}/${repo.trim()}`,
        analyzeBranch: branch
      }
    });
  };
  const copyPath = async (path) => {
    try {
      await navigator.clipboard.writeText(path || "/");
      toast.success("Шлях скопійовано");
    } catch {
      toast.error("Не вдалося скопіювати шлях");
    }
  };
  const importDiagram = async () => {
    if (!preview?.parsedDiagram) return;
    try {
      const id = crypto.randomUUID();
      await api.saveDiagram(importFolderSlug, id, preview.parsedDiagram);
      toast.success("Схему імпортовано");
      setIsImportDialogOpen(false);
      navigate({
        to: "/diagrams"
      });
    } catch {
      toast.error("Не вдалося імпортувати схему");
    }
  };
  const handleEntryClick = (entry) => {
    if (entry.type === "dir") {
      void loadPath(entry.path);
      return;
    }
    void openFile(entry);
  };
  const startHold = (entry) => {
    if (entry.type !== "dir") return;
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
    }
    holdTimerRef.current = window.setTimeout(() => {
      setContextTarget({
        path: entry.path,
        type: entry.type,
        name: entry.name
      });
    }, 450);
  };
  const cancelHold = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };
  const listView = /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: query, onChange: (event) => setQuery(event.target.value), className: "pl-9", placeholder: "Пошук у поточній папці..." })
    ] }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-11 animate-pulse rounded-md bg-muted" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-11 animate-pulse rounded-md bg-muted" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-11 animate-pulse rounded-md bg-muted" })
    ] }) : null,
    error ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-destructive", children: error }) : null,
    !loading && !error ? /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "space-y-1", children: [
      filteredEntries.map((entry) => {
        const dirCount = cache2[entry.path]?.length;
        return /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", className: "flex w-full items-center gap-3 rounded-md border border-border px-3 py-2 text-left hover:bg-accent", onClick: () => handleEntryClick(entry), onContextMenu: (event) => {
          if (entry.type !== "dir") return;
          event.preventDefault();
          setContextTarget({
            path: entry.path,
            type: entry.type,
            name: entry.name
          });
        }, onTouchStart: () => startHold(entry), onTouchEnd: cancelHold, onTouchCancel: cancelHold, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: entry.type === "dir" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Folder, { className: "h-4 w-4" }) : fileIcon(entry.name) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate text-sm font-medium", children: entry.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-xs text-muted-foreground", children: entry.type === "dir" ? typeof dirCount === "number" ? `Елементів: ${dirCount}` : "Папка" : formatSize(entry.size) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-muted-foreground", children: "›" })
        ] }) }, entry.path);
      }),
      filteredEntries.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground", children: "Нічого не знайдено" }) : null
    ] }) : null
  ] });
  const previewView = preview ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-semibold", children: preview.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: preview.path })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", children: formatSize(preview.size) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", onClick: () => analyzePath(preview.path), children: "🔍 Аналізувати файл" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", onClick: () => void copyPath(preview.path), children: "📋 Копіювати шлях" }),
      preview.canImportDrakon ? /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", onClick: () => setIsImportDialogOpen(true), children: "📥 Імпортувати як схему DRAKON" }) : null
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "max-h-[60vh] overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs leading-5", children: preview.content || "(Порожній файл)" })
  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-full min-h-[320px] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground", children: loadingPreview ? "Завантаження preview..." : "Оберіть файл для preview" });
  if (typeof window !== "undefined" && !localStorage.getItem("jwt")) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: "/login", replace: true });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background px-3 pb-6 pt-3 text-foreground md:px-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "mb-3 flex items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", onClick: () => navigate({
        to: "/diagrams"
      }), children: "← Діаграми" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Github, { className: "h-4 w-4 text-muted-foreground" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "truncate text-sm font-medium md:text-base", children: [
          owner,
          "/",
          repo
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: branch, onValueChange: setBranch, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 w-[120px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: isLoadingBranches ? "..." : "branch" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: branches.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: item, children: item }, item)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "icon", onClick: () => navigate({
          to: "/settings"
        }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "h-4 w-4" }) })
      ] })
    ] }),
    isMobile ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", onClick: () => {
        if (currentPath) {
          void loadPath(getParentPath(currentPath));
        } else {
          navigate({
            to: "/diagrams"
          });
        }
      }, children: "← Назад" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "truncate text-sm text-muted-foreground", children: [
        "/",
        currentPath || ""
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", onClick: () => navigate({
        to: "/settings"
      }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "h-4 w-4" }) })
    ] }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-3 flex flex-wrap items-center gap-1 text-sm", children: breadcrumbs.map((crumb, index) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "rounded px-2 py-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground", onClick: () => void loadPath(crumb.path), children: crumb.name }, `${crumb.path}-${index}`)) }),
    isMobile ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: listView }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-[calc(100vh-190px)] min-h-[520px] rounded-md border border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(ResizablePanelGroup, { orientation: "horizontal", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ResizablePanel, { defaultSize: 28, minSize: 20, maxSize: 45, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full overflow-auto p-3", children: listView }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ResizableHandle, { withHandle: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ResizablePanel, { defaultSize: 72, minSize: 55, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full overflow-auto p-3", children: previewView }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Drawer, { open: isMobilePreviewOpen, onOpenChange: setIsMobilePreviewOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DrawerContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DrawerHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DrawerTitle, { children: "Preview файлу" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DrawerDescription, { children: preview?.path })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-[65vh] overflow-auto px-4 pb-2", children: previewView }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DrawerFooter, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setIsMobilePreviewOpen(false), children: "Закрити" }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: Boolean(contextTarget), onOpenChange: (open) => !open && setContextTarget(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: contextTarget?.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Дії для папки" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", variant: "outline", onClick: () => {
          if (!contextTarget) return;
          analyzePath(contextTarget.path);
          setContextTarget(null);
        }, children: "🔍 Аналізувати папку" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", variant: "outline", onClick: () => {
          if (!contextTarget) return;
          void copyPath(contextTarget.path);
          setContextTarget(null);
        }, children: "📋 Копіювати шлях" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: isImportDialogOpen, onOpenChange: setIsImportDialogOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Імпортувати як схему DRAKON" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Оберіть папку, куди зберегти схему" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "import-folder", children: "Папка" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: importFolderSlug, onValueChange: setImportFolderSlug, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { id: "import-folder", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Оберіть папку" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: readFoldersFromStorage().map((folder) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: folder.slug, children: folder.name }, folder.id)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setIsImportDialogOpen(false), children: "Скасувати" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => void importDiagram(), children: "Імпортувати" })
      ] })
    ] }) })
  ] });
}
export {
  GitHubRoute as component
};
