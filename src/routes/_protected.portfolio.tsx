import { createFileRoute } from "@tanstack/react-router";
import Portfolio from "@/_pages_legacy/Portfolio";

export const Route = createFileRoute("/_protected/portfolio")({
  component: Portfolio,
});
