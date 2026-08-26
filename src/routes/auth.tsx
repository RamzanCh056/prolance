import { createFileRoute } from "@tanstack/react-router";
import Auth from "@/_pages_legacy/Auth";

export const Route = createFileRoute("/auth")({
  component: Auth,
});
