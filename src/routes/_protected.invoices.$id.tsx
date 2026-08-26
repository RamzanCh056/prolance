import { createFileRoute } from "@tanstack/react-router";
import InvoicePreview from "@/_pages_legacy/InvoicePreview";

export const Route = createFileRoute("/_protected/invoices/$id")({
  component: InvoicePreview,
});
