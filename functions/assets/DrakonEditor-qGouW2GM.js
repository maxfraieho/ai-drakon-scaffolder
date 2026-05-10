import { r as reactExports, U as jsxRuntimeExports } from "./server-gJy2DtaG.js";
import { S as Subscribable, s as shallowEqualObjects, j as hashKey, k as getDefaultState, n as notifyManager, l as useQueryClient, m as noop, o as shouldThrowError, b as useComposedRefs, P as Primitive, f as Presence, a as createContextScope, c as composeEventHandlers, e as useCallbackRef, p as useLayoutEffect2, g as cn, q as slugify, T as Tooltip, r as TooltipTrigger, t as TooltipContent } from "./router-xG6ysrBj.js";
import { t as toast, a as api, B as Button, L as Label, I as Input } from "./api-DBg6TLju.js";
import { a as Dialog, b as DialogContent, c as DialogHeader, d as DialogTitle } from "./dialog-DNmMAriS.js";
import { u as useDiagramStore, c as upsertDiagramInStorage, C as Collapsible, a as CollapsibleTrigger, b as CollapsibleContent } from "./useDiagramStore-u-E7UDT9.js";
import { S as Switch, T as Trash2 } from "./switch-DCkk9ASI.js";
import { c as createLucideIcon, u as useDirection, g as clamp, h as ChevronDown, C as Check, B as Badge, S as Select, b as SelectTrigger, d as SelectValue, e as SelectContent, f as SelectItem } from "./select-BirXpnu9.js";
import { F as FileText } from "./file-text-y0evhAAk.js";
var MutationObserver = class extends Subscribable {
  #client;
  #currentResult = void 0;
  #currentMutation;
  #mutateOptions;
  constructor(client, options) {
    super();
    this.#client = client;
    this.setOptions(options);
    this.bindMethods();
    this.#updateResult();
  }
  bindMethods() {
    this.mutate = this.mutate.bind(this);
    this.reset = this.reset.bind(this);
  }
  setOptions(options) {
    const prevOptions = this.options;
    this.options = this.#client.defaultMutationOptions(options);
    if (!shallowEqualObjects(this.options, prevOptions)) {
      this.#client.getMutationCache().notify({
        type: "observerOptionsUpdated",
        mutation: this.#currentMutation,
        observer: this
      });
    }
    if (prevOptions?.mutationKey && this.options.mutationKey && hashKey(prevOptions.mutationKey) !== hashKey(this.options.mutationKey)) {
      this.reset();
    } else if (this.#currentMutation?.state.status === "pending") {
      this.#currentMutation.setOptions(this.options);
    }
  }
  onUnsubscribe() {
    if (!this.hasListeners()) {
      this.#currentMutation?.removeObserver(this);
    }
  }
  onMutationUpdate(action) {
    this.#updateResult();
    this.#notify(action);
  }
  getCurrentResult() {
    return this.#currentResult;
  }
  reset() {
    this.#currentMutation?.removeObserver(this);
    this.#currentMutation = void 0;
    this.#updateResult();
    this.#notify();
  }
  mutate(variables, options) {
    this.#mutateOptions = options;
    this.#currentMutation?.removeObserver(this);
    this.#currentMutation = this.#client.getMutationCache().build(this.#client, this.options);
    this.#currentMutation.addObserver(this);
    return this.#currentMutation.execute(variables);
  }
  #updateResult() {
    const state = this.#currentMutation?.state ?? getDefaultState();
    this.#currentResult = {
      ...state,
      isPending: state.status === "pending",
      isSuccess: state.status === "success",
      isError: state.status === "error",
      isIdle: state.status === "idle",
      mutate: this.mutate,
      reset: this.reset
    };
  }
  #notify(action) {
    notifyManager.batch(() => {
      if (this.#mutateOptions && this.hasListeners()) {
        const variables = this.#currentResult.variables;
        const onMutateResult = this.#currentResult.context;
        const context = {
          client: this.#client,
          meta: this.options.meta,
          mutationKey: this.options.mutationKey
        };
        if (action?.type === "success") {
          try {
            this.#mutateOptions.onSuccess?.(
              action.data,
              variables,
              onMutateResult,
              context
            );
          } catch (e) {
            void Promise.reject(e);
          }
          try {
            this.#mutateOptions.onSettled?.(
              action.data,
              null,
              variables,
              onMutateResult,
              context
            );
          } catch (e) {
            void Promise.reject(e);
          }
        } else if (action?.type === "error") {
          try {
            this.#mutateOptions.onError?.(
              action.error,
              variables,
              onMutateResult,
              context
            );
          } catch (e) {
            void Promise.reject(e);
          }
          try {
            this.#mutateOptions.onSettled?.(
              void 0,
              action.error,
              variables,
              onMutateResult,
              context
            );
          } catch (e) {
            void Promise.reject(e);
          }
        }
      }
      this.listeners.forEach((listener) => {
        listener(this.#currentResult);
      });
    });
  }
};
function useMutation(options, queryClient) {
  const client = useQueryClient();
  const [observer] = reactExports.useState(
    () => new MutationObserver(
      client,
      options
    )
  );
  reactExports.useEffect(() => {
    observer.setOptions(options);
  }, [observer, options]);
  const result = reactExports.useSyncExternalStore(
    reactExports.useCallback(
      (onStoreChange) => observer.subscribe(notifyManager.batchCalls(onStoreChange)),
      [observer]
    ),
    () => observer.getCurrentResult(),
    () => observer.getCurrentResult()
  );
  const mutate = reactExports.useCallback(
    (variables, mutateOptions) => {
      observer.mutate(variables, mutateOptions).catch(noop);
    },
    [observer]
  );
  if (result.error && shouldThrowError(observer.options.throwOnError, [result.error])) {
    throw result.error;
  }
  return { ...result, mutate, mutateAsync: result.mutate };
}
const __iconNode$e = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["line", { x1: "12", x2: "12", y1: "8", y2: "12", key: "1pkeuh" }],
  ["line", { x1: "12", x2: "12.01", y1: "16", y2: "16", key: "4dfq90" }]
];
const CircleAlert = createLucideIcon("circle-alert", __iconNode$e);
const __iconNode$d = [
  ["path", { d: "M11 14h10", key: "1w8e9d" }],
  ["path", { d: "M16 4h2a2 2 0 0 1 2 2v1.344", key: "1e62lh" }],
  ["path", { d: "m17 18 4-4-4-4", key: "z2g111" }],
  ["path", { d: "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113", key: "bjbb7m" }],
  ["rect", { x: "8", y: "2", width: "8", height: "4", rx: "1", key: "ublpy" }]
];
const ClipboardPaste = createLucideIcon("clipboard-paste", __iconNode$d);
const __iconNode$c = [
  ["path", { d: "m16 18 6-6-6-6", key: "eg8j8" }],
  ["path", { d: "m8 6-6 6 6 6", key: "ppft3o" }]
];
const Code = createLucideIcon("code", __iconNode$c);
const __iconNode$b = [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
];
const Copy = createLucideIcon("copy", __iconNode$b);
const __iconNode$a = [
  ["path", { d: "M12 15V3", key: "m9g1x1" }],
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["path", { d: "m7 10 5 5 5-5", key: "brsn70" }]
];
const Download = createLucideIcon("download", __iconNode$a);
const __iconNode$9 = [
  ["path", { d: "M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2", key: "1fvzgz" }],
  ["path", { d: "M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2", key: "1kc0my" }],
  ["path", { d: "M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8", key: "10h0bg" }],
  [
    "path",
    {
      d: "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",
      key: "1s1gnw"
    }
  ]
];
const Hand = createLucideIcon("hand", __iconNode$9);
const __iconNode$8 = [
  ["path", { d: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8", key: "5wwlr5" }],
  [
    "path",
    {
      d: "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
      key: "r6nss1"
    }
  ]
];
const House = createLucideIcon("house", __iconNode$8);
const __iconNode$7 = [["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]];
const LoaderCircle = createLucideIcon("loader-circle", __iconNode$7);
const __iconNode$6 = [
  ["path", { d: "M12.586 12.586 19 19", key: "ea5xo7" }],
  [
    "path",
    {
      d: "M3.688 3.037a.497.497 0 0 0-.651.651l6.5 15.999a.501.501 0 0 0 .947-.062l1.569-6.083a2 2 0 0 1 1.448-1.479l6.124-1.579a.5.5 0 0 0 .063-.947z",
      key: "277e5u"
    }
  ]
];
const MousePointer = createLucideIcon("mouse-pointer", __iconNode$6);
const __iconNode$5 = [
  ["path", { d: "M21 7v6h-6", key: "3ptur4" }],
  ["path", { d: "M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7", key: "1kgawr" }]
];
const Redo = createLucideIcon("redo", __iconNode$5);
const __iconNode$4 = [
  [
    "path",
    {
      d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
      key: "1c8476"
    }
  ],
  ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7", key: "1ydtos" }],
  ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7", key: "t51u73" }]
];
const Save = createLucideIcon("save", __iconNode$4);
const __iconNode$3 = [
  ["circle", { cx: "6", cy: "6", r: "3", key: "1lh9wr" }],
  ["path", { d: "M8.12 8.12 12 12", key: "1alkpv" }],
  ["path", { d: "M20 4 8.12 15.88", key: "xgtan2" }],
  ["circle", { cx: "6", cy: "18", r: "3", key: "fqmcym" }],
  ["path", { d: "M14.8 14.8 20 20", key: "ptml3r" }]
];
const Scissors = createLucideIcon("scissors", __iconNode$3);
const __iconNode$2 = [
  ["path", { d: "M3 7v6h6", key: "1v2h90" }],
  ["path", { d: "M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13", key: "1r6uu6" }]
];
const Undo = createLucideIcon("undo", __iconNode$2);
const __iconNode$1 = [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["line", { x1: "21", x2: "16.65", y1: "21", y2: "16.65", key: "13gj7c" }],
  ["line", { x1: "11", x2: "11", y1: "8", y2: "14", key: "1vmskp" }],
  ["line", { x1: "8", x2: "14", y1: "11", y2: "11", key: "durymu" }]
];
const ZoomIn = createLucideIcon("zoom-in", __iconNode$1);
const __iconNode = [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["line", { x1: "21", x2: "16.65", y1: "21", y2: "16.65", key: "13gj7c" }],
  ["line", { x1: "8", x2: "14", y1: "11", y2: "11", key: "durymu" }]
];
const ZoomOut = createLucideIcon("zoom-out", __iconNode);
function useTheme() {
  return {
    theme: "dark",
    setTheme: (_theme) => {
    }
  };
}
const iconAction = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAIAAAC24JptAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAdpJREFUeNrs3bFLAlEAgPGMODjI09IhakrkIqGhoIwgkAaHhBaJpqA9moOW1poaG2vsDyghnOogIyEJp0AwMI664YKKlFvsQnAJoTu463l8Hw63HPf8+d4pPNFQu90eIFeFsMMOO+ywI+ywww47wg477H7V0I2iVgrL8vpaVswRDok5rPePz72j46Zl2ceG+ba9tSHgIAfFtHus1TtwPxPw1RBzkILa9UXYYYcddtgRdthhhx1hhx122GFH2GGHHXaEHXbY9W+O97Yvitfa/YPXw2q1rGfT7BzLkjQRH/X6irGIkltZTqmJv5/ibG+7oRsn55c+v7xNy6rpL15fxb7EV8vad2LnbM0WtVKA12C1/sT9zqfcfx8lPa1m0nMBIDg8PfPbLjYSnZ+dCcL8cWvHmuXzHXbYYUfYYYcddoQddthhhx1hhx122BF22P137vd6Cjd39oN5R97bLQZjU7FHyfExD+1SamJ1aUGWpEDC5bMZR6cI+hsf5Uq1u11vP6uD3R3ud7xXEHbYYYcddoQddthhR9hhhx122BF22GGHHWGHHXa9m0pOdneBYxFFzEGK+x8M5Uq1cHUbjyqb+ZwSHsYuUGGHHXbYYUfYYYcddoQddtj1Y98CDAC3sqwXFWFGnAAAAABJRU5ErkJggg==";
const iconQuestion = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAIAAAC24JptAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABTZJREFUeNrsnV1sk1UcxguZ1dkxWcGJgzrYsEh1k6Iyp2zQzZW4kqEOHEZAQ0K4QK+40CuJXhiNMdGYJeoSo+jE8DG1YSMrH9Ux3MZwn1ihwPjYWJCPYkorgibzj29y3pPJhW/3vn3/Zc+TXZyTdO3ZL+f/nOec9zSbMDIyYoES0gSwAzuwAzuwg8AO7MAO7CCwAzuwAzuwg8Bu/LALhQfi8fic2bMyJ2WAnQYFD3TWbv2OGulWa+0bG1MC30Qm42hubVcaV69fP3r8ZErMu4kWCOzADuzADgI7sAM7sIPADuzADuzGk9L0eqPO7v7+8EDCvx6JxkT7x46usbxVRUmxIyc7Cez0Ob9784O6/pOnmEyHdKt1pdfjqyhNgZpt3N3CB5zl3xPAbwLBweHz3NlFr8RooNyc6AY+/y7ufre9aS8NVHSXuvNNRDZ4Ido7dEFpd/waDoUHXM48puyoLoKHekS3OD/n5SWFJrKLxq+98nHgj7/+Vrqbv21857VXmdYs1YWYdHfelraucp65pZppu/2FhS7RPT58jlZ/juxoWFQXolv2UC4N3XSne7oof4rtDtGt276TI7sdgR9Em4b73MI5TBaK9UvcamyMxSgG8GIXPNBJFSG6zyxwcph0iuY7p92fnaUaSyBIYYARuy1Ne0R7xuQMqhRWGeWlpwrlvEJhgAu7bf4A1YLorikr4JbvHrjPTou+WiWHeoyIyprZ0fz3728TXaoOqhGGG/Uaj4uWfkOjsmZ2o8LwhqpHeB5yzJg6iZZ+0VWispnsaOY3/XRQzSWuXBqihato6RdTT4nKZrL7bOv3ok3DWlX+oIWxjI7KGtjdOKGTzkuYhGETo7KG/eyoMGzu1lVTVH67oU1E5U/rd7hdzpu+8jF3gVHsRoVhS4pIicrHzl9WuoGDXfRz01emf93w5XubDM/G92TZLKkjx9TM//Myyg+aDFEDO3uGeo91W+uRVAEXjV9rP3bW5H3FssVPijaVQEvvYEqwq2vqESd6pNzsu2fnTJN/0q1Ww9cKX0Xp/q5e4Xr1LYdLH3YwB3fkTKTtxLDoVj6xYG3NslGvef3dj2QrN8rvqr2LRftS/M/Pm/uYs/tijzpCml/LK8tNy8a0ihfMmim6+w6fJjdhC45cRSyvpJVej75fPdC8zq59Xp3z5CNf7f2FLTtyFdGebrfr/sRWMztHTja5hjr1QqeHLl5hCI78hFxFdFdVec0/RyGRa8hrU63/Z4a5hPxEdMlntO4ZjGJHrlFVUiznla7wOVbsyEnkXCL7jMnsSCuqvHJU3ryvnw848hByEtH1uAsNutqT+HOydcuXqsP9Pbar4wQTdrKHkLesrvYZ9EGJsyMHoVAuultaQxzyCrmHnEvIW4z7SuSY7gWsedYn55WG1qOms/ukuVvegK8wYHlNZE/2X7mceUVzneJ2gLy0maJL0atyLpFdhR070voXq/veel95+kNTb2c3F9cjPzEil+hWs0pe8Tw6z8JPG1bXGP0ROtz7pKhMOx5W4Gjnk4Qrxzrc1aap9+GmjY27W36LXE74Tdr7QuKuweNznfasyQm/VYEzz+hq1Y2dojHutMOnzgh2i4rmJ+ePN79mx63ADuzADuzADgI7sAO7W0tpDMdU7w/I99WM1tmLkVuH3VAkgpqF340bTbfbNZ1BcKzZmvJFMx33JvlDbTab1i/bcmRH4HAGBb+DwA7swA7sdNSUuzLBLkH5ykqUS2lJeJ6vl/B/BMAO7MAO7CCwAzuwAzsI7MAO7FJR/wgwAI44HsdaEjkRAAAAAElFTkSuQmCC";
const iconSelect = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGgAAABpCAIAAABZIvFTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABYtJREFUeNrsnV9MW1Ucx1tHupZ0GjpGa1nD6LoCxXbDgROJOkIgEWbJwnBMM7Ogyx72aqJPPvhmYuLTHhYdWTTbmINMqmDCwjo1jE3cCq0r0DH+rFCgQ3C0cYgseJKb3Hul18b77/Se9vdNH05vk3t7Pvec7/mde3/3XPXGxoYKxF/PAAIAB+AAHIADAbg0BhcMTaCPwsFlKe0PnTl/2evzo0J1mev0iaPQ4v6vKGrsAoADjwMBOACHW2qRV0dWYvGzFzpvj4SIpmAzm9493OCwW/G1uM/PXSKdGtJ4ZN57cxBrVw1MTqVH11v8YwUfuEFfIG08y2EtwDdzCLAmRnvzdnxUW0UWrGMXvqXLpcU2fC0uNPWQOWPG7WRRG55ZoMs6jYbXyCAWHPJUulxRsJMscPfmosyomm/GF8d5+5lhKFerff45PVngQo+WBBucKHDB+4zB7dluIG40GFteFmxwosCFpmfocokxN6MMTjg4NGGYXWKa+gvmvIwyOOHg7vhHiDa4oTmmxZWXFuEDR7TBxVfXwrE4/dVVWowPHNEG559lmptBr7cI8hkh4Eg3uOD8I6a7WMzCdiIEHOkGF/qdFcHtLsQHDgxOIDgwOCHgwpEo2+AqCwmbokpicELA+e+N0mXLNr1eq8lAgxMCLvhgki7bM9XghIC7H44wZ8y0IzMNjjc4ZHBLcdYZyzdmpsHxBke6wQ3PM3P7cqcDHziiDW7ucXxxdZX+ut9Vgg8c0Qb3W4RpbvkGw7Pb9JjAkW5wIwuLTHcRfYeEx+1BtsEhfXZ9gCxw4ViM6S57rPjAsQ1O9e9r9sRJpMHx66rZWq0qLSTe4PiBQ81bp9GkAbUPTh4Xvx9+aV4rsfjY+KSsFfv0fDtd/vBEi+T7ryhzSrIffrkjqIVLdeD/FAuc7MfCFseBAByAA3AADsCBpIrjqFDu687u8EJUpj/ETla0mU0yHcVizDve1CBm/sA7B7ijpw/b42lsiJLvWafTth5txNdV2Xm/REtkRcDjcHVVto45iwsMOQTVdnpp+VJgNPXgELW9O42Z2eKgqwI4AAfgABwIwAE4AAfgABwIwClzkn/xbuCqf5Sg2j5Z/1sR4B6yEpGhq4LkAafbmiY5SyIrwrurNtfXBM6c27Rx65YtL5ryXrftUiCgH8en7s5H/3r6NLEiYnYrZFGqQV/gi47v2WmtlHK1WrfDXltiVQiyayMTnmCInTBNyaDXnzxySGRGj/DVvLqv/dTe632ytrZpe1FOzmFXcWqvDA/PLKDhPjFnVKfRtNRVN9S+Jv4QopZBW4nFO3r6em7+kvhTZb65ucyB/1HWucfxK77gwGwk8af6V146Ul8jPhdTAnCUwpFou+cHzsXQ3rTvdjuL8DxHEl9d8wTGvgs9SPzpQIm9xf2GRdInudVSvZYAGV9n743EW8jZWVktLofcxofsrN0f/HN9fdN2m9nUVHdQjgRFtbTvc0DG13Wjn3PceP9AmRzGh+zsy9s+zhGg8WCVJHaGAxyltstd3l+HOMeNU1X7pTI+ZGdn++9wjgDV5fvEpDekDJwq6dqZaNxofXmfGONDdtZ2a4hzBEB2duqdJqlGgBSAoxQMTXx1tZvT+GqsBW9XCLGei4OBvolpTjvju0CocsFJGzDLGtAqERylK55ez88DwgLmJAGt+9XKZncd/hhbjfMtSQICZmwBraLB0QFz2zddievgUsZHB8xUQMtpZ87CXa1vNVpSujSROlXv5UoeMKMC5oCWGHDJA+ZEyR3QEgaONj7OgJkd0KbQzhQKLnnAjC2gJRUcHTB/zLq8/Mnp97AFtHylrJs1mzAplpoK7nIBOAAH4AAcVtEPvsn3BFwahiP0dCI7W1ddVQHgoKuCAByAA3BE6R8BBgBYIJJnxmtNXAAAAABJRU5ErkJggg==";
const iconCase = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAIAAAC24JptAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA/9JREFUeNrs3d1LU2EcB3ANGa58YSnNtDCXzBRmSr5LpYhGahNRcxQFSeFFF/0BXXfRVXTRhRQWRbalIlvOSBHN8C01X0YzR65MMyempMsNNezA4Fxsx7GXc56dze/3ah4P256PPr/nt53HGby7uxuEeJQDIIAd7GAHOwR2sIMd7BDYwQ52sIMdAjvY8TYhrp86Mq7TGYzEntm62by9/S9KFEnsEWVSSWa6jH27+cXl+8+Ugf171DHw8YFYfDz2CMtzdslk2g/T0K1humqXlJggFAgCG44aYIxY7Pr5wa5f66Gm7dDoxIbFQmb60LdL87IIPGK4UJiTkeb6hHXPjmSq79ylb7c8vIceBf0dAjvYwQ52sEM4eC/ALtquPtPqGoGn2KhSc3TP4sOisuJzpO2aNZ2q7vfEXqJzd+ebFmuNvITonB2bngmMeefNQFDvfFHv6OTGxUYfEvrRmFf+WgZ/LvLC7nxi/OljYj+ym1wwsWKHOQs72MEOdgjsYAc72CGwg51fvxfQ9EnXNvXFj8Zs2dnmi92PDTPmLAI7nte7qpICx62MEQJBmVQSHyXi4Tjnfq9pDcb1rS3HgXh8n57vg2pUqXtGJywOzyZJJKrPP3M0Mownar/+mBv6x2bW7C/pCQWCwoy0utoKH9hRWd8wN7xsHZ42OH4rNy62LictLNSX2x3N1q3GoQnGt4izk6X1V6siwr36AbOw/25+cfnRC9XXxSW74wdDQook8VcyZT6BaxrRdRvnNnd27I4nxsbcvlbr1h5FDu1sGRnXPW5pXzXb9yvRoaHyFGlxsoSYWte0UaM3rFitdscPh4Xdqi53ayc7ITtbtF19ys4exiJYmXqK60tCkwsmqktnLG2KkkJvtgCQsLMVwZaObsaL+VQRrElP4WIZoRaE5nE9Y2krzcuqLi3ysrQRsqOLoFLzlnEZuSQ9KZclsbWMUAuCRjfzxjDLuCAo5BdZKW1E7egi2NrZy7iMKFJTvC+CVGlTTukZFwSqcWOxtPnAji6C6t5+xmXkZna6Z0WQKm1PhscZF4SKgnzWS5vP7NjtpZ33uhyVNh/bed9Lc93r8trOFr3B+LxN624v7aTXvV5ZliKVBBGPz/6ux/VeemB2/tXEZwK9rt/Y2dKs6dR8GNyrl6Zu7NXrys/merxfM0DsnPfSjOGu1/U/O7qXbnyt1n377uQcWcKJussV3PW6/mrnvJcm0+v6tx3dSz9tf0d/eaP8Aple193w8XqFnRQ/4YJwrQd2sIMd7BDYwQ52sENgBzvYwQ52COxgBzvYIbALcDv6M235/OG2PLVTlBRSara9rry1C8b/Y0S9gx3sYIfADnawgx0CO9jBDnb7Kv8FGACuKcOgboiTgAAAAABJRU5ErkJggg==";
const iconForeach = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAIAAAC24JptAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABKtJREFUeNrsnF1IlFkcxt9amzS/cnD7kiJba0sa2SEMMyz6vBijT6N1oS5aYu/6YG+CLqKLvegiyqKryIuCopK+KKEvLCULh6XIELFSoXRlMF0dp7HGsocGDoe2m/U9r+9/8nmuzv/C8Tk/5jnnvOc9c8YNDw9b1Ig0juzIjuzIjuwosiM7siM7iuzIjuzIjuzcV394oKr6HhplgVUZ6Wlk9z+0//CJl51daOR4vRUH/5TJbrxMW3FwUEdPj9jMjrcosht9JTk00t+qqQ9Ho0Y+rfLCNTt/7txsY36uCD5pPH7ucvTDByHfjhSPZ/dvmwv9vgTI7KmqG3LAQTADS4iCdHbIV8/AgCVMsBRfLcod75paWqvrG1SZOdmTMyvVRWShrmh3aDDehrEivy9/3hyh492eQ0fUcmzChB/WbZ2ekZXkIrv+3qEbl/6JxT7GS+PLbGOZvXT9tr6OXfjLZHfBQTAAG6qEPZtTtiPsXneGrtc9UmX2lOSCxekSRjrYgBlVIrmwKovdybMX9Lm1ZHW2nIkCZjCA6FYFsUNa1eMnlF+Q5Xpav0ru3AUZ+pMyDItgh3WTnlbMrYUlmdLWKLAEY6qEYSPJtcvu6OnzelqXrsy2REo3BsOVF6+5zK7mYbCxrV2Vc+dn/jjdI5MdjGEwUSVsw7yb7CqvVqv2pNSkRcWZlmAhuTD5TfOjzQ7P/Hpai5dnT0yRvqMFk3py0QX31yhYQ+XkJlviBZP6ck/cPsrYEdmRHdmRHdlRZEd2EmVms+hdZChY15cQHYZVceyanvUys5Tz7Ar9Pm9aWuL2PMXjsXlYwNY7xtedoTvaprFB6e95A8WLnfgXa0qWzJwxxTV2zqlszwHVrqr4i+MdxzuK7MiO7MiO7Ciyc1529wJqHgbb3nQ6atHsobm4pnqzStcss/khtp4r9IOeCSf7x0BHntmmltbEBWd9OQaKLrjDLhKJJPqAZbMLZvY+J6Umzf4pPSF4tb8Km9o6NsZO4JHFbyrUFTXFjmsUsiM7siM7iuzIjuzI7r/q64319w7J7y1Mwqr77H7Oy1XtWOxj3d1u+exgUv2c9qsujCq7jPQ0/Y19d2jwWUNYMjjYUz/jtr4cN7B5f4WtzO7ctiHH61Xl86f/ik3u++gn2FMlbMO8y+PdH+Wb9OQ21Ao9SVZ3+62eVt22a+zy583Rk9vxJtLWHJUGDpZgTJUr/AVGLl0wMM+WBVbph8ke1XYjIKLSCkuqhNXtW0qlrFEw4u4qW6cn9/F9Qcn9u75PTyusmrriyMz6rtDvQxBU2d4a7mgblAAONl409+lpNXi5kbHnCgRBT279A/eTCwOwocoUj8dUWuMydikCglAeWH3y4tV4+S4yhOTmzXfzXp6XzRF9e33nxoDZC8kMn/s8dOyU/it4OfLlzj64d5fovYB9v5cjGtLAwRKMSd9HQSh+XbtCGrv1JUucuD7QkbPawSeN1Q8eR9+PfKrVL6vJmzFt5N+4icmB5UVOXBxo8Zy7oMyOKZHdd8dOLbMFztrSx7umltYzV26isWNTqdmLJr9/dgkhsiM7siM7sqPIjuzIjuwosiM7siO7saXPAgwA1g0d5mKBEeMAAAAASUVORK5CYII=";
const iconBranch = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAIAAAC24JptAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA3xJREFUeNrsnF9IU1Ecx1VkMNBqCk2EIEUWBoKFuTKqDWnRlI1wtUEUJUQPPfTYQ8899BQ99BDBiiLachIbbtFMZoZlzpg10hphgTBUSEMHAyXWAeEicxt3d/ece3b9fp/uxrn3nvM55/eHc3/3VmYymQpIkirBDuzADuzADgI7sAM7sIPADuzADuzADgI7sFMDu2gsHk/MMevZaiq1sfGvXreb2R3bDM1HDrWJb18tst18cunuE4+611How+Q9vX5f416R7atEtltYXNwJZljUMMWyO9DSpNVo1A2ODLBBr6fi74jZTkxNr6XTbMxHOLZ2dTK4Y61We7SjXbzB8htnHTdvC8e++3f4XKdVFRDYgR3YgR0EdmDHn6olnxkcHltcXmHQRbfXT+nK+jpdz+mTkk+XmBsPBMLekXcqWDvO7lPnbRamNvt59oc67K6UgcDfKeHvBBlbDfW6PWU05j8rfz/NJrhgZzIeLmq7VXFFY3FZ2MFmwQ7swA7sILADO7ADOwjswA7swA7sitTkl5nVtVS5DJh0lXRYlkvJsAcViX2d+PbdZTGXsvfPRsHhMU84kl5fl+VqEp9XRGPx7aWMdTU11xy9fO7lkQ4/8g0tp7Lt49YVl+QOS6+Dcnv9kanp7XPY0thw45KzqGIsqppPLj145v2ZXMj6X6vRmDva+5121utO8B0Pnw/m3IM1thquX+zbVVujrGuj2j0Z6u/oTWwpYmAWstUu5nMoxAnaTcdZhhESEPyj4zl7Iq87lrnuM18gI7PdZzHRDiNk/gbDozktgEYaIH/NLPEyvtDI1oLhrV7GZTtLI4wQv+EJvM7p2qxdnQ5rNw3PS6vemNlgFJkquuzYGJGyLoJFnTsN581DaGL3joBcSUPhlIiSa1OYXenJKm+puALvpswk5p6+ChabSxdYtpfP9Rw0NLNPvxV7r0e8w4qMR1+E3jLIdcuG3aYGAuHA+4/5AiU5yBembSeOSa7XVAm7wglaTtHLdcuPnRA93S/98V+/C7Rpa9rff8HOz+4WX+8x5sul2eS65c1OyKUfD70Rfl7tPcPnbj6Pz8mySHH7GATPGMEO7MAO7CCwAzuwAzsI7MAO7MAO7CCwAzuwAzsI7FTNTvimLc8ft+WUnctiJtQ2y/S4ZYfvuYMd2IEd2EFgB3ZgB3YQ2IEd2IHdztJ/AQYAhj4sYupRBVYAAAAASUVORK5CYII=";
const iconInsertion = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABoCAIAAAB9vEnIAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAgdJREFUeNrs3TFLAlEAwPGMODpJh5sqCRpaHRyEoCBCKHCIBqGllr6AQzQ1iENDRIPfIKigwBaHIEEqKAgcGlobgrKi4agUlAu9HkRmlgd3pp7H/z899JT3fnly8A5z6breQ5ZyYYcddthhR9hhhx12hB122P3sLV9IHmXEIBIOeT0D2JkoGt/KqaoY+BQlEVuxp12vPaf1CVc7wM5RYYcddthhR9hhhx12hB122GGHHWGHHXbYEXbYYde9mdufPbnIHp9fNnq2Uq48v7yWdV2WJMXb1Ib0zcNTdTw2PNjMW2nau5oviFl53bLHLTc6bHZyfHoi2EK7pdV4UdMc+SESf++dzVirztns1bVT4URiaWKBfN+1qT5rL/MpyuLcTN2De6n0/dctEAuhqdGRITus0HhWu6m05ds2LNrJ/VIw4K978DB9Wh2LKf4+oCMZz6r2Wa5RuL7DDjvCDjvssMOOsMMOO+wIO+yww46ww64zWdyvKJb+2JErlb53IG/vHm2yQuNZFUtau+1yqrqxvW9wwEHmzIaflP+dFedsW+yCAb8sSU6FEEszuylq7pxdng87+F4es+9s09+piETXquNkYp1rFK7vCDvssMMOO8IOO+ywI+ywww477Ag77LDDjrDDDjvDqnuyPkWxrR3/g8Fxdl0Rdthhhx12hB122GFH2GHXuT4EGAC4IfKu1kBQAQAAAABJRU5ErkJggg==";
const iconComment = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAIAAAC24JptAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABDJJREFUeNrs3UtIVFEYB3CNFCbLdDItH9ioWI5oKokKWplUkCRSziJBFEKwTS7MRbQQF9VChWwlSJQIRmgPLAMDX5iUmQ80HZt8v7BhHM1Hgi7sI+Pea7aZ6Thz7vX/cRdHQeae3z3n3Huufp+OGxsbDgirwhF2sIMd7GCHgB3sYAc7BOxgB7utsbi0XPO2gRppl5JcD+yHnQWRW1gybTZTw0etLi3I49NuD5+ntQknbcBOUQE7W613RWUV7XqDIiFiQoLzczJ3atwNGEaUCkdBXaMO7pTdysqKsuegpR3Eemd97LXux9SeXmfSryug/y1Vj8zG77jPymTcWbaOmE102LJXnkEn5G1nHBqc0PfNToyvr6/ZflC4urn7HddqIqKdVPvkZEdq+k9tVq8jbN4mLMz3t7cZujo0oWGhZy/Kw66/ud7Q08nJkkRDnk5mdmwkNkXnovbg2u7z6+rJ4W/bvx/kfcR27xFM5tW1tb/GYNPTJ/GpOjcff07ttsMRWULUyeTzp2083GiHUNfYKt0F0QB8/6o68VoWw9HHzG60q10Kp3J2TkmI06VcsMtU1QYH0DE5YywurxTeYhHfx9rqpKwbrD6FzfPd+urP/g+tUrjb2Rn2ghPCz9uztCCPNvlbbiDN9XzZGdpbpQ8iN9Ov0GXn5HaRn5Ppo1aL86O/j640R3Z0QkI7MTI8OjKMqw3ArewM6cI3pe/jxW5qoEcYdDRbM64m87Z5oskrnbkTg194sTNNjgvt8MBjfP5aK/lcgtBm9dDOwO7HnLhX1QZq+Ny30/pLc0L4cmF6nJf1TtyEe7hz+9rDx0O8Y6ytrnJnt6sCdrCDHexgh4Ad7GAHOwTsYAc72MEOATvYwQ52CNjBDnawgx0CdrCDHewQsIMd7GC3JYymeW67Om0SS144q1Rc2B08JGZ7DAyP8gk3YBiRJvswSfBhYOfhJ55H7/DY4tIyh3Z1jWL6h5efPy9z1lcb4eT050956dpWPq/jDW5yxijNjzqqCeJovdOEigkVTd29Hd19XNkVl1cKbbrMviFhHNkFxyQIQ4/iYdULS+tl7FwUlVVICyPRZWaVjczGjs4mNE5MYKCZe7+8srr2nd2nam5hiXS2urq5M8xDZpbHqImKmZueEFIZie9ZQ0un/isnOaCbszU2RcfwU1jmz566rHPYmkI7NDNLx+M39fbNPd6Ei09lnLrNOG+b+FT/ynknQTtOXpqqMsh5p6AF5bCvv91rLQjDTU61Fhx+lyehw741PtSeXvQcJ78aH1JBB9SW+Z+ghYb5WqPA9yi7Kqwcd3QfePng3i63w7iziZ2Li4uyLSztoAV22uAAacUChQV1zdK6JJzW1U7LvSO0a0rvYr3DvQLBuZ1QhUhajoi3wP9gUJydLAJ2sIMd7GCHgB3sYAc7BOxgBzs5xi8BBgBSz9Sxsc4yJwAAAABJRU5ErkJggg==";
const iconSinput = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAYAAAA5gg06AAAABHNCSVQICAgIfAhkiAAABENJREFUeJzt3H9olHUAx/GPEQ8c3PbH/RHjLNnGuHAwY8FUtJRDPGGLWYjcIkZzMOwHQjHDKeTwH20klYyrhqSriFo/0CIHJXJYzND7Y+DghHNM0TyG0BXbwWL/rH8S555Tmc/3+9w+zz6vv7b7wn2/8Obuee75tWJubm4OsqQ9Vu4FyMMpEgFFIqBIBBSJgCIRUCQCikRAkQgoEgFFIhC4SNncBLK5iXIvw6jHy70Ak1KDQ0iPXgYAxBvX4M2OZJlXZEagPkl3Ai38m12gIgWVIhFQJAKKRECRCCgSAUUioEgEFImAIhFQJAKKRECRCCgSAUUioEgEFImAIhFQJAKKRECRCCgSAc/X3d3M38bZ3/8wsRbjTgz96Ms8DbFaNDU2WHv/FV7uPk+PZHDi9DBmZmdNrolS84a16Exut/Lenr7urv2ZV6D/5a7fsPbeniKtt/gRl7s8bZPqY7Vo3rAWwxculRyvi1YhVr3KyxRL1l9//4OLV3K+zOV5x6EzuR01T0ZLbpvG85OIVa+y9l1dTpnRMd8iGdkFj29swuG3X8fKSMQ1NnzhEg59dBxT00UTUy1Lxn4nPRV9Asd6u7Fudcw1NnbtOva+1x+4+4b8YvzH7DuvvYpdL2xDyHHueb1QLOJg6jOcOfub6SkDz8oRh5atm7C/qx2RcNg1dvLnX/D+p5/r628RrB0Wqo/V4mjPHjTUVLvGLl7J4d0PBnAzf9vW9IFi9dhdZUUYvW91Iblls2vsVqGAAx9+gvRIxuYSAsGXA6w7WxPY19Hm2k7NzM4i9e1ppAaH/FgGLd+Ogjc1NiB1sLvkbnp69DJ6+vq1nboPX09VVFaEcay3G/HGNa6x8fwkvh8+5+dyaJTlfFL7jhbURatcr9s8SMnM9+c4ZHMTGPj6FG4VCq6x5599xu/lUPA10oPOPyW3bEbL1k1+LoeGb5HmP61kvpDjYH9XO+pjtX4thY71SFPTRRz++CTG85OusbpoFQ68sQuVFe4jE3KX1UjZ3ASOHP+y5NdbkJ79Y5u1SN/99CuGzp13vR5yHHS+2Iz4xiZbUweO8UhT00UMfPVDyRNiKyMR7H75JW1/FslopAftXq9bHcPuV3Zo+/MIjEV62O71ztaEqamWHSORtHttl+dIPX39JXevASASDuOLU2e8TrEkzfzr3/WGniKlRzL3DQSg5LZJFs/TAdbsVV1Y4gdPkVoT8ZLnh5ajbc+tt/beni7YvyMzOmZiLZ71DX5zz//7Otp8mffpuhqrPy2M7N3ZvO1jURZEWjLr8kg3kRFQJAKKRECRCCgSAUUioEgEFImAIhFQJAKKRECRCCgSAUUioEgEFImAIhFQJAKKRECRCCgSgUBFmv8wj4UP9mAWqEhtiThCjoOQ46AtES/3cowxcnGk2BWoT1JQKRIBRSKgSAQUiYAiEVAkAopEQJEIKBIBRSKgSAT+A1rYFiBYwOx1AAAAAElFTkSuQmCC";
const iconSoutput = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAIAAAC24JptAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAArNJREFUeNrs3UFIFFEcx3EdFiGoMAOJFSFFlIINNkhFPOQlIQIPHTRC1EKMOplFFNSlQ0kggQgtgSUJuUSEYkErYXWIiqIgSJLooi7qYQ+5IHjZ/rAwPNSD+3iTz33f32EZBnYYPuyb/5v/PGYLM5lMAdFKIXbYYYcddgQ77LDDjmCHHXYbMpdcls/ycCl2uWU4Pv7qw2fZONlQe661xU47z87TysKpG9jlVbDDDjvssCPYYYcddgQ77LDDDjuCHXbYYUewww67nZuQkaP8nP3z8duPgE5xOD6u/d36aORwdWVAJ2bg2faziUT8zTtrfx11h6qvXuiwdMx+nfll88j6NDN778EI1zu7+ELGB8j+fcWWkE1/+b66tqby9Zw9vXfPbkvtjtcdPRaNWGInheLOwycq3/xA7PblHlN8+TxmpcJe727fVVTk71lIpW4OxP6upLHbZr78rxXB8TlRZ4Vv6FZfWUmJWT5X7smkPkiVWMd35e6g3BFhp8OXSqelEGvzudUL2MgnMxhtPuf6KAb5XOxBZfkiFQdVvvsjcey2ytd7/ow6cZFrX65l11E7YZI5in+7JqkKH8j1Xi3kIJxc2mJPX8gcxd8jl78bF7u2uRewI+DUBkEWTq9B4AGn3VnxgNNuSXnAaR8z5CackQdAHnD87jbPy6n3Y4npIODy3E7gHk2+VveYfVZr2G50IvE88dYSu9/JxeDgzNupk3WrEsTqACfqbFP0yKXOVuOHNVBnmxvrbYbrOtUcBFyBqfdUzCWXF5eWDJ5W/+Mxf/taZ5v2cWqqKgwuBAhkzJaHSw2/yESxs2ehgdO9AOywww47gh122GFHsMMOO+wIdthhhx12BDvssMPuP8Rfga4uRcduS2k70bRuw8Lw3x/YYYcddgQ77LDDjmCHHXbYuZV/AgwAoBNgkjbELQ4AAAAASUVORK5CYII=";
const iconTimer = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAIAAAC24JptAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABSRJREFUeNrsm19oXEUYxVNJS1c2EbeiUhE0ykqDiQ021jZWumgjJpJUNjaVNiKC9iGIjz70WRR88kFQhIpGsbEJktCsmBq2WtvSRlxtoJUgqZAatWAqcWFLkxJPXJh8vbfc2dnduTuN5zztwMnm5jdz53zzJ6sWFxerqKK0iuzIjuzIjuwosiM7siM7iuzIjuzIjuwosrOsm1x+uPHMxNnJKY47Y7393kenzk3iQ6KpsffFbo47A+XBQenMGb6znO8osiM7siM7sqPIjuzIjuwosiM7siO7/6eqTX9geubikWMnAwxz2WxtNFrepzzQP1T6l+RylyORtQGGHdu23L3+9sK/0GzfeOTItx8e/mqljqPImjUv7WxLtDRbeWf/nL20gt/B3JUr5y/McL4rUjWRiK35rqvtifT3P6J/1CBPbNooDfPzC+kfflq4ejXfjEWjjzbWV5DFd5mJuVxOPe1jDz24evU1f3LqxGn1GU/7VGKrLXa1NdGObVv6x75Rg7whXtfc1CA9sdoaZZjNZv2G0ITZWYGD/HMZDLL5fNuT+AMtvrPPdbTGRIx+MHDY1BCO5v7JHhxNq+b96+/0gNMarMx3L3c9oz5jZB0aHjU1hKCB1JiaW6AXnm03NVhhh3cQvaSaw8dOog+NDLaFIlROZJs3xOvjdUYGiznb29Mto/39TwdNDVb1bl+/rNr27UmaGiyyQ/3dtvUR1Tx1btJzcURrsKfxzMQvM3+oJsLNkwBag/X6DvUKekw1P/5ixNRgSTKdkFrILlODdXboq92tCdVET6aPjxsZbAi5hHS6bmoVaAhpXdG+4/G7YjHV/Cz1tamh7HXJsNinQF55SkutIdQ9qL1iwKM//RseWkMZ1Tc4IssOmVcFGkJlh35ruPce1cSKDfFvZCiXkEXytlmiqdGzoaQ1hM1uaa2zq1NlAnr14PCXpoaySGYRfl1Pst3UUAF26D25I4ByBEWAkaF0IYVk2YGM8pQdWkNl2OXLEbmGHRw9amooUTKFkE7IKFNDxdihDzu3t8hyxLNFoTWUIuSPLDv2+uo1raGS7PLliFzDDh097lnDag1F1yXIH9VELvnrkmBD5dlBydbtshwZSI2ZGooQVsqy7EAumRqcYIf+3LwhrpqpE6f99UqwoYilq7oOD2EF7Sk7tAZX2EH79iTlGvbA50OmBiPJzEEWIZFMDQ6xQybIcmTi/K+eckRrKFxIG1l2IIs8ZYfW4Ba7pQmlu1OWI5/4No21hgIjAmkjV6aeskNrcJFd1X+HJurzb7Oz/j13rUEr5IwsO2QKFWhwlF2ipTl4z11rCJZ/x9xTdmgN7rKruvboBCVC3+CIqSGoGBYJg+TZ3fG0qcFpdvXxukRT4/JyMnPGU45oDQF1CRJmeQhv2uivS4INrrODepLtshyRxysFGq4rmS3IHCSPqaFcsvv/swgBdUcgv2XmucU1NT3z8/QFMTE9sO7WW4Jmut8vyjH1cPy+O25bJw1/XfpbFsO9u3aanli7wg56Zf+bMu/CFOLorddftff91u9BlXKYUsa8uiHZoTiQmRCasHQt4qjfrXd2Oft0Z9u53OXq6mp1x0sWaOqYfH5+AQq++lplfvvVaXZFqOu1/cuLhHfecPAJee+T7MiO7MiOIjuyIzuyo8iO7MiO7MiOutHZqbsD8iTXKbm7f3d2cupQauzmtUunqyFsZK4odu6L7MiO7MiO7CiyIzuyIzuK7MiO7MiO7CiyIzuyW4n6V4ABAEcZGhcGRSYvAAAAAElFTkSuQmCC";
const iconPause = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAIAAAC24JptAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABEdJREFUeNrsnEFIVEEcxtcIQdDIDSqUQCWEBCUhKxXDrVRS0UJTo4wSooOHDl2CDp06dJTwEEFFFqkp5aJGWq0om5WComAgoUEl0cFDCYYX+1QY/9oh3u57s/O27zvNgO775ud7M9/8560xy8vLHiokxZAd2ZEd2ZEdRXZkR3ZkR5Ed2ZEd2ZEdRXYOa4uxzqamZ0bGJnnfWVbzg7bA2AQavuysxgu1vO8saA2cbJAd5zuK7MiO7MiO7CiyIzuyIzuK7MiO7MjuP9RWSz/9Ze5H/9CwZov32ro0XKWoIHdP0k5Lv2KhbhwIjjS3P4/i+6ix5qQvP8eRZ3b261x0P4NWB2iBXUJcXHSzszpAC/NdiS/PPzS8uLS01o2LjfUd2O9qWIHRcTkcDNApdtsS4uuKffe7X651cdVd3sSyoiNuBRcc6X37QXUxNAzQwYwCUnuTdqtu10Dw568Fl7J70vtKtZO93hBuAsv5rqq4ULXnFxY6el+7ERxyD8yr7rmKYh3ZOCc789C+dDllIPS5CxwMw7bqZqamYFCa9hV1FScws6pZr9X/wl3sYFguEQ01lfr2ZMjfcoV9/3Ha8BdHpGAVhlUXA7G6nQh3P1tdeswbv74qPfL3uYVdZ9+AamMIGIjuWgCW8zOlx1X32/x8T/+g+eBg8tPcd9WtLMy3mkvsqaNg6yfzSmtfwPC8AnswqbowH2Y4DasGdf5UmWpj9jU8r8CeWiI2ha0IsMtIT5N5BTHd2LwCY3IXAduh5RLb2EGXz1apvAI1t7QZGobb14uAMAzb4X9muOww18q8gpnYwLwCS5Ozn2UuCWeJsI0d1FBbKfPK3Y5u09jJCAWrMGzLx9pzXnGpulxucp+aFPdgBhFKdWW0MoId5l2ZV/xDw4bkFdjwiwMWmLRUVdfBDmqsr5V5paWzxwR2sCFziTRpELuVTW521np9ZWxianom8vUS8Zo87IW8dXWWHVRfVSbzysNnEb71ZGCCMdiz9/PtZLdWlJd5JRAciWAukVvXioJcW3KJU+w8q0X5ZK9XdWVdW7NkVEIuOR1SZVgrO8/G+jXyip5T/c27iI0ldRmhjGaHvJKZmrK+aIyOa84ruJwtJfUIsFvZaYgqNiLCncedOtnhcjKXhFxSjww7RIHSvIOqq7Moj2AkS+qwYW8ucZyd56+ivKx0OyoZjJBLwimp/1MOfn+2p39QvUTgWS2Z7Ujc7ii4xcXfMgxfLC9x9LUFZ797fO3WbRmydApRqenGVUcv4ex7n+HXtW2JSq5kh3AgFw1twkUdyiX6nlm19r2zuM7KswWr9A9nZ2akp2n4Cxn6vxaqr1xX7Y6mmx4jxffcyY7syI7sKLIjO7IjO4rsyI7syI7sKFezU+dE8sDINBlav5uanul5M4RG2dECPYXM6GHnCpEd2ZEd2ZEdRXZkR3ZkR5Ed2ZEd2ZEdRXZkR3bRqD8CDADEuuXSYTuePgAAAABJRU5ErkJggg==";
const iconDuration = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAIAAAC24JptAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABCtJREFUeNrsml1IU2EYx2cMbTq1FlQohUUICUaGGhlJwxo0y6JZrg8pAjOQii5CJAgKoiSiuhCiyD4MmpaUIxUt0RKLUtIUDEao9CHRhRc1Kryxxw69e5lhntN5z8f4/y/kPDB3zn7nvO/zf/5b1MTEhAVSpCiwAzuwAzuwg8AO7MAO7CCwAzuwAzuwg8AO7MAO7CCwAzuwAzuwg8AO7MAO7CCwAzuwAzuwg8AO7CKQ3ddvwftNbYGR9xHJIjVl8YGirTN/vVXWuxO4puevIvU5ejf6mf7OHN8sLD3FksdugWNuZONIT10qas3mb8ztfP1GerYlle3cZo+dbVJSwe8/q+oesnJZ0sKsjHRR7Ege1/rKmz5WDn8clbW/Gkrnr9ziy7LiIoFrlkR3ZvXyVFZS6/gw+sWM4AYDQy/fBljpzslelDRfLDtS6R6PLTqaldV1DWZkd/tBIzumj1PozhPbKyQlxNudmStZOTA80t07YC5w7V3d/K7tdTnpQ2nBTjJBDnvoZHf8rSYCRw7/btMTViY7HNQDhXsUXrvcG9jxp7Gxe+bBRw5/LBhk5d4Clxb+jpdzbRY1dVb6O1/Q/TQ+OOps7T19rKS+J8uXqDZX8E39x/h4TX2j8dn5/M10qaxFeAs2aTRXhImaujNjRWgD7u03uF+hnsb7Eup4cn2JmvNssSef9ytVNbVGZlff2sGOqdcp8CW8VMjvqEvUtj1lZfl+r+IdRKgaHz+78aglNJvPSYyPtU3z+nmJCbSip3kw1ck+D544yzoX3c+rZyoM6EvKTl9gO90MRc3wXPlhUWtWUknhZnZMEKtrDTdpkC+RC87yJ9ETy44WafqSlFDT6OkzlF+hDqYssuU7oag1K13fscrLvG86fmifQdidunSNBkfpOMZqLfVssdli/vlfcXFxadPGeVa1ro/2VHdONru9ZAUGA0NpcqJEcb6EgSPlZa/KzclU5Z3VzNyp5fN+hQ8qdBQ/a1MfUzFtVJNdQrzd63LyGy3ZAn3BkX+iWfuvM7ix2Fl+h/LJDgcrGzq6dGwadGqasnnDQTO4cdmFxRLkV8gc6MWO5mvel8iN1HVgFxbKk1/RZcidzEt6+3m38T+jq0bsSDTKsKZBd97nb9aeHT9Z08XQ3K36KYSwm8xXuFCe/IrGoXxYpF6wbo2CSF0fdpJf0TGU5yN1uowdSpNhfdjRfQ4L5TXzKzRN85E6P2ubg51lSijva23XwK/QKfhInaZscYGY2N/f0Vh2suq6jt74YvlR1durFs8dieZZ3q9oLAVf9RuInWXKjwg0k7Kv+o3FjprGkd3b+UFNA9E+W1FSLMKXaLffRbbADuzADuzADgI7sAM7sIPADuzADuzADgI7sAM7sIPADuzADuzADgI7sAM7sIPADuzADuzADgI7sDOHfgkwAE+zK8vwP7GVAAAAAElFTkSuQmCC";
const iconProcess = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAIAAAC24JptAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAf9JREFUeNrs3TFIAlEcx/GMOBBccigRigYRGhoaKgoKGmywoAZBt0JwjNwMGpqCHCNaxa2MhlxcCgzCghyE3CJIEiwcmoTAxR64CEb4Tq57D78/bhA8jvc+vP9f77hTR6vVGiKmMgwBdthhhx3BDjvssCPYYYddV4qlsthUtnOoeS3gLJ3Jl57FC5/Xc5zYZd1JpA0n8lr7pGbpdwQ77LDDDjuCnabnFflCMXWd+242NVJwGkZkbXU9sGLzujvP3eoFJyIGnL0r2F+zX42GjgVoYtj0O/MZsfToVydHis8/tHfA5yzfUbDDjmCHHXbYEeywww477EhPkbuOUq3Vb+4fXyrvPe6/nzy1fYb+qcnA8uKEd8xmu9RltvxW6X1/Fe4mEWOoftQP4zGba1YKTp1YNGz63X/VbGcSOxHF55ZMXyhqNzc7o/rCsNiOmsUOO+ywI9hhhx3nFTomlcliZzK5hydqln6nXham/dTs7wkuzf/x7rh7VPZm4wGyi4Y3qVn6HXbYEeywww47gh122GFHsOsr5q+j9PP0JOuOmpWJ2+XScZIWDVvOLhba0I5PDFgM24ojK/rbgZ3NVNkH5+l32GGHHXYEO+yww45ghx123Sfw7RdOw8BOLvHtsM/rEVt0K6isnYP/Y6TfYYcddgQ77LDDjmCHHXbYDVR+BBgA55dvjTqxvIYAAAAASUVORK5CYII=";
const iconInput = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAYAAAA5gg06AAAABHNCSVQICAgIfAhkiAAAA/xJREFUeJzt3U1IFGEcx/GfEQvC6mEPEUoXkQWFIg/iQZA8iKALGQiezJdYlDwEvoAWJiRhEggiQSIkIWGQUYgKvoBgRYkHK0FhEaODYpcNdHFhL3YQo3VsV/d5Zmb/s7/P8VnceeTL7Ow+87imHR4eHoKS2gW7J0DxMZIAjCQAIwnASAIwkgCMJAAjCcBIAjCSAIwkgOMirayuYWV1ze5paHXR7gno1Nk/hM2dXQBA6bd1tNTX2DwjPRx1Jh0HAoDF1e82zkQvR0VyKkYSgJEEYCQBGEkARhKAkQRgJAHSVLZ0rQe2MDz+DtvBoM45JS2P2w1/tQ+FBVctPa7SmdQ3MpYygQAgGAphZGLK8uMqRcrNztI1DzGCoZDlx1SKVFJ4Xdc8KAalVfDS4kIcHIQxOjVreKwoz4uO5jqVp08a1fce2Hp85Xd3lWUlaPCVG8aXNwLo7B/C3r71Lw9Oo+UteGVZCR613EG6yxU1vrmzi+6BYYZSpO1zUr43B13+WkOo7WCQoRRp/TAbK1T7kyGsB7Z0Hi5laF9xyPfm4NnDNmR7PFHjwVAIfSNjDJUAU5aFMjPc6G1tMoQKRyIMlQDT1u7ihZqeXzLr0I5j6gJrZoYbgz1tKMrzRo2HIxGMTs0y1BlZsgre0VxnCAWAoc7IslsVHc11KC24ZhgfnZrFm8k5q6YhkqX3k1rqa05dnZj88NnKaYhj+U2/X8HfhrGTn6somqXbjJ8+f4nljYBh/OaNYiunIY5lZ9L/AjX4ylFZVmLVNEQy/Uza2w9h+NVbBlJgaqS9/RC6B4YNt9jTXS50+WuR780x8/COYdrLHQPpY0okBtJLaUvXadYDW+gbGUM4Eokaz/Z40O6vxeaPn3jxfsbwuFOlu1xorKpAaXFhws+h9UyKFai3tQlXsi5hfGYhZQIBR+uU4zMLSs+hLVK8QJkZbgD2bImym+rvrOXd3fT8El7PLRoC5WZdxv27DX8DUWKUI03PLylt6ZoYfKw6haSkcxuYUqTFTyunBgKOtnTZvV/NKZSuSUsrX3XNg2JQirS5vaNrHhSDUqQuf61hDwPpp3RNyvfmYLCn7Vw/w+vU+fEv/QRgJAEYSQBGEoCRBGAkARhJAEYSgJEEYCQBGEkARhKAkQRgJAEYSQBGEoCRBGAkAWz/hyK8nR4fzyQBLI/kcafelmPV39nySP5qX0qFOv4GZBXa/z7JTievb07ZZ85rkgCMJAAjCcBIAjCSAIwkACMJwEgCMJIAjCQAIwngqEj/fk2okxZxbb/pp1NjVQVmP34BANy+VWnzbPRx1Cq4Uznq5c6pGEkARhKAkQRgJAEYSQBGEoCRBGAkARhJAEYSgJEE+AP94DIQ3P8bVgAAAABJRU5ErkJggg==";
const iconOutput = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAIAAAC24JptAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA55JREFUeNrs3GFIE2EYB3AVEcIVNEJFCTLEKBAKWoFCMaSELUrJmBA6FUQRJKlkZkQfIiqUQkNwRKlE2lopiQlOxrBAsZDBBopiOhAt+rAPNtryy3qGcr1twe5uzt1x//+n3WDH7bf3vee5944lB4PBJERUkmEHO9jBDnYI7GAHO9ghsIMd7CLyYeLjL3+gRFu4b68KdgLS3tM/M79IL3LU6s67N6RplyLNw9qCo6x5vZKdsylJCOxgBzvYIbCTc3+38dNnfvXO9dXj39xM+Bfek5amPXm8XFcce8u9G+Nu3DFF/ZoU4Ch0GGNTn588H5THnJ2dX5DadHOveLr7LDjfiYzD6aJL5lj2kLrLR2yqrtCcKEiU19zi8oNnL7mzR+/oeMaB/aKPR1nj7lj+4dpSHftO18AQgcKOV7RFmpoLJWzpMA8OUycAO17Rnztz+mg+t7nm9d55bIYd37Q0GPOys1i+9p5+2PFNW2NNjlrNbVIHah2xwY5X6LriZl0lXWZw71jsk4K6FkVfzx7MzrhVV8m+89rm4F92lb4WQF1LWNmlBpBn2cU6Sqjs6gpPsXxUdvnwwS6UWsOlsK6Fz2IB7LZTf/UyW3bdK54vTjfsBJRd9Cgi8+LNe9iJSXefheYpt0nz90heLuyih1pih9PFbVLDfO96fdRFediFFvV6R8dZOGqY+dzNULrd6voPaob/6VdKddQw43wXJdQAdzDLyBRD8VltkQa1InqoAWafs6L2+MrF8/w/nirit1pYWhH0kUDg7w/rWf22y0BZmZl0zc+nsLY0GAXtWdi9beuIzWKflN34opkYNqCosLL1Qa1SdbQ2Cb3bLWzOTszMynFujnyaZjfpYiussDYbDSIeExBm5/X55GjHVgPqSLoGhsQV1ljPd1zY9X5pZmn9e+TJ2jw4LLqw7pjdQ1OTxO3Kr93mXrc+ehqaNxs+duoILaw7ZievRI5BmjdCCyv6u+2OpK2xJsadpCoQjkZcVZk+9ufvlGJnqq7YepGeni6uqirXLh4PX2ENCnawgx3sENjBDnawQ2AHO9jBDnYI7GAHO9ghbMSvubN3PzHukHjaSf85iv9GrVIl3q6qTF+Qe0hecPR7NxsN8dizRP87kD2Zvu28j/MdagUCO9jBDnawQ2AHO9jBDpGFHbdgw/7nkNQi0bWAucVl65jd/ztQVabfqUerlWIni8AOdrCDHewQ2MEOdrBDYAc72MkxfwQYACwHe4ywzen1AAAAAElFTkSuQmCC";
const iconSilhouette = "data:image/png;base64,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";
const iconShelf = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABoCAIAAAB9vEnIAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAg9JREFUeNrs3T1IAlEAwPEM0cSP8giK3CIaHBojGlqixYYWob09HBoKGqIhyKFB2qOxwKUhl2hpiKghKHCQiIjsi3qBnSQudqCYbb6re12P/396i5zvh3e9V+flqdVqHWQrD3bYYYcddoQddthhR9hhh933Su9mNndoDZKJyUg4hJ1EqdWNohDWIGYYmZUFd9p1uvNt1eFaB9hpFXbYYYcddoQddtjplVf2BfsHR0/iTeVb3Nrdc/oQfUZ0emrC2f3sUnrz6v5Ryw+RjY2zxDmbL1zrClffOFsTdMquXC7rff2SnaDX3mGMUGhsJK6B18lFXpimop8VDbtIaG52RgO7ws2tbTvWKKzvsMMOO8IOO+ywI+ywww477Ki9bP4OqlKpnp1fajB/ayKq7e6ESG/vcM6228Pzq94WshOUsOtx672rv1WX3+fUORsI+L/GPl+s19DAq/giPqqNS160O6ziemfBrS/Oa2D3k784s0ZhfYcddtgRdthhhx1hhx122GFH2GGHHXaEHXbYYYcdYYed27N5X4AomQq+iq4gayLK7Uwzd3zKOdtuwWBQbwvZCUrYxYcHhwb6dYWLGYY1QamXSD93Uc0zPlovCInxUacPp+IZH8pKppab42xmjTUK6zvCDjvssMOOsMMOO+maG2drm+laO/4Hg3Z2/yLssMMOO+wIO+yww46ww+7v+hRgAGfg1plqSSxVAAAAAElFTkSuQmCC";
const iconEnd = "data:image/png;base64,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";
const iconCtrlStart = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABoCAIAAAB9vEnIAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA7NJREFUeNrs3VtIU3EcB3CNXM1dvKa1Zm06ZzatpQ01sOwqaRlRgj0ERfQo0ZPVWy9doOitkKAiiQwSSTBJihlRFJqXmZe2vOTWaEOmzc2JBfaP4OyoIdbO9v/Pvt+n32GK53z8X/efGDkzMxOB/FMiYQc72MEOdgjsYAc72CGwgx3sZsc94Xn89AUpjpbslsukbNotZ/O2Lt28+8n+lRTm4ZErVZVs3uQyNm/rNxy/gN2SCuxgBzvYwQ6BHexgBzsEdrCDHexgh8AOdrCDHQI7YRKiM8Ze8+DQZ5vDNWYeHlnM1/OPeDSK1Yv5Fq1qnUws1m3QbNSmLgU7q93Z0Gzssgy6PJ6QNQexSLQpTVWUl2PYkh2WdqSh3a9vpHtCSBrskX1FwRMU3s494ampazR2mBgZlbLVqrOnjgXjwwUC25HmVv2w/ovLNf+l+KTkRIUyWh4rkccI/hhe97dJ9/io3eZyOv7Yi8+fPi74OCikHYG7fLvGNz09674lktQsvVpviBJHh6CVffdN2vq6B03t7vGxOS+dPFBcunc7i3bz4aKiRNocg7ZgB5Wuauvt/PD6pc/rDR6fMHZkPr1w4xYfTh4bl19WLolPpDjSkTbY9bzROmAJUucVxu7Mxev8MS4lLX3rwXJG5oqelmfmzvf+YVcqvXauUpCpQ4B9xZ1HT5iFI9EVFaszddwlWWlWP6hjYk9GequxrZPfVTfvKWVt86QvPpScsp67fNdnbu3opm9X29DEH+bIGBea+fRvYyg5TOYu7rKuuYWyHVkGmwaG/TtKfS7dyWGBkN+orqCQv18mCwOadq/etnON7teKJK+Q5bc91Dl5ZLHJXRrftNK0a+v5yNVKTTqbvZWfjNx8ru6yUG133UP+DqvK0kcwH2VmNn/CJRMdHTv+VEU6bOza9ezbkZ5BVgLcpamnn46dZ3KKq2VxcRFhkoQ1Cq52uMbo2A3Z7Fwdk5AYLnZRK1Zytc83RXlfMeeGGM8qpX9ssTqc9O3+z8AOdrCDHewQ2MGOxQjzd9tWS/+o3RYWD/xj9hEofTuf1zvnNA99dqHIxOJwf/iEGDkdu+Kd2+Kl0vCFE4tEpbsCeqM70PNZQQ6c5ufqvVqurjpREYwfkaFRB3hKG+h4F6xPaPHsgv0xOqxRYAc72CGwgx3sYIfADnawgx3sENjBDnawQ2AHO9jBDnashDv5ZfkImNH/wWC1O2sbmkhRUbY/RZEEu6UW2MEOdrCDHQI72MEOdgjsYEcvPwUYANJef3MZM2DWAAAAAElFTkSuQmCC";
const iconCtrlEnd = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABoCAIAAAB9vEnIAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA61JREFUeNrs3V1IU1EAB3CNlKbTaoHK8ms5vxKraZJFShYuaGAPFvqQIL304Fsv1XP0ID1GUD2UPgRJBD5oMIwW2sqvdFR3uil+5UTnMpuz1RbYCeF4mwbmPXf3zP7/p3M33O793XPO/Tj3zOiVlZUoZEvZAQLYwQ52sENgBzvYwQ6BHewUy04+V8u75DNb3iz5/RfOnUlMUPO5ktF83gu43nhndGaWFDRq9YNbN9Bm/yGrcCQLPh/6OxwrENjBDnawgx0CO9jBDnYI7GAHO9jBDoEd7GAHO+QvkTRO1t7R2S84/D++M18tOtZDotemyLHlOZnpEgcwtz4+a3eOPWozh2H3ih2Zf+zlmvMKtNnuwQ+R3uicE1Po75QJm2cq0rKy0/MLI2KDF+fnhB4rR3aqhMQkfR7OURDYwQ52sENgB7vtYheU4XbAdrbTpWpp+etnT6RsMLmuoOV9uxOVsVPH7aJl/7IvUuy8Hvea3d49ytiVGApFdsvLC5FR9TyzMxs2nXD3d/s1Glp2OQT+4cgOJruZLup1GYrZ5WSk0vLYRxv/diN9VvGOT9MmKWZXZawQN1v36DDPcEH/t+nREbp40iD1ppkkO7LfxIMJAxYzz3ZCZ0cwGFgtq2Jjz1acUPj8rtp4Slz1hFec8pE2MT601iOXFuRJn6Ym1Y4cbcVVz2l7N223cdhae81tdJFUurpqExfXFQ11NWRt6KLN8mLRNckVXGdLM22tv7vpsuNM5kYysCO9Xq3ooEHW8nXr0/GBHi6uIlyTBM67+IW+UqjLvFhlZPLhzOaA3r7X3DPk/OOiLb+goLwyRhWnFBzZf8LbLnGNI+clN69eYTUhl+X82fV8qvj43OJSXdGx8B8ZhnqtC+65kDN5hnBRzOce321qsQy+D3kxJiY2VZ+tzcqVeyyNtFD31MQnh13cSGWCi5Jj3rbF2vew9bk/ENjwXVITVfHs57D/DATWe9FUGA411Ncw/1JZ5rx7l3z3Hz8Lab+KhFS3S1XGEoMs4+4y/l6A3TnW/rJLKUFy1llWdNhUWS7fV8j+WwukDnZ1D/QLDte8JwyT/wlZcX5u6dEjEq/zubALSd/mnp5qbHpCy9fqazfzJynJyWHwEifcv4+y2a5HZCdTb8XFdcV/G9jBDnawgx0CO9jBDnYI7GAHO9jBDoEd7GAHOwR2sIPdhqHPQ2rUam7tOP0/AqtPZZCC6XTZwZwDsEObRWAHO9jBDnYI7GAHO9ghsGOVXwIMANaJQsOJbkIWAAAAAElFTkSuQmCC";
const iconPar = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAIAAAC24JptAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAArNJREFUeNrs3U1rE0Ecx/EmymokRthK1cRo0tZtk5CEmlqL4EG89eJFCB4EFXrqxZPXvgDfgKeKx9BTxQdUik8gRMQHhBZzCEKhag851AShTRsHoq1N23UNO7vO9vs7LWWYlE/3Pw+0M/U1Go0O0lb8EGCHHXbYEeywww47gh122GGHHcEOu/82u2V/wM1bd4qzJRk97/L7b1y9lMskvfnezZTKkuBEVlZXJx9OU7OMd5uSNLpHzgwFNE1S//FI2EU7n3K/65koTD149br5LH4w1/IXqFlqljWKjbn/5MXLtx9s7LCyWF17Xl6ue9Zubn7h9r1HEvv/uuDZmv1erUrtv75S96ydWKOk4zF5/UcPdXl5vBu/Pip2F7Vaza4OnxXfFWc/NZ8Dgb1etmu+fTb29rFUZo3C+g47gh122GFHsMMOO+ywgwA77LDDjmCHHXbYEeywww477Ah22GGHHcEOO+yww478Q9Q4E/XnIY3KYrXy+8/n9WBQDwWbz0bs2MWR86H9QezWM3n3cWH6uZWW5wYyY1fy1Ox6Ps9/sdhy7pujR1UUsIuFj1hs2XkghN2GpPp7LbYcTCex25Ck0S3mBCstc5kEdq05Ef37+eze8GEnJ1ll7KwUYy7Rx9q4zWK0PizuLDtRjBFdN2kQ0DR7T615ak+WNX2tMj0x9rPbZnggbTYX98SxM1upmNyzcnb4JHYdbRSmGAodXp2oZ7ddYWYdn2EVfO9S/Vt+Pe34DKueXTTctXmlIgbBU6bTCHa/Yhw/2roVc+86LcXshrKtm7PBVJ9b34z0eyomClNP37z/sbTk8CCovN1Mqbx235qMiMFODILUbDuJHNRd/HTpdxqdThiSOt+3Rxu7nHfRzsf/2NqhNYsddtgR7LDDDjuCHXbYYYcdwQ477LAjW+enAAMAKVuFE88WBAQAAAAASUVORK5CYII=";
const iconParblock = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAIAAAC24JptAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABCVJREFUeNrsnUtIVFEcxsfTNDqgY86ojfMoH5PPVPIBQli0KKigTQZCLdpFiyhooRDhIoKklYRQqwIRrBRCeqAuelhkCEkYBRIVmJNOOqRJ5rsTI8OQjnPuuf+Z0TvftzrimcP/+333nnu8c881bnl5WQdJKQ7swA7swA7sILADO7ADOwjsosbu6av+rpd9lmTTmZPHTUmJMciOyX1s2O1pvvfgk3v0zcehW60dsXncSbIbHRvztycmp8AOAjuw2/jSqx+CXzFqzl/ajOZTTUk3r9RH+rjrG3ivgQNnfOrX/c7uSLPbqtdr47yLjzdEmp1lW7I22GWkW6I53xkNhpbrDbSWAifQ9qartIPXN97gczSus1ijxOwaZW5hnp8F4SuRfPCRcW802U38nPS3F5eWSaaPddaP4Rv8u2ci0ufs/MKCNs672dm5SLOzplq0wS7TmRHN+S5er79wqobWUuOdNn+77nQt7eCtnd3fvARTHgE7xljlnmLi4yGAHfngHd3PsEbB+g7swA4CO7ADO7CDwA7swA7swA4CO7ADO7CDwA7swA7swA4CO7ADO7CDwA7swA7sILADO7ADuxiSgnctPOp50fv2na89Of37x9TKVvctjGVZ031tS7Kp9thhpy1daR39A4OPn/fNzP7x/Ri4L8Bls/oaxviEI/urJB6hHXZ72jqf+Pfmj4x7Z+ZWHm+3m83GhJXteNVlpUcP7hMfVi/u7fbDrjV/tbi05LfKG7zEa3XnlNoLfDj7PwVyHPzytV05u+aWu8E2aYwEPLTN+6SnpohnI3rODg59FuwpsWvmg/DgSjv75J2aJrepgF2WwybY055qVuqtMDdbvLMjQ/GEYDYlkttUwO7A3krBnuUFeRLzrn9SC9lN4j024iWVlxSE5ToraK8o3yXBTtCeXDCCJSkNhtHaMxoMik5ApfbkguElmRMTyYNhtPZKcjLl1koi9qSD4drltJEHw2jtFeZkSS81Q9qTDoaroriQPBhGa6+6qix89tQEE/IiIBEMI7TH1+hqXuYW0p6aYHhhvDzaYBihvVKpiVzQnspgQpYnEQwjtFcsO5GL2FMZDFdV8D+25IJhVPb4XKt+o+s69tQHwy8FvEjCYBiVPZfdplOtYPZIglmnSLlgGJW9iqI8HYXWtEcSTLAipYNhVPZKivLDZ48qmDWLlA6Gkdjjc63E/U5xe1TB8CJXX+ukg2Ek9nJ3OnREWm2PMJg1S5UORvL9xmcvN/rvuW9q8WCaGi5G7rjT/bubmKTThGxpZunPSrJzWtO0wS7bYY80u/Ld+RoAl+90nDh2SPrjBO/lcdmsEl+MaUD4bhvswA7swA4Cuw3HLs+V5b8TlZu5IzbZyf+/nmG3p6f39XZziqLnrsAOAjuwAzuwAzsI7MAO7LSnvwIMAEVMO1TfnClhAAAAAElFTkSuQmCC";
const iconGroupDuration = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAIAAAC24JptAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABU5JREFUeNrsne9PW2UUx4sxlS5otCZk60DpJDVbUjOMdUEcrpk0sV3ACa6oYyEkiy+IGl8R/wMXXxhfkGhMFvwV6WDRNVuNnaQgY8hYxkITltQJZGx1YNKY2W6GN3jYkssJsOu97b1Pn9t9z6t7abnnPJ/e+zzfc55DKVtZWbHB8rKHgADswA7swA4GdmAHdmAHAzuwAzuwAzsY2IGdtPawJaJMjE3OXU/f79VAY33Vtsr7vXr67MhS5m8tXtxVLn+Dr3TYDUTj0dHxO8vLKu/xep5RYXfuUvJq+k+N7iq2lPvqvKXwzH7y+VeRoRF1cMZaMjVbCvNdb19k4kpKsFOvZ4fln9nJqWRiapr/ZM9Oz5NPPL7pm7dtrVS51MvPez011VqcNu2tr3ZVWp7d8MQl5dhht390tGOXnjuC24GmVx4sjTL9x7xy3B7w5w3uQdR3fH0INTVCGyOvgIEd2IEd2IEdDOzADuxK08q098ze+ic7GBtKzV8TENbV9E3luNa1VYBHT81TbcH9jz1aof1XdNRRCFzs/AXxHy/naLaXrnALnlnJ5jt3lau0WegdoI5n1t/g+/ncb/wJ6j70esWWcouSyt7+t/fEj3xW1bVJZtNbN+7uCH947DPldOb32e7OsEXZ9fZF+OmRgyFzNUq1q9Jf95xympiaXkgvWREchc33Q2hQeZSmda8VHa0hh92+9ul9E7HkTcfCpuHQoERoY1JAzXvr+dKeGJu0FrjJqSSftWk4umRdQRrlzeaAs2LN2fexX6zF7svB08oxDYSGIzQnO9p2QDnOZLPHI6esAm4gGqeANx2IIHa+Oq/XXbO2aFy8TBmb/OAoyOjoONcl2rtPjMwrug6tpS93lpe/+O6k/OwoSL57SZKrOHUU0ivBl15UTieupGb0NMKINwqPN7hQ8Lo6KAzOZ9uC+7le+fqHMzKz4+FR2BS8uHx2U73SHvBzvXLm7K9ygiMhxXUJhZ2fLjGyjhJqauT1tVPDYxIuGhQSF1LbnU5D+jQMqEG1BvZxvTIYG5KNHYXEdcnhfAWd8exomd+z08P1ilRJ7mrqevGyckrSqhBdYjC71emj+TVl0SAR0B/9SR52FIyiSyhILq2kYLdaX3lhN9crlDNKkrpyXUJBFqhLjGd3T6/wJPfbaFwGdifjwzx1LVyXmMKOlvy3gq8qpzcymaLrFQqA65KWfQ2F6xJT2NnuFuW5XumPJ4qoV8g1BcBTV8P7Rw3eJ+OVa5qhi6hXyDVPXfMoqYtmt8uzg+uV2PkLRdEr5JRvJVNIZnR7G78/++47rTzJPX6iCKU97pSCoZDM8GI8O5qPuV5Jzs0L1ivkjpxyXWLsEmEiO9vdzgSuV3iNW4BxeURh6GqTKD4724ai/IAouUeOSB4pp1w2WYYd5Yxcr0RHxwXolY0ldb1b/bqszLzvXaTFjjcRiLdPez4wMAMTd9/ZNjQRCDZybSo4m9k9ZOuaCIRZ3lv9ErEjcfD+22+Iadzk0xw5NUmXCJrvChFox/r6FRAf97xnk9LQ9wl2YAd2YAcDO7ADO7CDWYNd5lYW7HQY7xcRWTctkfuONzNHhkbkbOsrk/N/zvBywD3b7nQ6yjcvZx05GFLZQuztiyws/v8+p+OR8kbf7lL43kV6bIOpWb7Hynch1lkud1vlUguLf2n8C9zk3Hyt+2ntFVN514qucIv4svPNxcUSWWe7O8M9ne3CSqcOu/3ZWrfl57v1z116SeWOoAGrVIlnUrO5XE6LF/XrWJUdNArYwcAO7MAO7MAOBnZgB3ZgBwM7sAM7sAM7mD77T4ABAEGG2lWjGuQTAAAAAElFTkSuQmCC";
const iconGroupDurationR = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAIAAAC24JptAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABUtJREFUeNrsnF1MFFcUx9fGmNZsfSANQdRGKFmLZo0bpaKmVGLFuGsWrSj4/ZE0Ppho2xcfTHwxNTE+ND5gaozaL9MikNYNbONSgpX6iREVxWRVJCqotJ1WXJXwIB4knT0psJnZnXvnDvmfp725s9xzf8zc+z/nntlRfX19LlhSNgrswA7swA7sYGAHdmAHdjCwAzuwAzuwg4Ed2Dme3f3OrrrGcwb/aFHBnInj04frbWq+3hK9M1xvvs871ZPtCHajDV63u/ywFosZvNjreS8BuxvRtvDZi8P1UldOZsb6ZQH1Cb5h8Drj4FK3252PdpUfrq07PULYTUhLk+zZ0ZqTTc0tI+KZ/WJL4/nLj7V/jFw8PiM9Qe80T/ZL19CLbLT9Ht10evNQVU2ez4t91qhVhiIV9b/rzU1LFgUWFjj7mZVmK4JF3qzJerP1zl3Hr3cyzf9Rvv757yfdYDcCDezADuzADuxgYAd2YAd2MNO5gO6nsapwfbT9nmifenp6H2jawOe3xoyZ8I6M9Jdn8rsl/gXj3nYb/8po45cSuAT5XkH2oreXZ6XE2cAom0uL8cwqtt5lTcwc2SzMTtDEM1s4L+/kH+f5E7R15VL32DcdSir2vKf8+C96MyczgyYoil0/rHWln+/drzdbb7Vt3VjqUHbl31Tw5vplAbEaZVJmeqFvut5saL52v7PLieDIbXI+/kj5pidxpGl6r1i3PEC6If7f+77CkTcdc5umQ5OSoY1JAQU/nMO3dsVPAgcbOcxXbZqOKVmXkkZZESxKc8cHO1RV4yx23GGaCE1Hakz2ackS/bMWix2pOOEUcJWhCK9x4BORxC7P5+UngQ2XrlDEpj44cjLEKpJIl6Rydp58XLF5ZTGPnA4eq1afHTlJrnLJZU8ehfSKf+4HevPCzWhrtE1lcOQeOak3yXmagj3syEr8C7he+e7nWpXZcffIbXJeXjw7pF4pKyrkekXZwq+GM01cl5DbyekSK/MogYUFvLzsxKkzCm4a5NKP4d/0JjlsSX2QBTmotUwf0fZfFa5XjR25xHXJ2mQFnfXsaJufnevhekWpILc/dL10RW+StLKqps+a3GdZcLG+aZAI+Cn0qzrsyBldl5CTXFopwa4/vzJrBtcrigS55AbXJeRkirrEenYDeoUHuT+EIiqwq46c4qFr6rpECDva8lf5P9abHZpmu14hB7guKZ4/L3VdIoSd63VSniLE+EITabBRr9DQ5AAPXS2vW7b4nIxnrmmFtlGv0NA8dE0ipS6b3VRPNtcr4bMXbdErNCg/SiaXRLwlZP357JY1y3mQe+S4Dak9Pig5Qy6JGMV6drQec73Scrddsl6h4WhQrkus3SIEsnO9rkywMSnP5RG5YapMwn52rkFJ+UpZco8G6vivDoiMyybHsKOYkeuVUOM5CXplcErd7FG/KRP4PhltdryIQL59tWO7hRGYvPvONaiIQLLR0ELBuUTXkP2viECaJX3UrxA7EgfbVn/CFz4JRsPRoIJ0iaT1LqWszPad8ehq/5cuJQ11n2AHdmAHdjCwAzuwAzuYuuwUr+NTml0lO12THAs7m92+r7/lpw0zc6coy87oO1HdT2MHj1Ub/IWhxL/8V1t3uvHy1SG7Ov7S+KFqmtu9qHCu49ntOXDU+Husz549T9D7p/avwT/12YZSCakk4ezojpDpVn+x11K/4j9baZRd/rT3+ctrQm12rqcsuFh0xjx1M5H7NH5EPSUnK8Gz9uBh18NHj5P7rlPZwcAO7MAO7MAOBnZgB3ZgBwM7sAM7sAM7GNiBnWPslQADAIIASIATkJKxAAAAAElFTkSuQmCC";
const iconLink = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAFoUExURf7+/v////z8/O/v74mJiV9fX11dXVxcXGBgYIyMjO7u7tnZ2RwcHAAAAAEBAdjY2Dg4ODk5Odvb2+Dg4MvLy8nJyMzMzM/Pz/X19cTExKSkpJmZmZaWlpiYmOLi4gsLC8fHx1VVVQgICMHBwYSEhGZmZsLCwvv7+YeHhw4ODvDw8Pn5+dDQ0NTU1NPT07a2tg8PD0RERCEhIb6+vhERESIiIpubm1JSUiQkJAoKChMTEzs7OxgYGObm5szMy2VlZSgoKCkpKWRkZHV1dcPDwywsLHJycsnJyd/f36+vr1NTUz8/P25ubm1tbU9PT1BQUFFRUVdXVyMjI4CAgE1NTfv7+0xMTPj4+EpKSvPz8/f39ycnJ8/PzrKysh0dHbe3t7Ozsw0NDSAgIEtLS5KSkpCQkOjo5+vr6319fTMzM+Hh4SYmJuXl5aurqzY2Nq6urqWlpYODg3x8fHt7e3p6enl5eYaGht3d3YR0QgAAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAPPSURBVHhe7ZWJU9NAFIeTqiiIIhQqCgiKoKjI4RnwoJ5449kqCioq4Ing8e+bpDR9m+5vs+lmlxlnO8M3k/f2vV9bviaO47pObisBysbgCHpmAMrGAMrmYCW0EoKyOVgJrYSgbA4ZS7ht+46mpqad/h/AruaW2BhzoYrdrXv8114hWtuYsWwl3BfFCNDOjjEXiuggMQLk6Vh8hxI6aQxGFx3LVMKCIJWgwIwxF4ooCFIJCnQsUwkLglSCAjPGXCiii8ZgdNKx+A4l7KcxGGkk7D5wsKe3r6dHBoec7n6cSiAv4cDhI2AHD4OuexR3CWQl7B4KBvg7eBh2nWPHR1CXQFLCE1L3VYLhYOxk26nR0dHTFYyNcw/LSZibYIYkMBjfkp/kH5aTsDk6L4szsS0oX07ClrPskAR8CemW/DlwTk7C87EhCfgSkgU4X07CC3AcIpSwukCQLyfhRTgOQSUU5ctJOA7HIYiEwnw5Cb3aeVnUJBTny0kYvAHBDh4iCet/f1PT9FJKQv8NROOXev1HTV8iLm/OcvKvXKWXUhJ6ZMcM/whA/fc/dcUZojUpCT2yo8g/wgc33x2itdQSFvlHuODnu+GDtVpLLWGRf4QHkO9co7XUEs7wj3CA8nOGJIT5hiTE+WYk5P3+q10TEoryTUgozDcgoThfv4QJ+e512u1gZpmLGtJJmJTv3iDdm4x3mUiYmO/kbkXd8dtMIwsJZ+vzC3Xn7tydDl737s+yDeaCIIWEEp9fAHUJ1fLVJRTlP3j4aG5uroLHnNkAqhIKP/8MaXj1sxWAsqSE4u8/eAPVhsdfoChhwv+/SBoed4GihEn+FUnXi81GAGUZCZPy3SLpeuxsBAUJE/M1S9jyhBwJEc/XLOFTEh2iLl+zhBO15SHq8zVL+Ky2PAAnX7OEfZvdCnj5miV8/oIc4ebrvhOWytERfr72O+HL8uYRkK/9TuiUysJ83XdCH6+a/Pb8a9A18Th2Zt8MlGBXs4TJ0P44ToJ2CZOgX8IEmJBQCCuhldBKaCW0EloJrYT/jYQLY4uLY28bwAL5FCoSZgIVCTNBWgnfsePqGAFBSIL3aFGjmARBoOwuoUWNYgkEIQk/oEWN4iMIQuVP/cy4MvqXQRCS0FkRbGsAK7yMEKDsllbxtvRYLfEyAoCyj8/z7A4VfPnKz/CBJPSxnNkvobyMMnyAcohv7eyixvD9B1gfAkpYQX7t5/rGxq/fGw1i/c/aX8H6AKBsDKBsDgIJDQGUjSFBQgMAZWMAZXOwEloJQdkcrIRWQlA2ByvhFkvo5P4BYiWW7YyM4IkAAAAASUVORK5CYII=";
let loadPromise$1 = null;
function loadDrakonWidget() {
  if (window.createDrakonWidget) {
    return Promise.resolve();
  }
  if (loadPromise$1) {
    return loadPromise$1;
  }
  loadPromise$1 = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/libs/drakonwidget.js";
    script.async = true;
    script.onload = () => {
      if (window.createDrakonWidget) {
        resolve();
      } else {
        reject(new Error("DrakonWidget script loaded but createDrakonWidget not found"));
      }
    };
    script.onerror = () => {
      loadPromise$1 = null;
      reject(new Error("Failed to load drakonwidget.js"));
    };
    document.head.appendChild(script);
  });
  return loadPromise$1;
}
function createWidget() {
  if (!window.createDrakonWidget) {
    throw new Error("DrakonWidget not loaded. Call loadDrakonWidget() first.");
  }
  return window.createDrakonWidget();
}
function getGardenDrakonTheme(isDark) {
  {
    return {
      background: "#1e293b",
      iconBack: "#334155",
      iconBorder: "#64748b",
      color: "#f1f5f9",
      lines: "#94a3b8",
      lineWidth: 1,
      shadowColor: "rgba(0, 0, 0, 0.4)",
      shadowBlur: 4,
      scrollBar: "rgba(255, 255, 255, 0.2)",
      scrollBarHover: "rgba(255, 255, 255, 0.5)",
      backText: "#cbd5e1"
    };
  }
}
const getDiagramStorageKey = (diagramId) => `diagram_${diagramId}`;
function normalizeDiagram(folderSlug, data) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const raw = data.diagram ?? {};
  const nested = raw.diagram ?? raw;
  const name = data.name ?? raw.name ?? "Untitled";
  return {
    id: data.diagramId,
    name,
    folderId: folderSlug ?? "default",
    createdAt: raw.createdAt ?? now,
    updatedAt: now,
    diagram: {
      ...nested,
      name,
      items: nested?.items ?? {}
    }
  };
}
function useSaveDrakonDiagram(folderSlug) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables) => {
      if (typeof window === "undefined") {
        throw new Error("Saving is only available in browser");
      }
      const savedDiagram = normalizeDiagram(folderSlug, variables);
      localStorage.setItem(getDiagramStorageKey(variables.diagramId), JSON.stringify(savedDiagram));
      upsertDiagramInStorage(savedDiagram);
      await api.commit(savedDiagram.folderId, variables.diagramId, {
        id: variables.diagramId,
        name: savedDiagram.diagram.name,
        folderId: savedDiagram.folderId,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        diagram: savedDiagram.diagram
      });
      return { success: true, diagram: savedDiagram };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["drakon-diagram", folderSlug, variables.diagramId]
      });
      useDiagramStore.getState().setDiagram(result.diagram);
      toast.success("Схему збережено");
    },
    onError: (error) => {
      toast.error(error.message || "Не вдалося зберегти схему");
    }
  });
}
const translations = {
  drakon: {
    copy: "Copy",
    cut: "Cut",
    paste: "Paste",
    delete: "Delete",
    editContent: "Edit content",
    swapYesNo: "Swap Yes/No",
    addParameters: "Add parameters",
    insertBranchWithEnd: "Insert Branch with End",
    insertBranch: "Insert Branch",
    insertBranchLeft: "Insert Branch to the left",
    insertBranchRight: "Insert Branch to the right",
    insertCase: "Insert Case",
    insertCaseLeft: "Insert Case to the left",
    insertCaseRight: "Insert Case to the right",
    addPath: "Add path",
    addPathLeft: "Add path to the left",
    addPathRight: "Add path to the right",
    addVertex: "Add vertex",
    addRemoveVertex: "Add/remove vertex",
    sendToBack: "Send to back",
    bringToFront: "Bring to front",
    deletePath: "Delete path",
    editUpperText: "Edit upper text",
    editLink: "Edit link",
    goToBranch: "Go to branch",
    increaseMargin: "Increase margin",
    resetMargin: "Reset margin",
    flip: "Flip",
    format: "Format",
    diagramFormat: "Diagram format",
    changeImage: "Change image",
    yes: "Yes",
    no: "No",
    end: "End",
    exit: "Exit",
    branch: "Branch",
    editSecondaryText: "Edit secondary text"
  },
  drakonEditor: {
    action: "Action",
    branchName: "Branch",
    caseName: "Case",
    choice: "Choice",
    comment: "Comment",
    controlEnd: "Control End",
    controlStart: "Control Start",
    createAndEdit: "Create and Edit",
    createNewDiagram: "Create New Diagram",
    diagramId: "Diagram ID",
    diagramName: "Diagram Name",
    duration: "Duration",
    endIcon: "End",
    exportPseudocode: "Export pseudocode",
    forLoop: "For loop",
    groupDuration: "Group Duration",
    groupDurationRight: "Group Duration Right",
    input: "Input",
    insertion: "Insertion",
    link: "Link",
    newDiagram: "New Diagram",
    newDrakon: "New DRAKON",
    output: "Output",
    pan: "Pan",
    parallel: "Parallel",
    parallelBlock: "Parallel Block",
    pause: "Pause",
    process: "Process",
    pseudocode: "Pseudocode",
    question: "Question",
    savedIn: "Saved in",
    select: "Select",
    shelf: "Shelf",
    simpleInput: "Simple Input",
    simpleOutput: "Simple Output",
    startHere: "Start here",
    timer: "Timer",
    toggleSilhouette: "Toggle silhouette",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out"
  },
  editor: {
    save: "Save",
    cancel: "Cancel"
  }
};
function useLocale() {
  return {
    locale: "uk",
    t: translations
  };
}
let loadPromise = null;
function loadDrakongen() {
  if (window.drakongen) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/libs/drakongen.js";
    script.onload = () => {
      if (window.drakongen) {
        resolve();
      } else {
        reject(new Error("drakongen failed to initialize"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load drakongen.js"));
    document.head.appendChild(script);
  });
  return loadPromise;
}
async function diagramToPseudocode(diagramJson, name, language = "en") {
  await loadDrakongen();
  if (!window.drakongen) throw new Error("drakongen not available");
  const jsonString = JSON.stringify(diagramJson);
  const filename = `${name}.drakon`;
  return window.drakongen.toPseudocode(jsonString, name, filename, language);
}
function pseudocodeToMarkdown(pseudocode, diagramName) {
  const frontmatter = [
    "---",
    `title: "${diagramName}"`,
    `type: pseudocode`,
    `generated: true`,
    `date: "${(/* @__PURE__ */ new Date()).toISOString()}"`,
    "---",
    ""
  ].join("\n");
  return frontmatter + pseudocode + "\n";
}
function createDrakonTranslate(drakon) {
  const map = {
    "Copy": drakon.copy,
    "Cut": drakon.cut,
    "Paste": drakon.paste,
    "Delete": drakon.delete,
    "Edit content": drakon.editContent,
    'Swap "Yes" and "No"': drakon.swapYesNo,
    "Add parameters": drakon.addParameters,
    "Insert Branch with End": drakon.insertBranchWithEnd,
    "Insert Branch": drakon.insertBranch,
    "Insert Branch to the left": drakon.insertBranchLeft,
    "Insert Branch to the right": drakon.insertBranchRight,
    "Insert Case": drakon.insertCase,
    "Insert Case to the left": drakon.insertCaseLeft,
    "Insert Case to the right": drakon.insertCaseRight,
    "Add path": drakon.addPath,
    "Add path to the left": drakon.addPathLeft,
    "Add path to the right": drakon.addPathRight,
    "Add vertex": drakon.addVertex,
    "Add remove vertex": drakon.addRemoveVertex,
    "Send to back": drakon.sendToBack,
    "Bring to front": drakon.bringToFront,
    "Delete path": drakon.deletePath,
    "Edit upper text": drakon.editUpperText,
    "Edit link": drakon.editLink,
    "Go to branch": drakon.goToBranch,
    "Increase margin": drakon.increaseMargin,
    "Reset margin": drakon.resetMargin,
    "Flip": drakon.flip,
    "Format": drakon.format,
    "Diagram format": drakon.diagramFormat,
    "Change image": drakon.changeImage
  };
  return (text) => map[text] || text;
}
function getDrakonLabels(drakon) {
  return {
    yes: drakon.yes,
    no: drakon.no,
    end: drakon.end,
    exit: drakon.exit,
    branch: drakon.branch
  };
}
function useStateMachine(initialState, machine) {
  return reactExports.useReducer((state, event) => {
    const nextState = machine[state][event];
    return nextState ?? state;
  }, initialState);
}
var SCROLL_AREA_NAME = "ScrollArea";
var [createScrollAreaContext] = createContextScope(SCROLL_AREA_NAME);
var [ScrollAreaProvider, useScrollAreaContext] = createScrollAreaContext(SCROLL_AREA_NAME);
var ScrollArea$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      __scopeScrollArea,
      type = "hover",
      dir,
      scrollHideDelay = 600,
      ...scrollAreaProps
    } = props;
    const [scrollArea, setScrollArea] = reactExports.useState(null);
    const [viewport, setViewport] = reactExports.useState(null);
    const [content, setContent] = reactExports.useState(null);
    const [scrollbarX, setScrollbarX] = reactExports.useState(null);
    const [scrollbarY, setScrollbarY] = reactExports.useState(null);
    const [cornerWidth, setCornerWidth] = reactExports.useState(0);
    const [cornerHeight, setCornerHeight] = reactExports.useState(0);
    const [scrollbarXEnabled, setScrollbarXEnabled] = reactExports.useState(false);
    const [scrollbarYEnabled, setScrollbarYEnabled] = reactExports.useState(false);
    const composedRefs = useComposedRefs(forwardedRef, (node) => setScrollArea(node));
    const direction = useDirection(dir);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      ScrollAreaProvider,
      {
        scope: __scopeScrollArea,
        type,
        dir: direction,
        scrollHideDelay,
        scrollArea,
        viewport,
        onViewportChange: setViewport,
        content,
        onContentChange: setContent,
        scrollbarX,
        onScrollbarXChange: setScrollbarX,
        scrollbarXEnabled,
        onScrollbarXEnabledChange: setScrollbarXEnabled,
        scrollbarY,
        onScrollbarYChange: setScrollbarY,
        scrollbarYEnabled,
        onScrollbarYEnabledChange: setScrollbarYEnabled,
        onCornerWidthChange: setCornerWidth,
        onCornerHeightChange: setCornerHeight,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Primitive.div,
          {
            dir: direction,
            ...scrollAreaProps,
            ref: composedRefs,
            style: {
              position: "relative",
              // Pass corner sizes as CSS vars to reduce re-renders of context consumers
              ["--radix-scroll-area-corner-width"]: cornerWidth + "px",
              ["--radix-scroll-area-corner-height"]: cornerHeight + "px",
              ...props.style
            }
          }
        )
      }
    );
  }
);
ScrollArea$1.displayName = SCROLL_AREA_NAME;
var VIEWPORT_NAME = "ScrollAreaViewport";
var ScrollAreaViewport = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeScrollArea, children, nonce, ...viewportProps } = props;
    const context = useScrollAreaContext(VIEWPORT_NAME, __scopeScrollArea);
    const ref = reactExports.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, ref, context.onViewportChange);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "style",
        {
          dangerouslySetInnerHTML: {
            __html: `[data-radix-scroll-area-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-radix-scroll-area-viewport]::-webkit-scrollbar{display:none}`
          },
          nonce
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Primitive.div,
        {
          "data-radix-scroll-area-viewport": "",
          ...viewportProps,
          ref: composedRefs,
          style: {
            /**
             * We don't support `visible` because the intention is to have at least one scrollbar
             * if this component is used and `visible` will behave like `auto` in that case
             * https://developer.mozilla.org/en-US/docs/Web/CSS/overflow#description
             *
             * We don't handle `auto` because the intention is for the native implementation
             * to be hidden if using this component. We just want to ensure the node is scrollable
             * so could have used either `scroll` or `auto` here. We picked `scroll` to prevent
             * the browser from having to work out whether to render native scrollbars or not,
             * we tell it to with the intention of hiding them in CSS.
             */
            overflowX: context.scrollbarXEnabled ? "scroll" : "hidden",
            overflowY: context.scrollbarYEnabled ? "scroll" : "hidden",
            ...props.style
          },
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: context.onContentChange, style: { minWidth: "100%", display: "table" }, children })
        }
      )
    ] });
  }
);
ScrollAreaViewport.displayName = VIEWPORT_NAME;
var SCROLLBAR_NAME = "ScrollAreaScrollbar";
var ScrollAreaScrollbar = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { forceMount, ...scrollbarProps } = props;
    const context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea);
    const { onScrollbarXEnabledChange, onScrollbarYEnabledChange } = context;
    const isHorizontal = props.orientation === "horizontal";
    reactExports.useEffect(() => {
      isHorizontal ? onScrollbarXEnabledChange(true) : onScrollbarYEnabledChange(true);
      return () => {
        isHorizontal ? onScrollbarXEnabledChange(false) : onScrollbarYEnabledChange(false);
      };
    }, [isHorizontal, onScrollbarXEnabledChange, onScrollbarYEnabledChange]);
    return context.type === "hover" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollAreaScrollbarHover, { ...scrollbarProps, ref: forwardedRef, forceMount }) : context.type === "scroll" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollAreaScrollbarScroll, { ...scrollbarProps, ref: forwardedRef, forceMount }) : context.type === "auto" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollAreaScrollbarAuto, { ...scrollbarProps, ref: forwardedRef, forceMount }) : context.type === "always" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollAreaScrollbarVisible, { ...scrollbarProps, ref: forwardedRef }) : null;
  }
);
ScrollAreaScrollbar.displayName = SCROLLBAR_NAME;
var ScrollAreaScrollbarHover = reactExports.forwardRef((props, forwardedRef) => {
  const { forceMount, ...scrollbarProps } = props;
  const context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea);
  const [visible, setVisible] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const scrollArea = context.scrollArea;
    let hideTimer = 0;
    if (scrollArea) {
      const handlePointerEnter = () => {
        window.clearTimeout(hideTimer);
        setVisible(true);
      };
      const handlePointerLeave = () => {
        hideTimer = window.setTimeout(() => setVisible(false), context.scrollHideDelay);
      };
      scrollArea.addEventListener("pointerenter", handlePointerEnter);
      scrollArea.addEventListener("pointerleave", handlePointerLeave);
      return () => {
        window.clearTimeout(hideTimer);
        scrollArea.removeEventListener("pointerenter", handlePointerEnter);
        scrollArea.removeEventListener("pointerleave", handlePointerLeave);
      };
    }
  }, [context.scrollArea, context.scrollHideDelay]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Presence, { present: forceMount || visible, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    ScrollAreaScrollbarAuto,
    {
      "data-state": visible ? "visible" : "hidden",
      ...scrollbarProps,
      ref: forwardedRef
    }
  ) });
});
var ScrollAreaScrollbarScroll = reactExports.forwardRef((props, forwardedRef) => {
  const { forceMount, ...scrollbarProps } = props;
  const context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea);
  const isHorizontal = props.orientation === "horizontal";
  const debounceScrollEnd = useDebounceCallback(() => send("SCROLL_END"), 100);
  const [state, send] = useStateMachine("hidden", {
    hidden: {
      SCROLL: "scrolling"
    },
    scrolling: {
      SCROLL_END: "idle",
      POINTER_ENTER: "interacting"
    },
    interacting: {
      SCROLL: "interacting",
      POINTER_LEAVE: "idle"
    },
    idle: {
      HIDE: "hidden",
      SCROLL: "scrolling",
      POINTER_ENTER: "interacting"
    }
  });
  reactExports.useEffect(() => {
    if (state === "idle") {
      const hideTimer = window.setTimeout(() => send("HIDE"), context.scrollHideDelay);
      return () => window.clearTimeout(hideTimer);
    }
  }, [state, context.scrollHideDelay, send]);
  reactExports.useEffect(() => {
    const viewport = context.viewport;
    const scrollDirection = isHorizontal ? "scrollLeft" : "scrollTop";
    if (viewport) {
      let prevScrollPos = viewport[scrollDirection];
      const handleScroll = () => {
        const scrollPos = viewport[scrollDirection];
        const hasScrollInDirectionChanged = prevScrollPos !== scrollPos;
        if (hasScrollInDirectionChanged) {
          send("SCROLL");
          debounceScrollEnd();
        }
        prevScrollPos = scrollPos;
      };
      viewport.addEventListener("scroll", handleScroll);
      return () => viewport.removeEventListener("scroll", handleScroll);
    }
  }, [context.viewport, isHorizontal, send, debounceScrollEnd]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Presence, { present: forceMount || state !== "hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    ScrollAreaScrollbarVisible,
    {
      "data-state": state === "hidden" ? "hidden" : "visible",
      ...scrollbarProps,
      ref: forwardedRef,
      onPointerEnter: composeEventHandlers(props.onPointerEnter, () => send("POINTER_ENTER")),
      onPointerLeave: composeEventHandlers(props.onPointerLeave, () => send("POINTER_LEAVE"))
    }
  ) });
});
var ScrollAreaScrollbarAuto = reactExports.forwardRef((props, forwardedRef) => {
  const context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea);
  const { forceMount, ...scrollbarProps } = props;
  const [visible, setVisible] = reactExports.useState(false);
  const isHorizontal = props.orientation === "horizontal";
  const handleResize = useDebounceCallback(() => {
    if (context.viewport) {
      const isOverflowX = context.viewport.offsetWidth < context.viewport.scrollWidth;
      const isOverflowY = context.viewport.offsetHeight < context.viewport.scrollHeight;
      setVisible(isHorizontal ? isOverflowX : isOverflowY);
    }
  }, 10);
  useResizeObserver(context.viewport, handleResize);
  useResizeObserver(context.content, handleResize);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Presence, { present: forceMount || visible, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    ScrollAreaScrollbarVisible,
    {
      "data-state": visible ? "visible" : "hidden",
      ...scrollbarProps,
      ref: forwardedRef
    }
  ) });
});
var ScrollAreaScrollbarVisible = reactExports.forwardRef((props, forwardedRef) => {
  const { orientation = "vertical", ...scrollbarProps } = props;
  const context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea);
  const thumbRef = reactExports.useRef(null);
  const pointerOffsetRef = reactExports.useRef(0);
  const [sizes, setSizes] = reactExports.useState({
    content: 0,
    viewport: 0,
    scrollbar: { size: 0, paddingStart: 0, paddingEnd: 0 }
  });
  const thumbRatio = getThumbRatio(sizes.viewport, sizes.content);
  const commonProps = {
    ...scrollbarProps,
    sizes,
    onSizesChange: setSizes,
    hasThumb: Boolean(thumbRatio > 0 && thumbRatio < 1),
    onThumbChange: (thumb) => thumbRef.current = thumb,
    onThumbPointerUp: () => pointerOffsetRef.current = 0,
    onThumbPointerDown: (pointerPos) => pointerOffsetRef.current = pointerPos
  };
  function getScrollPosition(pointerPos, dir) {
    return getScrollPositionFromPointer(pointerPos, pointerOffsetRef.current, sizes, dir);
  }
  if (orientation === "horizontal") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      ScrollAreaScrollbarX,
      {
        ...commonProps,
        ref: forwardedRef,
        onThumbPositionChange: () => {
          if (context.viewport && thumbRef.current) {
            const scrollPos = context.viewport.scrollLeft;
            const offset = getThumbOffsetFromScroll(scrollPos, sizes, context.dir);
            thumbRef.current.style.transform = `translate3d(${offset}px, 0, 0)`;
          }
        },
        onWheelScroll: (scrollPos) => {
          if (context.viewport) context.viewport.scrollLeft = scrollPos;
        },
        onDragScroll: (pointerPos) => {
          if (context.viewport) {
            context.viewport.scrollLeft = getScrollPosition(pointerPos, context.dir);
          }
        }
      }
    );
  }
  if (orientation === "vertical") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      ScrollAreaScrollbarY,
      {
        ...commonProps,
        ref: forwardedRef,
        onThumbPositionChange: () => {
          if (context.viewport && thumbRef.current) {
            const scrollPos = context.viewport.scrollTop;
            const offset = getThumbOffsetFromScroll(scrollPos, sizes);
            thumbRef.current.style.transform = `translate3d(0, ${offset}px, 0)`;
          }
        },
        onWheelScroll: (scrollPos) => {
          if (context.viewport) context.viewport.scrollTop = scrollPos;
        },
        onDragScroll: (pointerPos) => {
          if (context.viewport) context.viewport.scrollTop = getScrollPosition(pointerPos);
        }
      }
    );
  }
  return null;
});
var ScrollAreaScrollbarX = reactExports.forwardRef((props, forwardedRef) => {
  const { sizes, onSizesChange, ...scrollbarProps } = props;
  const context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea);
  const [computedStyle, setComputedStyle] = reactExports.useState();
  const ref = reactExports.useRef(null);
  const composeRefs = useComposedRefs(forwardedRef, ref, context.onScrollbarXChange);
  reactExports.useEffect(() => {
    if (ref.current) setComputedStyle(getComputedStyle(ref.current));
  }, [ref]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ScrollAreaScrollbarImpl,
    {
      "data-orientation": "horizontal",
      ...scrollbarProps,
      ref: composeRefs,
      sizes,
      style: {
        bottom: 0,
        left: context.dir === "rtl" ? "var(--radix-scroll-area-corner-width)" : 0,
        right: context.dir === "ltr" ? "var(--radix-scroll-area-corner-width)" : 0,
        ["--radix-scroll-area-thumb-width"]: getThumbSize(sizes) + "px",
        ...props.style
      },
      onThumbPointerDown: (pointerPos) => props.onThumbPointerDown(pointerPos.x),
      onDragScroll: (pointerPos) => props.onDragScroll(pointerPos.x),
      onWheelScroll: (event, maxScrollPos) => {
        if (context.viewport) {
          const scrollPos = context.viewport.scrollLeft + event.deltaX;
          props.onWheelScroll(scrollPos);
          if (isScrollingWithinScrollbarBounds(scrollPos, maxScrollPos)) {
            event.preventDefault();
          }
        }
      },
      onResize: () => {
        if (ref.current && context.viewport && computedStyle) {
          onSizesChange({
            content: context.viewport.scrollWidth,
            viewport: context.viewport.offsetWidth,
            scrollbar: {
              size: ref.current.clientWidth,
              paddingStart: toInt(computedStyle.paddingLeft),
              paddingEnd: toInt(computedStyle.paddingRight)
            }
          });
        }
      }
    }
  );
});
var ScrollAreaScrollbarY = reactExports.forwardRef((props, forwardedRef) => {
  const { sizes, onSizesChange, ...scrollbarProps } = props;
  const context = useScrollAreaContext(SCROLLBAR_NAME, props.__scopeScrollArea);
  const [computedStyle, setComputedStyle] = reactExports.useState();
  const ref = reactExports.useRef(null);
  const composeRefs = useComposedRefs(forwardedRef, ref, context.onScrollbarYChange);
  reactExports.useEffect(() => {
    if (ref.current) setComputedStyle(getComputedStyle(ref.current));
  }, [ref]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ScrollAreaScrollbarImpl,
    {
      "data-orientation": "vertical",
      ...scrollbarProps,
      ref: composeRefs,
      sizes,
      style: {
        top: 0,
        right: context.dir === "ltr" ? 0 : void 0,
        left: context.dir === "rtl" ? 0 : void 0,
        bottom: "var(--radix-scroll-area-corner-height)",
        ["--radix-scroll-area-thumb-height"]: getThumbSize(sizes) + "px",
        ...props.style
      },
      onThumbPointerDown: (pointerPos) => props.onThumbPointerDown(pointerPos.y),
      onDragScroll: (pointerPos) => props.onDragScroll(pointerPos.y),
      onWheelScroll: (event, maxScrollPos) => {
        if (context.viewport) {
          const scrollPos = context.viewport.scrollTop + event.deltaY;
          props.onWheelScroll(scrollPos);
          if (isScrollingWithinScrollbarBounds(scrollPos, maxScrollPos)) {
            event.preventDefault();
          }
        }
      },
      onResize: () => {
        if (ref.current && context.viewport && computedStyle) {
          onSizesChange({
            content: context.viewport.scrollHeight,
            viewport: context.viewport.offsetHeight,
            scrollbar: {
              size: ref.current.clientHeight,
              paddingStart: toInt(computedStyle.paddingTop),
              paddingEnd: toInt(computedStyle.paddingBottom)
            }
          });
        }
      }
    }
  );
});
var [ScrollbarProvider, useScrollbarContext] = createScrollAreaContext(SCROLLBAR_NAME);
var ScrollAreaScrollbarImpl = reactExports.forwardRef((props, forwardedRef) => {
  const {
    __scopeScrollArea,
    sizes,
    hasThumb,
    onThumbChange,
    onThumbPointerUp,
    onThumbPointerDown,
    onThumbPositionChange,
    onDragScroll,
    onWheelScroll,
    onResize,
    ...scrollbarProps
  } = props;
  const context = useScrollAreaContext(SCROLLBAR_NAME, __scopeScrollArea);
  const [scrollbar, setScrollbar] = reactExports.useState(null);
  const composeRefs = useComposedRefs(forwardedRef, (node) => setScrollbar(node));
  const rectRef = reactExports.useRef(null);
  const prevWebkitUserSelectRef = reactExports.useRef("");
  const viewport = context.viewport;
  const maxScrollPos = sizes.content - sizes.viewport;
  const handleWheelScroll = useCallbackRef(onWheelScroll);
  const handleThumbPositionChange = useCallbackRef(onThumbPositionChange);
  const handleResize = useDebounceCallback(onResize, 10);
  function handleDragScroll(event) {
    if (rectRef.current) {
      const x = event.clientX - rectRef.current.left;
      const y = event.clientY - rectRef.current.top;
      onDragScroll({ x, y });
    }
  }
  reactExports.useEffect(() => {
    const handleWheel = (event) => {
      const element = event.target;
      const isScrollbarWheel = scrollbar?.contains(element);
      if (isScrollbarWheel) handleWheelScroll(event, maxScrollPos);
    };
    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel, { passive: false });
  }, [viewport, scrollbar, maxScrollPos, handleWheelScroll]);
  reactExports.useEffect(handleThumbPositionChange, [sizes, handleThumbPositionChange]);
  useResizeObserver(scrollbar, handleResize);
  useResizeObserver(context.content, handleResize);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ScrollbarProvider,
    {
      scope: __scopeScrollArea,
      scrollbar,
      hasThumb,
      onThumbChange: useCallbackRef(onThumbChange),
      onThumbPointerUp: useCallbackRef(onThumbPointerUp),
      onThumbPositionChange: handleThumbPositionChange,
      onThumbPointerDown: useCallbackRef(onThumbPointerDown),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Primitive.div,
        {
          ...scrollbarProps,
          ref: composeRefs,
          style: { position: "absolute", ...scrollbarProps.style },
          onPointerDown: composeEventHandlers(props.onPointerDown, (event) => {
            const mainPointer = 0;
            if (event.button === mainPointer) {
              const element = event.target;
              element.setPointerCapture(event.pointerId);
              rectRef.current = scrollbar.getBoundingClientRect();
              prevWebkitUserSelectRef.current = document.body.style.webkitUserSelect;
              document.body.style.webkitUserSelect = "none";
              if (context.viewport) context.viewport.style.scrollBehavior = "auto";
              handleDragScroll(event);
            }
          }),
          onPointerMove: composeEventHandlers(props.onPointerMove, handleDragScroll),
          onPointerUp: composeEventHandlers(props.onPointerUp, (event) => {
            const element = event.target;
            if (element.hasPointerCapture(event.pointerId)) {
              element.releasePointerCapture(event.pointerId);
            }
            document.body.style.webkitUserSelect = prevWebkitUserSelectRef.current;
            if (context.viewport) context.viewport.style.scrollBehavior = "";
            rectRef.current = null;
          })
        }
      )
    }
  );
});
var THUMB_NAME = "ScrollAreaThumb";
var ScrollAreaThumb = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { forceMount, ...thumbProps } = props;
    const scrollbarContext = useScrollbarContext(THUMB_NAME, props.__scopeScrollArea);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Presence, { present: forceMount || scrollbarContext.hasThumb, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollAreaThumbImpl, { ref: forwardedRef, ...thumbProps }) });
  }
);
var ScrollAreaThumbImpl = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeScrollArea, style, ...thumbProps } = props;
    const scrollAreaContext = useScrollAreaContext(THUMB_NAME, __scopeScrollArea);
    const scrollbarContext = useScrollbarContext(THUMB_NAME, __scopeScrollArea);
    const { onThumbPositionChange } = scrollbarContext;
    const composedRef = useComposedRefs(
      forwardedRef,
      (node) => scrollbarContext.onThumbChange(node)
    );
    const removeUnlinkedScrollListenerRef = reactExports.useRef(void 0);
    const debounceScrollEnd = useDebounceCallback(() => {
      if (removeUnlinkedScrollListenerRef.current) {
        removeUnlinkedScrollListenerRef.current();
        removeUnlinkedScrollListenerRef.current = void 0;
      }
    }, 100);
    reactExports.useEffect(() => {
      const viewport = scrollAreaContext.viewport;
      if (viewport) {
        const handleScroll = () => {
          debounceScrollEnd();
          if (!removeUnlinkedScrollListenerRef.current) {
            const listener = addUnlinkedScrollListener(viewport, onThumbPositionChange);
            removeUnlinkedScrollListenerRef.current = listener;
            onThumbPositionChange();
          }
        };
        onThumbPositionChange();
        viewport.addEventListener("scroll", handleScroll);
        return () => viewport.removeEventListener("scroll", handleScroll);
      }
    }, [scrollAreaContext.viewport, debounceScrollEnd, onThumbPositionChange]);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.div,
      {
        "data-state": scrollbarContext.hasThumb ? "visible" : "hidden",
        ...thumbProps,
        ref: composedRef,
        style: {
          width: "var(--radix-scroll-area-thumb-width)",
          height: "var(--radix-scroll-area-thumb-height)",
          ...style
        },
        onPointerDownCapture: composeEventHandlers(props.onPointerDownCapture, (event) => {
          const thumb = event.target;
          const thumbRect = thumb.getBoundingClientRect();
          const x = event.clientX - thumbRect.left;
          const y = event.clientY - thumbRect.top;
          scrollbarContext.onThumbPointerDown({ x, y });
        }),
        onPointerUp: composeEventHandlers(props.onPointerUp, scrollbarContext.onThumbPointerUp)
      }
    );
  }
);
ScrollAreaThumb.displayName = THUMB_NAME;
var CORNER_NAME = "ScrollAreaCorner";
var ScrollAreaCorner = reactExports.forwardRef(
  (props, forwardedRef) => {
    const context = useScrollAreaContext(CORNER_NAME, props.__scopeScrollArea);
    const hasBothScrollbarsVisible = Boolean(context.scrollbarX && context.scrollbarY);
    const hasCorner = context.type !== "scroll" && hasBothScrollbarsVisible;
    return hasCorner ? /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollAreaCornerImpl, { ...props, ref: forwardedRef }) : null;
  }
);
ScrollAreaCorner.displayName = CORNER_NAME;
var ScrollAreaCornerImpl = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeScrollArea, ...cornerProps } = props;
  const context = useScrollAreaContext(CORNER_NAME, __scopeScrollArea);
  const [width, setWidth] = reactExports.useState(0);
  const [height, setHeight] = reactExports.useState(0);
  const hasSize = Boolean(width && height);
  useResizeObserver(context.scrollbarX, () => {
    const height2 = context.scrollbarX?.offsetHeight || 0;
    context.onCornerHeightChange(height2);
    setHeight(height2);
  });
  useResizeObserver(context.scrollbarY, () => {
    const width2 = context.scrollbarY?.offsetWidth || 0;
    context.onCornerWidthChange(width2);
    setWidth(width2);
  });
  return hasSize ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    Primitive.div,
    {
      ...cornerProps,
      ref: forwardedRef,
      style: {
        width,
        height,
        position: "absolute",
        right: context.dir === "ltr" ? 0 : void 0,
        left: context.dir === "rtl" ? 0 : void 0,
        bottom: 0,
        ...props.style
      }
    }
  ) : null;
});
function toInt(value) {
  return value ? parseInt(value, 10) : 0;
}
function getThumbRatio(viewportSize, contentSize) {
  const ratio = viewportSize / contentSize;
  return isNaN(ratio) ? 0 : ratio;
}
function getThumbSize(sizes) {
  const ratio = getThumbRatio(sizes.viewport, sizes.content);
  const scrollbarPadding = sizes.scrollbar.paddingStart + sizes.scrollbar.paddingEnd;
  const thumbSize = (sizes.scrollbar.size - scrollbarPadding) * ratio;
  return Math.max(thumbSize, 18);
}
function getScrollPositionFromPointer(pointerPos, pointerOffset, sizes, dir = "ltr") {
  const thumbSizePx = getThumbSize(sizes);
  const thumbCenter = thumbSizePx / 2;
  const offset = pointerOffset || thumbCenter;
  const thumbOffsetFromEnd = thumbSizePx - offset;
  const minPointerPos = sizes.scrollbar.paddingStart + offset;
  const maxPointerPos = sizes.scrollbar.size - sizes.scrollbar.paddingEnd - thumbOffsetFromEnd;
  const maxScrollPos = sizes.content - sizes.viewport;
  const scrollRange = dir === "ltr" ? [0, maxScrollPos] : [maxScrollPos * -1, 0];
  const interpolate = linearScale([minPointerPos, maxPointerPos], scrollRange);
  return interpolate(pointerPos);
}
function getThumbOffsetFromScroll(scrollPos, sizes, dir = "ltr") {
  const thumbSizePx = getThumbSize(sizes);
  const scrollbarPadding = sizes.scrollbar.paddingStart + sizes.scrollbar.paddingEnd;
  const scrollbar = sizes.scrollbar.size - scrollbarPadding;
  const maxScrollPos = sizes.content - sizes.viewport;
  const maxThumbPos = scrollbar - thumbSizePx;
  const scrollClampRange = dir === "ltr" ? [0, maxScrollPos] : [maxScrollPos * -1, 0];
  const scrollWithoutMomentum = clamp(scrollPos, scrollClampRange);
  const interpolate = linearScale([0, maxScrollPos], [0, maxThumbPos]);
  return interpolate(scrollWithoutMomentum);
}
function linearScale(input, output) {
  return (value) => {
    if (input[0] === input[1] || output[0] === output[1]) return output[0];
    const ratio = (output[1] - output[0]) / (input[1] - input[0]);
    return output[0] + ratio * (value - input[0]);
  };
}
function isScrollingWithinScrollbarBounds(scrollPos, maxScrollPos) {
  return scrollPos > 0 && scrollPos < maxScrollPos;
}
var addUnlinkedScrollListener = (node, handler = () => {
}) => {
  let prevPosition = { left: node.scrollLeft, top: node.scrollTop };
  let rAF = 0;
  (function loop() {
    const position = { left: node.scrollLeft, top: node.scrollTop };
    const isHorizontalScroll = prevPosition.left !== position.left;
    const isVerticalScroll = prevPosition.top !== position.top;
    if (isHorizontalScroll || isVerticalScroll) handler();
    prevPosition = position;
    rAF = window.requestAnimationFrame(loop);
  })();
  return () => window.cancelAnimationFrame(rAF);
};
function useDebounceCallback(callback, delay) {
  const handleCallback = useCallbackRef(callback);
  const debounceTimerRef = reactExports.useRef(0);
  reactExports.useEffect(() => () => window.clearTimeout(debounceTimerRef.current), []);
  return reactExports.useCallback(() => {
    window.clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = window.setTimeout(handleCallback, delay);
  }, [handleCallback, delay]);
}
function useResizeObserver(element, onResize) {
  const handleResize = useCallbackRef(onResize);
  useLayoutEffect2(() => {
    let rAF = 0;
    if (element) {
      const resizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(rAF);
        rAF = window.requestAnimationFrame(handleResize);
      });
      resizeObserver.observe(element);
      return () => {
        window.cancelAnimationFrame(rAF);
        resizeObserver.unobserve(element);
      };
    }
  }, [element, handleResize]);
}
var Root = ScrollArea$1;
var Viewport = ScrollAreaViewport;
var Corner = ScrollAreaCorner;
const ScrollArea = reactExports.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
  Root,
  {
    ref,
    className: cn("relative overflow-hidden", className),
    ...props,
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Viewport, { className: "h-full w-full rounded-[inherit]", children }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollBar, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Corner, {})
    ]
  }
));
ScrollArea.displayName = Root.displayName;
const ScrollBar = reactExports.forwardRef(({ className, orientation = "vertical", ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  ScrollAreaScrollbar,
  {
    ref,
    orientation,
    className: cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    ),
    ...props,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollAreaThumb, { className: "relative flex-1 rounded-full bg-border" })
  }
));
ScrollBar.displayName = ScrollAreaScrollbar.displayName;
const KNOWN_FIELDS = {
  background: { type: "color", label: "Background" },
  backText: { type: "color", label: "Back Text" },
  color: { type: "color", label: "Text Color" },
  lines: { type: "color", label: "Lines" },
  commentBack: { type: "color", label: "Comment Background" },
  iconBack: { type: "color", label: "Icon Background" },
  iconBorder: { type: "color", label: "Icon Border" },
  internalLine: { type: "color", label: "Internal Line" },
  candyBorder: { type: "color", label: "Candy Border" },
  candyFill: { type: "color", label: "Candy Fill" },
  shadowColor: { type: "color", label: "Shadow Color" },
  scrollBar: { type: "color", label: "Scrollbar" },
  scrollBarHover: { type: "color", label: "Scrollbar Hover" },
  borderWidth: { type: "number", label: "Border Width", min: 0, max: 20, step: 1 },
  lineWidth: { type: "number", label: "Line Width", min: 0, max: 20, step: 1 },
  shadowBlur: { type: "number", label: "Shadow Blur", min: 0, max: 50, step: 1 },
  padding: { type: "number", label: "Padding", min: 0, max: 100, step: 1 },
  margin: { type: "number", label: "Margin", min: 0, max: 100, step: 1 },
  metre: { type: "number", label: "Metre", min: 0, max: 200, step: 1 },
  lineHeight: { type: "number", label: "Line Height", min: 0, max: 100, step: 1 },
  iconRadius: { type: "number", label: "Icon Radius", min: 0, max: 100, step: 1 },
  lineRadius: { type: "number", label: "Line Radius", min: 0, max: 100, step: 1 },
  maxWidth: { type: "number", label: "Max Width", min: 0, step: 10 },
  minWidth: { type: "number", label: "Min Width", min: 0, step: 10 },
  maxHeight: { type: "number", label: "Max Height", min: 0, step: 10 },
  font: { type: "string", label: "Font" },
  headerFont: { type: "string", label: "Header Font" },
  branchFont: { type: "string", label: "Branch Font" },
  textFormat: { type: "select", label: "Text Format", options: ["plain", "markdown", "html"] }
};
function inferFieldType(key, value) {
  const schema = KNOWN_FIELDS[key];
  if (schema) return schema.type;
  if (/color|back|fill|border$/i.test(key) && typeof value === "string") return "color";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}
