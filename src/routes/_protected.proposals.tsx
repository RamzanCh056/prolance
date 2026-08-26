import { createFileRoute } from "@tanstack/react-router";
import Proposals from "@/_pages_legacy/Proposals";

export const Route = createFileRoute("/_protected/proposals")({
  component: Proposals,
});
