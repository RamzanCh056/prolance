import { Link } from "@tanstack/react-router";
import { Plus, Receipt, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInvoices, deleteInvoice } from "@/lib/store";
import EmptyState from "@/components/EmptyState";
import { toast } from "sonner";

export default function Invoices() {
  const invoices = useInvoices();
  const total = invoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  return (
    <div className="space-y-5">
      <header className="pt-2 flex items-end justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">Total billed: <span className="font-semibold text-foreground">${total.toLocaleString()}</span></p>
        </div>
        <Button asChild className="h-10 rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Link to="/invoices/new"><Plus className="h-4 w-4 mr-1" /> New</Link>
        </Button>
      </header>

      {invoices.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-7 w-7" />}
          title="No invoices yet"
          description="Create your first invoice and look professional doing it."
          action={
            <Button asChild className="rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Link to="/invoices/new"><Plus className="h-4 w-4 mr-1" /> Create invoice</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {invoices.map((i) => (
            <div key={i.id} className="rounded-2xl border border-border/60 bg-card p-4 transition-smooth hover:shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">#{i.number}</div>
                  <div className="font-semibold text-sm truncate mt-0.5">{i.clientName}</div>
                  <div className="text-xs text-muted-foreground truncate">{i.service}</div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-lg">${Number(i.amount).toLocaleString()}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(i.date).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="flex gap-1 mt-3">
                <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs">
                  <Link to="/invoices/$id" params={{ id: i.id }}><Eye className="h-3 w-3 mr-1" /> Preview</Link>
                </Button>
                <button
                  onClick={() => { deleteInvoice(i.id); toast.success("Invoice deleted"); }}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg text-destructive hover:bg-destructive/10 transition-smooth inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
