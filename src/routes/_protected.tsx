import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import AppLayout from "@/components/AppLayout";

function ProtectedLayout() {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <AppLayout />;
}

export const Route = createFileRoute("/_protected")({
  component: ProtectedLayout,
});
