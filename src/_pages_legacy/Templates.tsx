import { useState } from "react";
import { Plus, LayoutTemplate, Copy, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTemplates, saveTemplate, deleteTemplate, uid, type Template } from "@/lib/store";
import { toast } from "sonner";

const CATEGORIES: Template["category"][] = ["Web Development", "Mobile App", "UI/UX Design", "Custom"];

export default function Templates() {
  const templates = useTemplates();
  const [filter, setFilter] = useState<"All" | Template["category"]>("All");
  const [open, setOpen] = useState(false);

  const filtered = filter === "All" ? templates : templates.filter((t) => t.category === filter);

  return (
    <div className="space-y-5">
      <header className="pt-2 flex items-end justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Reusable proposals to send in seconds.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="h-10 rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
      </header>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {(["All", ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-full border transition-smooth ${
              filter === c ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow" : "bg-card border-border hover:bg-muted"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {filtered.map((t) => (
          <div key={t.id} className="rounded-2xl border border-border/60 bg-gradient-card p-4 transition-smooth hover:shadow-soft">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold text-sm">{t.title}</div>
                  {t.builtIn && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider bg-gradient-soft text-primary px-1.5 py-0.5 rounded-full">
                      <Sparkles className="h-2.5 w-2.5" /> Built-in
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{t.category}</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-3">{t.content}</p>
            <div className="flex gap-1 mt-3">
              <button
                onClick={() => { navigator.clipboard.writeText(t.content); toast.success("Copied to clipboard"); }}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-secondary hover:bg-muted transition-smooth inline-flex items-center gap-1"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
              {!t.builtIn && (
                <button
                  onClick={() => { deleteTemplate(t.id); toast.success("Deleted"); }}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg text-destructive hover:bg-destructive/10 transition-smooth inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <NewTemplateDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function NewTemplateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Template["category"]>("Custom");
  const [content, setContent] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) { toast.error("Title and content are required"); return; }
    saveTemplate({ id: uid(), title: title.trim(), category, content: content.trim() });
    toast.success("Template saved");
    setTitle(""); setContent(""); setCategory("Custom");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">New template</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Input placeholder="Template title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-xl" />
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`h-10 rounded-xl text-xs font-semibold border transition-smooth ${
                  category === c ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow" : "bg-card border-border hover:bg-muted"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <Textarea placeholder="Proposal content..." value={content} onChange={(e) => setContent(e.target.value)} rows={6} className="rounded-xl resize-none" />
          <Button type="submit" className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">Save template</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