function validateField(type, value) {
  if (value === "" || value === null || value === void 0) return null;
  if (type === "number") {
    const n = Number(value);
    if (isNaN(n)) return "Invalid number";
  }
  if (type === "color" && typeof value === "string" && value !== "") {
    if (!/^(#[0-9a-fA-F]{3,8}|rgba?\(.*\)|transparent|[a-zA-Z]+)$/.test(value.trim())) {
      return "Invalid color (e.g. #FF0000, rgba(…), transparent)";
    }
  }
  return null;
}
function coerceValue(type, input) {
  if (input === "") return "";
  switch (type) {
    case "number": {
      const n = Number(input);
      return isNaN(n) ? input : n;
    }
    case "boolean":
      return input === "true" || input === true;
    default:
      return input;
  }
}
function ColorInput({ value, onChange, error }) {
  const safeColor = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "color",
        value: safeColor,
        onChange: (e) => onChange(e.target.value),
        className: "h-8 w-8 rounded border border-input cursor-pointer shrink-0"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Input,
      {
        value,
        onChange: (e) => onChange(e.target.value),
        placeholder: "#000000",
        className: cn("h-8 text-xs font-mono", error && "border-destructive")
      }
    )
  ] });
}
function FieldRow({ fieldKey, value, onChange, isCustom }) {
  const type = inferFieldType(fieldKey, value);
  const schema = KNOWN_FIELDS[fieldKey];
  const label = schema?.label || fieldKey;
  const strValue = value === null || value === void 0 ? "" : String(value);
  const error = validateField(type, value);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[1fr_1.5fr] items-center gap-3 py-1.5 px-1", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs font-mono truncate", title: fieldKey, children: label }),
      isCustom && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "text-[10px] px-1 py-0 shrink-0", children: "custom" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      type === "boolean" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        Switch,
        {
          checked: !!value,
          onCheckedChange: (checked) => onChange(fieldKey, checked)
        }
      ) : type === "color" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        ColorInput,
        {
          value: strValue,
          onChange: (v) => onChange(fieldKey, v),
          error
        }
      ) : type === "select" && schema?.options ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: strValue, onValueChange: (v) => onChange(fieldKey, v), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-8 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: schema.options.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: opt, children: opt }, opt)) })
      ] }) : type === "number" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        Input,
        {
          type: "number",
          value: strValue,
          onChange: (e) => onChange(fieldKey, coerceValue("number", e.target.value)),
          min: schema?.min,
          max: schema?.max,
          step: schema?.step,
          className: cn("h-8 text-xs font-mono", error && "border-destructive")
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
        Input,
        {
          value: strValue,
          onChange: (e) => onChange(fieldKey, e.target.value),
          className: "h-8 text-xs"
        }
      ),
      error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-destructive mt-0.5", children: error })
    ] })
  ] });
}
function FormatInspector({ open, title, style, onConfirm, onCancel }) {
  const [values, setValues] = reactExports.useState(() => ({ ...style }));
  const [showJson, setShowJson] = reactExports.useState(false);
  const [copied, setCopied] = reactExports.useState(false);
  const styleKey = JSON.stringify(style);
  reactExports.useMemo(() => {
    setValues({ ...style });
  }, [styleKey]);
  const handleChange = reactExports.useCallback((key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);
  const sortedKeys = reactExports.useMemo(() => {
    const keys = Object.keys(values);
    const known = keys.filter((k) => k in KNOWN_FIELDS);
    const custom = keys.filter((k) => !(k in KNOWN_FIELDS));
    return [...known, ...custom];
  }, [values]);
  const hasErrors = reactExports.useMemo(() => {
    return sortedKeys.some((key) => {
      const type = inferFieldType(key, values[key]);
      return validateField(type, values[key]) !== null;
    });
  }, [sortedKeys, values]);
  const jsonOutput = reactExports.useMemo(() => {
    const clean = {};
    for (const [k, v] of Object.entries(values)) {
      if (v !== "" && v !== null && v !== void 0) {
        clean[k] = v;
      }
    }
    return JSON.stringify(clean, null, 2);
  }, [values]);
  const handleCopyJson = reactExports.useCallback(() => {
    navigator.clipboard.writeText(jsonOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [jsonOutput]);
  const handleSubmit = reactExports.useCallback(() => {
    if (hasErrors) return;
    const result = {};
    for (const [k, v] of Object.entries(values)) {
      if (v !== "" && v !== null && v !== void 0) {
        result[k] = v;
      }
    }
    onConfirm(result);
  }, [values, hasErrors, onConfirm]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: (isOpen) => {
    if (!isOpen) onCancel();
  }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-lg max-h-[80vh] flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: title }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollArea, { className: "flex-1 -mx-6 px-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "divide-y divide-border", children: [
      sortedKeys.map((key) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        FieldRow,
        {
          fieldKey: key,
          value: values[key],
          onChange: handleChange,
          isCustom: !(key in KNOWN_FIELDS)
        },
        key
      )),
      sortedKeys.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground py-4 text-center", children: "No style properties" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Collapsible, { open: showJson, onOpenChange: setShowJson, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CollapsibleTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", size: "sm", className: "w-full justify-between text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Code, { className: "h-3.5 w-3.5" }),
          "JSON"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: cn("h-3.5 w-3.5 transition-transform", showJson && "rotate-180") })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CollapsibleContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "text-[11px] font-mono bg-muted rounded-md p-3 max-h-40 overflow-auto whitespace-pre-wrap", children: jsonOutput }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "ghost",
            size: "icon",
            className: "absolute top-1 right-1 h-6 w-6",
            onClick: handleCopyJson,
            children: copied ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "h-3 w-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "h-3 w-3" })
          }
        )
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2 pt-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", onClick: onCancel, children: "Cancel" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", onClick: handleSubmit, disabled: hasErrors, children: "OK" })
    ] })
  ] }) });
}
function createEmptyDiagram(t) {
  return {
    name: t.drakonEditor.newDiagram,
    access: "write",
    items: {
      "1": { type: "end" },
      "2": { type: "branch", branchId: 0, one: "3" },
      "3": { type: "action", content: t.drakonEditor.startHere, one: "1" }
    }
  };
}
function DrakonEditor({
  diagram,
  diagramId,
  folderSlug,
  height = 500,
  isNew = false,
  onSaved,
  className
}) {
  const { theme } = useTheme();
  const { t, locale } = useLocale();
  const isDark = theme === "dark";
  const containerRef = reactExports.useRef(null);
  const widgetRef = reactExports.useRef(null);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [hasChanges, setHasChanges] = reactExports.useState(false);
  const [diagramName, setDiagramName] = reactExports.useState(diagram?.name || t.drakonEditor.newDiagram);
  const [zoomLevel, setZoomLevel] = reactExports.useState(5e3);
  const [contextMenu, setContextMenu] = reactExports.useState(null);
  const [panMode, setPanMode] = reactExports.useState(false);
  const uiStateRef = reactExports.useRef("default");
  reactExports.useRef(null);
  const [editDialog, setEditDialog] = reactExports.useState({ open: false, title: "", value: "", onConfirm: () => {
  } });
  const [formatDialog, setFormatDialog] = reactExports.useState({ open: false, title: "", style: {}, onConfirm: () => {
  } });
  const saveMutation = useSaveDrakonDiagram(folderSlug);
  const editSender = {
    pushEdit: (edit) => {
      setHasChanges(true);
      console.log("[DrakonEditor] Edit:", edit);
    },
    stop: () => {
    }
  };
  const drakonLabels = reactExports.useMemo(() => getDrakonLabels(t.drakon), [t.drakon]);
  const drakonTranslate = reactExports.useMemo(() => createDrakonTranslate(t.drakon), [t.drakon]);
  const buildConfig = reactExports.useCallback(
    () => ({
      startEditContent: (item, isReadonly) => {
        if (isReadonly) return;
        setEditDialog({
          open: true,
          title: t.drakon.editContent,
          value: item.content || "",
          onConfirm: (newContent) => {
            if (widgetRef.current) {
              widgetRef.current.setContent(item.id, newContent);
              setHasChanges(true);
            }
          }
        });
      },
      showContextMenu: (left, top, items) => {
        const containerEl = containerRef.current;
        uiStateRef.current = "contextMenuOpen";
        console.log("[DRK] showContextMenu, uiState → contextMenuOpen");
        if (containerEl) {
          const rect = containerEl.getBoundingClientRect();
          setContextMenu({ x: left - rect.left, y: top - rect.top, items });
        } else {
          setContextMenu({ x: left, y: top, items });
        }
      },
      startEditSecondary: (item, isReadonly) => {
        if (isReadonly) return;
        setEditDialog({
          open: true,
          title: t.drakon.editSecondaryText,
          value: item.secondary || "",
          onConfirm: (newSecondary) => {
            if (widgetRef.current) {
              widgetRef.current.setSecondary(item.id, newSecondary);
              setHasChanges(true);
            }
          }
        });
      },
      startEditLink: (item, isReadonly) => {
        if (isReadonly) return;
        setEditDialog({
          open: true,
          title: t.drakon.editLink || "Edit Link",
          value: item.link || "",
          onConfirm: (newLink) => {
            if (widgetRef.current) {
              widgetRef.current.setLink(item.id, newLink);
              setHasChanges(true);
            }
          }
        });
      },
      startEditStyle: (ids, oldStyle, _x, _y, _accepted) => {
        setFormatDialog({
          open: true,
          title: t.drakon.format || "Format",
          style: oldStyle || {},
          onConfirm: (newStyle) => {
            if (widgetRef.current) {
              widgetRef.current.setStyle(ids, newStyle);
              setHasChanges(true);
            }
          }
        });
      },
      startEditDiagramStyle: (oldStyle, _x, _y) => {
        setFormatDialog({
          open: true,
          title: t.drakon.format || "Format Diagram",
          style: oldStyle || {},
          onConfirm: (newStyle) => {
            if (widgetRef.current) {
              widgetRef.current.setDiagramStyle(newStyle);
              setHasChanges(true);
            }
          }
        });
      },
      canSelect: !panMode,
      canvasIcons: true,
      textFormat: "plain",
      font: "14px system-ui, -apple-system, sans-serif",
      headerFont: "bold 16px system-ui, -apple-system, sans-serif",
      theme: getGardenDrakonTheme(),
      translate: drakonTranslate,
      ...drakonLabels,
      onSelectionChanged: (items) => {
        console.log(
          "[DRK] onSelectionChanged, uiState:",
          uiStateRef.current,
          "items:",
          items?.length
        );
      },
      onZoomChanged: (newZoom) => {
        setZoomLevel(newZoom);
      }
    }),
    [isDark, panMode, drakonLabels, drakonTranslate, t.drakon]
  );
  reactExports.useEffect(() => {
    let mounted = true;
    async function init() {
      if (!containerRef.current) return;
      try {
        await loadDrakonWidget();
        if (!mounted) return;
        const widget = createWidget();
        widgetRef.current = widget;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        container.innerHTML = "";
        const config = buildConfig();
        const element = widget.render(rect.width, rect.height, config);
        container.appendChild(element);
        const diagramToLoad = diagram || createEmptyDiagram(t);
        const effectiveId = diagramId || "new-diagram";
        await widget.setDiagram(effectiveId, diagramToLoad, editSender);
        widget.setZoom(5e3);
        setIsLoading(false);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load editor");
        setIsLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
      editSender.stop();
      widgetRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [diagramId]);
  reactExports.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onPointerDownCapture = (e) => {
      if (e.button === 2) {
        console.log("[DRK] capture guard: right-click, passing through");
        return;
      }
      if (uiStateRef.current === "contextMenuOpen") {
        const target = e.target;
        if (target.closest("[data-drakon-context-menu]")) {
          console.log("[DRK] capture guard: click inside menu, allowing");
          return;
        }
        console.log("[DRK] capture guard: contextMenuOpen, left click on canvas, stopPropagation");
        e.stopPropagation();
        return;
      }
      if (uiStateRef.current === "pasteMode") {
        console.log("[DRK] capture guard: pasteMode, allowing click through to widget");
        return;
      }
    };
    el.addEventListener("pointerdown", onPointerDownCapture, true);
    return () => el.removeEventListener("pointerdown", onPointerDownCapture, true);
  }, []);
  reactExports.useEffect(() => {
    if (!widgetRef.current || !containerRef.current || isLoading) return;
    const widget = widgetRef.current;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    let currentDiagramJson = null;
    try {
      currentDiagramJson = widget.exportJson();
    } catch {
    }
    const currentZoom = widget.getZoom();
    container.innerHTML = "";
    const config = buildConfig();
    const element = widget.render(rect.width, rect.height, config);
    container.appendChild(element);
    if (currentDiagramJson) {
      const diagramData = JSON.parse(currentDiagramJson);
      widget.setDiagram(diagramId, diagramData, editSender).then(() => {
        widget.setZoom(currentZoom);
      });
    } else {
      widget.redraw();
    }
  }, [isDark, buildConfig, isLoading]);
  reactExports.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (contextMenu) {
          setContextMenu(null);
          uiStateRef.current = "default";
        } else if (uiStateRef.current === "pasteMode") {
          uiStateRef.current = "default";
          widgetRef.current?.redraw();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [contextMenu]);
  const handleSave = reactExports.useCallback(async () => {
    if (!widgetRef.current) return;
    const effectiveId = isNew && !diagramId ? slugify(diagramName) : diagramId;
    if (!effectiveId) return;
    const jsonString = widgetRef.current.exportJson();
    const diagramData = JSON.parse(jsonString);
    const storedDiagram = {
      version: "1.0",
      id: effectiveId,
      name: diagramName,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      diagram: diagramData
    };
    saveMutation.mutate(
      {
        diagramId: effectiveId,
        diagram: storedDiagram,
        name: diagramName,
        isNew
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            setHasChanges(false);
            onSaved?.(effectiveId);
          }
        }
      }
    );
  }, [diagramId, diagramName, isNew, onSaved, saveMutation]);
  const handleUndo = reactExports.useCallback(() => {
    widgetRef.current?.undo();
  }, []);
  const handleRedo = reactExports.useCallback(() => {
    widgetRef.current?.redo();
  }, []);
  const handleHome = reactExports.useCallback(() => {
    widgetRef.current?.goHome();
  }, []);
  const handleInsertIcon = reactExports.useCallback((type) => {
    widgetRef.current?.showInsertionSockets(type);
  }, []);
  const handleToggleSilhouette = reactExports.useCallback(() => {
    widgetRef.current?.toggleSilhouette();
    setHasChanges(true);
  }, []);
  const handleZoomIn = reactExports.useCallback(() => {
    if (!widgetRef.current) return;
    const current = widgetRef.current.getZoom();
    widgetRef.current.setZoom(Math.min(current + 2e3, 2e4));
  }, []);
  const handleZoomOut = reactExports.useCallback(() => {
    if (!widgetRef.current) return;
    const current = widgetRef.current.getZoom();
    widgetRef.current.setZoom(Math.max(current - 2e3, 1e3));
  }, []);
  const handleCopy = reactExports.useCallback(() => {
    widgetRef.current?.copySelection();
    requestAnimationFrame(() => {
      widgetRef.current?.showPaste();
      uiStateRef.current = "pasteMode";
    });
  }, []);
  const handleCut = reactExports.useCallback(() => {
    widgetRef.current?.cutSelection();
    setHasChanges(true);
    requestAnimationFrame(() => {
      widgetRef.current?.showPaste();
      uiStateRef.current = "pasteMode";
    });
  }, []);
  const handleDelete = reactExports.useCallback(() => {
    widgetRef.current?.deleteSelection();
    setHasChanges(true);
  }, []);
  const handlePaste = reactExports.useCallback(() => {
    widgetRef.current?.showPaste();
    setHasChanges(true);
  }, []);
  const handleExportJson = reactExports.useCallback(() => {
    if (!widgetRef.current) return;
    const json = widgetRef.current.exportJson();
    const blob = new Blob([json], { type: "application/json" });
    const link = document.createElement("a");
    link.download = `${diagramId}.drakon.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, [diagramId]);
  const handleExportPng = reactExports.useCallback(() => {
    if (!widgetRef.current) return;
    try {
      const canvas = widgetRef.current.exportCanvas(1e4);
      const link = document.createElement("a");
      link.download = `${diagramId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      console.error("Export PNG failed - may require canvasIcons mode");
    }
  }, [diagramId]);
  const handleExportPseudocode = reactExports.useCallback(async () => {
    if (!widgetRef.current) return;
    try {
      const jsonString = widgetRef.current.exportJson();
      const diagramData = JSON.parse(jsonString);
      const pseudocode = await diagramToPseudocode(diagramData, diagramName, locale);
      const markdown = pseudocodeToMarkdown(pseudocode, diagramName);
      const blob = new Blob([markdown], { type: "text/markdown" });
      const link = document.createElement("a");
      link.download = `${diagramId}.md`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Export pseudocode failed:", err);
    }
  }, [diagramId, diagramName]);
  const iconButtons = [
    { type: "action", img: iconAction, label: t.drakonEditor.action },
    { type: "question", img: iconQuestion, label: t.drakonEditor.question },
    { type: "select", img: iconSelect, label: t.drakonEditor.choice },
    { type: "case", img: iconCase, label: t.drakonEditor.caseName },
    { type: "foreach", img: iconForeach, label: t.drakonEditor.forLoop },
    { type: "branch", img: iconBranch, label: t.drakonEditor.branchName },
    { type: "insertion", img: iconInsertion, label: t.drakonEditor.insertion },
    { type: "comment", img: iconComment, label: t.drakonEditor.comment },
    { type: "shelf", img: iconShelf, label: t.drakonEditor.shelf },
    { type: "simpleinput", img: iconSinput, label: t.drakonEditor.simpleInput },
    { type: "simpleoutput", img: iconSoutput, label: t.drakonEditor.simpleOutput },
    { type: "input", img: iconInput, label: t.drakonEditor.input },
    { type: "output", img: iconOutput, label: t.drakonEditor.output },
    { type: "process", img: iconProcess, label: t.drakonEditor.process },
    { type: "timer", img: iconTimer, label: t.drakonEditor.timer },
    { type: "pause", img: iconPause, label: t.drakonEditor.pause },
    { type: "duration", img: iconDuration, label: t.drakonEditor.duration },
    { type: "group-duration", img: iconGroupDuration, label: t.drakonEditor.groupDuration },
    { type: "group-duration-r", img: iconGroupDurationR, label: t.drakonEditor.groupDurationRight },
    { type: "par", img: iconPar, label: t.drakonEditor.parallel },
    { type: "parblock", img: iconParblock, label: t.drakonEditor.parallelBlock },
    { type: "ctrl-start", img: iconCtrlStart, label: t.drakonEditor.controlStart },
    { type: "ctrl-end", img: iconCtrlEnd, label: t.drakonEditor.controlEnd },
    { type: "end", img: iconEnd, label: t.drakonEditor.endIcon },
    { type: "link", img: iconLink, label: t.drakonEditor.link }
  ];
  if (error) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: cn(
          "flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4",
          className
        ),
        style: { height },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "h-5 w-5 text-destructive" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-destructive", children: error })
        ]
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("space-y-3", className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "diagram-name", className: "sr-only", children: t.drakonEditor.diagramName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            id: "diagram-name",
            value: diagramName,
            onChange: (e) => {
              setDiagramName(e.target.value);
              setHasChanges(true);
            },
            className: "w-48 h-8 text-sm",
            placeholder: t.drakonEditor.diagramName
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "default",
            size: "sm",
            onClick: handleSave,
            disabled: !hasChanges || isLoading || saveMutation.isPending,
            children: [
              saveMutation.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin mr-1" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "h-4 w-4 mr-1" }),
              t.editor?.save
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", onClick: handleUndo, disabled: isLoading, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Undo, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", onClick: handleRedo, disabled: isLoading, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Redo, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", onClick: handleHome, disabled: isLoading, children: /* @__PURE__ */ jsxRuntimeExports.jsx(House, { className: "h-4 w-4" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-0.5 border rounded-md p-0.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: !panMode ? "secondary" : "ghost",
              size: "sm",
              onClick: () => setPanMode(false),
              disabled: isLoading,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(MousePointer, { className: "h-4 w-4" })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { children: t.drakonEditor.select })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: panMode ? "secondary" : "ghost",
              size: "sm",
              onClick: () => setPanMode(true),
              disabled: isLoading,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Hand, { className: "h-4 w-4" })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { children: t.drakonEditor.pan })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", onClick: handleZoomOut, disabled: isLoading, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ZoomOut, { className: "h-4 w-4" }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { children: t.drakonEditor.zoomOut })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground w-10 text-center", children: [
          Math.round(zoomLevel / 100),
          "%"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", onClick: handleZoomIn, disabled: isLoading, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ZoomIn, { className: "h-4 w-4" }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { children: t.drakonEditor.zoomIn })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-1 w-px h-5 bg-border" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", onClick: handleCopy, disabled: isLoading, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "h-4 w-4" }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { children: t.drakon.copy })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", onClick: handleCut, disabled: isLoading, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Scissors, { className: "h-4 w-4" }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { children: t.drakon.cut })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", onClick: handlePaste, disabled: isLoading, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardPaste, { className: "h-4 w-4" }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { children: t.drakon.paste })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", onClick: handleDelete, disabled: isLoading, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-4 w-4" }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { children: t.drakon.delete })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              variant: "outline",
              size: "sm",
              onClick: handleExportPseudocode,
              disabled: isLoading,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "h-4 w-4 mr-1" }),
                t.drakonEditor.pseudocode
              ]
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { children: t.drakonEditor.exportPseudocode })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: handleExportJson, disabled: isLoading, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-4 w-4 mr-1" }),
          "JSON"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: handleExportPng, disabled: isLoading, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-4 w-4 mr-1" }),
          "PNG"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "relative",
          onClick: (e) => {
            if (uiStateRef.current === "contextMenuOpen") return;
            if (uiStateRef.current === "pasteMode") {
              if (!e.target.closest("[data-drakon-context-menu]")) {
                console.log("[DRK] canvas click in pasteMode → exiting pasteMode");
                uiStateRef.current = "default";
                widgetRef.current?.redraw();
              }
              return;
            }
            if (!e.target.closest("[data-drakon-context-menu]")) {
              setContextMenu(null);
              uiStateRef.current = "default";
            }
          },
          children: [
            isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg z-10",
                style: { height },
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-6 w-6 animate-spin text-muted-foreground" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                ref: containerRef,
                className: "drakon-container rounded-lg border overflow-hidden",
                style: { height, minHeight: 300 }
              }
            ),
            contextMenu && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                "data-drakon-context-menu": true,
                className: "absolute z-50 min-w-[140px] rounded-md border bg-popover p-1 shadow-md",
                style: { left: contextMenu.x, top: contextMenu.y },
                children: contextMenu.items.map(
                  (item, i) => item.type === "separator" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "my-1 h-px bg-border" }, i) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      className: "w-full flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left",
                      onClick: (e) => {
                        e.stopPropagation();
                        const action = item.action;
                        const isCopyOrCut = item.text === t.drakon.copy || item.text === t.drakon.cut;
                        console.log(
                          "[DRK] context menu click:",
                          item.text,
                          "isCopyOrCut:",
                          isCopyOrCut
                        );
                        setContextMenu(null);
                        if (action) {
                          requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                              requestAnimationFrame(() => {
                                console.log("[DRK] executing action:", item.text);
                                action();
                                if (isCopyOrCut && widgetRef.current) {
                                  requestAnimationFrame(() => {
                                    console.log("[DRK] calling showPaste after", item.text);
                                    widgetRef.current?.showPaste();
                                    uiStateRef.current = "pasteMode";
                                    console.log("[DRK] uiState → pasteMode");
                                  });
                                } else {
                                  uiStateRef.current = "default";
                                }
                              });
                            });
                          });
                        } else {
                          uiStateRef.current = "default";
                        }
                      },
                      children: item.text
                    },
                    i
                  )
                )
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full overflow-x-auto border rounded-lg bg-background", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 p-1.5", children: [
          iconButtons.map(({ type, img, label }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "ghost",
                size: "icon",
                className: "h-10 w-10 shrink-0",
                onClick: () => handleInsertIcon(type),
                disabled: isLoading,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: img, alt: label, className: "h-7 w-7 dark:invert" })
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { side: "top", children: label })
          ] }, type)),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-1 w-px h-8 bg-border shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "ghost",
                size: "icon",
                className: "h-10 w-10 shrink-0",
                onClick: handleToggleSilhouette,
                disabled: isLoading,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: iconSilhouette, alt: "Silhouette", className: "h-7 w-7 dark:invert" })
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { side: "top", children: t.drakonEditor.toggleSilhouette })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Dialog,
          {
            open: editDialog.open,
            onOpenChange: (open) => {
              if (!open) setEditDialog((prev) => ({ ...prev, open: false }));
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-md", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: editDialog.title }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 py-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    autoFocus: true,
                    value: editDialog.value,
                    onChange: (e) => setEditDialog((prev) => ({ ...prev, value: e.target.value })),
                    onKeyDown: (e) => {
                      if (e.key === "Enter") {
                        editDialog.onConfirm(editDialog.value);
                        setEditDialog((prev) => ({ ...prev, open: false }));
                      }
                    },
                    placeholder: "..."
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      variant: "outline",
                      size: "sm",
                      onClick: () => setEditDialog((prev) => ({ ...prev, open: false })),
                      children: t.editor?.cancel
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      size: "sm",
                      onClick: () => {
                        editDialog.onConfirm(editDialog.value);
                        setEditDialog((prev) => ({ ...prev, open: false }));
                      },
                      children: "OK"
                    }
                  )
                ] })
              ] })
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormatInspector,
          {
            open: formatDialog.open,
            title: formatDialog.title,
            style: formatDialog.style,
            onConfirm: (newStyle) => {
              formatDialog.onConfirm(newStyle);
              setFormatDialog((prev) => ({ ...prev, open: false }));
            },
            onCancel: () => setFormatDialog((prev) => ({ ...prev, open: false }))
          }
        )
      ] })
    ] })
  ] });
}
export {
  DrakonEditor as D
};
