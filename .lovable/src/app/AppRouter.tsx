import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { DiagramsPage } from "@/pages/DiagramsPage";
import { EditorPage } from "@/pages/EditorPage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFound } from "@/pages/NotFound";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("jwt");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function AppRouter() {
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("dark");
    }
  }, []);

  if (typeof document === "undefined") {
    return null;
  }

  return (
    <>
      <BrowserRouter basename="/web">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/diagrams"
            element={
              <ProtectedRoute>
                <DiagramsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor/:id"
            element={
              <ProtectedRoute>
                <EditorRouteAdapter />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/diagrams" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </>
  );
}

function EditorRouteAdapter() {
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const segments = path.split("/").filter(Boolean);
  const id = segments[segments.length - 1] ?? "";

  return <EditorPage diagramId={id} />;
}
