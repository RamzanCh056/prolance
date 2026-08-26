import { useEffect, useState } from "react";
import { Plus, Users, Mail, Briefcase, Trash2, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useClients, saveClient, deleteClient, uid, type Client, type ClientStatus } from "@/lib/store";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUSES: ClientStatus[] = ["Lead", "Active", "Completed"];
type Filter = "All" | ClientStatus;

export default function Clients() {
  const clients = useClients();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (c: Client) => { setEditing(c); setOpen(true); };

  const filtered = clients.filter((c) => {
    if (filter !== "All" && c.status !== filter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.project.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <header className="pt-2 flex items-end justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">{clients.length} total</p>
        </div>
        <Button onClick={openNew} className="h-10 rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </header>

      {clients.length > 0 && (
        <>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, project..."
              className="h-11 rounded-xl pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
            {(["All", ...STATUSES] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition-smooth",
                  filter === f ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow" : "bg-card border-border hover:bg-muted"
                )}
              >{f}</button>
            ))}
          </div>
        </>
      )}

      {clients.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title="No clients yet"
          description="Add your first client to start tracking projects and status."
          action={<Button onClick={openNew} className="rounded-xl bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-1" /> Add client</Button>}
        />
      ) : filtered.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8">No matches found.</div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border/60 bg-card p-4 transition-smooth hover:shadow-soft">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center font-display font-bold text-base flex-shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm truncate">{c.name}</div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {c.email || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> {c.project || "—"}
                  </div>
                  <div className="flex gap-1 mt-3">
                    <button
                      onClick={() => openEdit(c)}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted transition-smooth inline-flex items-center gap-1"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => { deleteClient(c.id); toast.success("Client deleted"); }}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg text-destructive hover:bg-destructive/10 transition-smooth inline-flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ClientDialog key={editing?.id ?? "new"} open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function ClientDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (v: boolean) => void; editing: Client | null }) {
  const [name, setName] = useState(editing?.name ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [project, setProject] = useState(editing?.project ?? "");
  const [status, setStatus] = useState<ClientStatus>(editing?.status ?? "Lead");
  const [notes, setNotes] = useState(editing?.notes ?? "");

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setEmail(editing?.email ?? "");
      setProject(editing?.project ?? "");
      setStatus(editing?.status ?? "Lead");
      setNotes(editing?.notes ?? "");
    }
  }, [open, editing]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required"); return; }
    saveClient({
      id: editing?.id ?? uid(),
      name: name.trim(),
      email: email.trim(),
      project: project.trim(),
      status,
      notes: notes.trim(),
      createdAt: editing?.createdAt ?? Date.now(),
    });
    toast.success(editing ? "Client updated" : "Client added");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{editing ? "Edit client" : "New client"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl" />
          <Input placeholder="Project" value={project} onChange={(e) => setProject(e.target.value)} className="h-11 rounded-xl" />
          <div className="grid grid-cols-3 gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  "h-10 rounded-xl text-xs font-semibold border transition-smooth",
                  status === s ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow" : "bg-card border-border hover:bg-muted"
                )}
              >{s}</button>
            ))}
          </div>
          <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="rounded-xl resize-none" />
          <Button type="submit" className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
            {editing ? "Save changes" : "Add client"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
