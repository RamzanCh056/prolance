import { createFileRoute } from "@tanstack/react-router";
import Invoices from "@/_pages_legacy/Invoices";

export const Route = createFileRoute("/_protected/invoices/")({
  component: Invoices,
});
