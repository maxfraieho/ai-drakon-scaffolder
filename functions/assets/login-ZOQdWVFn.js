import { r as reactExports, U as jsxRuntimeExports } from "./server-gJy2DtaG.js";
import { h as useNavigate, N as Navigate } from "./router-xG6ysrBj.js";
import { t as toast, L as Label, I as Input, B as Button, a as api } from "./api-DBg6TLju.js";
import { C as Card, a as CardHeader, b as CardTitle, c as CardDescription, d as CardContent } from "./card-DsJ0fxgC.js";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = reactExports.useState("");
  const [password, setPassword] = reactExports.useState("");
  const [isSubmitting, setIsSubmitting] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("jwt")) return;
    const host = window.location.hostname;
    const isPreviewHost = host.includes("lovableproject.com") || host.includes("lovable.app");
    if (isPreviewHost) {
      localStorage.setItem("jwt", "preview-bypass-token");
      toast.success("Preview auth bypass увімкнено тимчасово");
      navigate({ to: "/diagrams", replace: true });
    }
  }, [navigate]);
  const handleLogin = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await api.login(email, password);
      const token = response.token ?? response.jwt;
      if (!token) {
        throw new Error(response.message || response.error || "Не вдалося отримати токен");
      }
      localStorage.setItem("jwt", token);
      navigate({ to: "/diagrams", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Помилка входу");
    } finally {
      setIsSubmitting(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "w-full max-w-sm border-border bg-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { children: "Вхід" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { children: "Увійдіть для роботи зі схемами DRAKON." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { className: "space-y-4", onSubmit: handleLogin, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "email", children: "Email" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            id: "email",
            type: "email",
            value: email,
            onChange: (event) => setEmail(event.target.value),
            required: true
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "password", children: "Password" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            id: "password",
            type: "password",
            value: password,
            onChange: (event) => setPassword(event.target.value),
            required: true
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { className: "w-full", type: "submit", disabled: isSubmitting, children: isSubmitting ? "Вхід..." : "Увійти" })
    ] }) })
  ] }) });
}
function LoginRoute() {
  const [mounted, setMounted] = reactExports.useState(false);
  reactExports.useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return null;
  }
  if (localStorage.getItem("jwt")) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: "/diagrams", replace: true });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(LoginPage, {});
}
export {
  LoginRoute as component
};
