import { useParams, useNavigate, Link } from "@tanstack/react-router";
import { useInvoices } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { toast } from "sonner";

export default function InvoicePreview() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const invoices = useInvoices();
  const invoice = invoices.find((i) => i.id === id);

  if (!invoice) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Invoice not found.</p>
        <Button asChild variant="outline"><Link to="/invoices">Back to invoices</Link></Button>
      </div>
    );
  }

  const handleDownload = () => {
    window.print();
    toast.success("Use 'Save as PDF' in the print dialog");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <button onClick={() => window.history.back()} className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground transition-smooth">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-xl"><Printer className="h-4 w-4 mr-1.5" />Print</Button>
          <Button size="sm" onClick={handleDownload} className="rounded-xl bg-gradient-primary text-primary-foreground shadow-glow"><Download className="h-4 w-4 mr-1.5" />PDF</Button>
        </div>
      </div>

      <div className="rounded-3xl bg-card border border-border/60 shadow-elevated overflow-hidden print:shadow-none print:border-0">
        <div className="bg-gradient-primary text-primary-foreground p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-widest opacity-80 font-semibold">Invoice</div>
              <div className="font-display font-bold text-2xl mt-1">#{invoice.number}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-widest opacity-80 font-semibold">Date</div>
              <div className="font-semibold mt-1">{new Date(invoice.date).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Billed to</div>
            <div className="font-display font-semibold text-lg mt-1">{invoice.clientName}</div>
          </div>

          <div className="rounded-2xl border border-border bg-secondary/40 overflow-hidden">
            <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
              <div>Description</div><div>Amount</div>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-4 items-center">
              <div className="text-sm">{invoice.service}</div>
              <div className="font-semibold">${Number(invoice.amount).toLocaleString()}</div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-border">
            <div className="text-sm font-semibold">Total</div>
            <div className="font-display font-bold text-2xl text-gradient">
              ${Number(invoice.amount).toLocaleString()}
            </div>
          </div>

          {invoice.notes && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Notes</div>
              <p className="text-sm text-muted-foreground">{invoice.notes}</p>
            </div>
          )}

          <div className="text-center text-xs text-muted-foreground pt-2">Thank you for your business 💜</div>
        </div>
      </div>
    </div>
  );
}
