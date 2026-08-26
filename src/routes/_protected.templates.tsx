import { createFileRoute } from "@tanstack/react-router";
import Templates from "@/_pages_legacy/Templates";

export const Route = createFileRoute("/_protected/templates")({
  component: Templates,
});
