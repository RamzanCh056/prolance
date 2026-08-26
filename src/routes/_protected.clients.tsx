import { createFileRoute } from "@tanstack/react-router";
import Clients from "@/_pages_legacy/Clients";

export const Route = createFileRoute("/_protected/clients")({
  component: Clients,
});
