import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveInvoice, uid } from "@/lib/store";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function NewInvoice() {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState("");
  const [service, setService] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !service || !amount) { toast.error("Fill in client, service and amount"); return; }
    const id = uid();
    saveInvoice({
      id,
      clientName: clientName.trim(),
      service: service.trim(),
      amount: Number(amount),
      date: new Date(date).toISOString(),
      number: "INV-" + String(Date.now()).slice(-5),
      notes: notes.trim(),
      createdAt: Date.now(),
    });
    toast.success("Invoice created");
    navigate({ to: '/invoices/$id', params: { id } });
  };

  return (
    <div className="space-y-5">
      <button onClick={() => window.history.back()} className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground transition-smooth">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <header className="pt-1">
        <h1 className="font-display font-bold text-2xl">New Invoice</h1>
        <p className="text-sm text-muted-foreground mt-1">Quick and clean — ready to send.</p>
      </header>
      <form onSubmit={submit} className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 shadow-soft">
        <Field label="Client name"><Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Acme Inc." className="h-11 rounded-xl" /></Field>
        <Field label="Service"><Input value={service} onChange={(e) => setService(e.target.value)} placeholder="Landing page design" className="h-11 rounded-xl" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (USD)"><Input type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1200" className="h-11 rounded-xl" /></Field>
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-xl" /></Field>
        </div>
        <Field label="Notes (optional)"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="rounded-xl resize-none" /></Field>
        <Button type="submit" className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground font-semibold shadow-glow">
          Create invoice
        </Button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold">{label}</label>
      {children}
    </div>
  );
}
