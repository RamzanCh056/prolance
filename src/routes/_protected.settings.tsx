import { createFileRoute } from "@tanstack/react-router";
import Settings from "@/_pages_legacy/Settings";

export const Route = createFileRoute("/_protected/settings")({
  component: Settings,
});
