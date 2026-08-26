import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "@/_pages_legacy/Dashboard";

export const Route = createFileRoute("/_protected/")({
  component: Dashboard,
});
