import { createFileRoute } from "@tanstack/react-router";
import NewInvoice from "@/_pages_legacy/NewInvoice";

export const Route = createFileRoute("/_protected/invoices/new")({
  component: NewInvoice,
});
