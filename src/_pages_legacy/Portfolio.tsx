import { useEffect, useMemo, useState } from "react";
import { Briefcase, Save, Loader2, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePortfolio, type PortfolioItem } from "@/hooks/use-portfolio";
import EmptyState from "@/components/EmptyState";

const MAX_ITEMS = 50;
const MAX_LINE_LEN = 600;

interface ParsedItem {
  title: string;
  description: string;
  link: string | null;
  skills: string[];
}

// Parse one line into { title, description, link }.
// Supported formats per line:
//   Title
//   Title | Description
//   Title | Description | https://link
//   Title - Description
//   Title — Description
//   Title :: Description :: link
function parseLine(raw: string): ParsedItem | null {
  const line = raw.trim();
  if (!line) return null;
  if (line.length > MAX_LINE_LEN) return null;

  // Split on the first delimiter we find (priority: |, ::, — , - )
  const parts = line.split(/\s*\|\s*|\s*::\s*|\s+—\s+|\s+-\s+/);
  const [titleRaw, descRaw, linkRaw] = [parts[0], parts[1], parts[2]];

  const title = (titleRaw ?? "").trim().slice(0, 200);
  if (!title) return null;

  let description = (descRaw ?? "").trim().slice(0, 400);
  let link: string | null = null;

  // If link wasn't in part 3, try to extract a URL from the description
  const urlMatch = (linkRaw ?? descRaw ?? "").match(/https?:\/\/\S+/i);
  if (urlMatch) {
    link = urlMatch[0].replace(/[),.;]+$/, "").slice(0, 500);
    if (!linkRaw) {
      // remove the URL from the description so it doesn't appear twice
      description = description.replace(urlMatch[0], "").replace(/\s+/g, " ").trim();
    }
  }

  return { title, description, link, skills: [] };
}

function itemsToText(items: PortfolioItem[]): string {
  return items
    .map((i) => {
      const parts = [i.title];
      if (i.description) parts.push(i.description);
      if (i.link) parts.push(i.link);
      return parts.join(" | ");
    })
    .join("\n");
}

export default function Portfolio() {
  const { user } = useAuth();
  const { items, loading, refresh, remove } = usePortfolio();

  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate textarea from existing portfolio (only once after first load)
  useEffect(() => {
    if (!loading && !hydrated) {
      setText(itemsToText(items));
      setHydrated(true);
    }
  }, [loading, hydrated, items]);

  const parsed = useMemo(() => {
    const lines = text.split(/\r?\n/);
    const out: ParsedItem[] = [];
    for (const line of lines) {
      const p = parseLine(line);
      if (p) out.push(p);
      if (out.length >= MAX_ITEMS) break;
    }
    return out;
  }, [text]);

  const overLimit = parsed.length > MAX_ITEMS;

  const saveAll = async () => {
    if (!user) {
      toast.error("Please sign in first.");
      return;
    }
    if (parsed.length === 0) {
      toast.error("Add at least one portfolio item.");
      return;
    }
    setSaving(true);
    try {
      // Wipe existing items, then bulk-insert the new list
      const { error: delErr } = await supabase
        .from("portfolio_items")
        .delete()
        .eq("user_id", user.id);
      if (delErr) throw delErr;

      if (parsed.length > 0) {
        const rows = parsed.slice(0, MAX_ITEMS).map((p) => ({
          user_id: user.id,
          title: p.title,
          description: p.description,
          skills: p.skills,
          link: p.link,
        }));
        const { error: insErr } = await supabase.from("portfolio_items").insert(rows);
        if (insErr) throw insErr;
      }

      await refresh();
      toast.success(`Saved ${parsed.length} portfolio item${parsed.length === 1 ? "" : "s"}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Could not save portfolio");
    } finally {
      setSaving(false);
    }
  };

  const removeOne = async (item: PortfolioItem) => {
    await remove(item.id);
    // Reflect the removal in the textarea too
    setText((prev) => {
      const lines = prev.split(/\r?\n/);
      const idx = lines.findIndex((l) => l.trim().toLowerCase().startsWith(item.title.toLowerCase()));
      if (idx === -1) return prev;
      lines.splice(idx, 1);
      return lines.join("\n");
    });
    toast.success("Removed");
  };

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider bg-gradient-soft text-primary px-2.5 py-1 rounded-full">
          <Briefcase className="h-3 w-3" /> Portfolio
        </div>
        <h1 className="font-display font-bold text-2xl mt-2">Your portfolio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paste your projects below — one per line. Save once, use everywhere.
        </p>
      </header>

      <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 shadow-soft">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold">Projects (one per line)</label>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Format: <span className="font-mono text-foreground">Title | Short description | https://link</span>
            <br />
            Description and link are optional. Up to {MAX_ITEMS} items.
          </p>
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          spellCheck={false}
          placeholder={`Fitness app onboarding redesign | Reduced drop-off by 38% | https://dribbble.com/...
SaaS analytics dashboard | Cleaner data hierarchy for ops teams | https://...
E-commerce checkout flow | One-page checkout, mobile-first
Crypto wallet — minimal mobile UI for a Web3 startup
Brand identity for an indie podcast | https://...`}
          className="rounded-xl resize-y font-mono text-xs leading-relaxed min-h-[280px]"
        />

        <div className="flex items-center justify-between text-[11px]">
          <span className={overLimit ? "text-destructive font-semibold" : "text-muted-foreground"}>
            {parsed.length} item{parsed.length === 1 ? "" : "s"} detected
            {overLimit && ` · only first ${MAX_ITEMS} will be saved`}
          </span>
          <span className="text-muted-foreground">{text.length} chars</span>
        </div>

        <Button
          onClick={saveAll}
          disabled={saving || parsed.length === 0}
          className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-95 transition-smooth disabled:opacity-60"
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> Save portfolio ({Math.min(parsed.length, MAX_ITEMS)})</>
          )}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          Saving replaces your existing portfolio with the list above.
        </p>
      </div>

      {/* Live preview of what will be saved */}
      {parsed.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Preview
          </div>
          <ul className="divide-y divide-border/60">
            {parsed.slice(0, MAX_ITEMS).map((p, i) => (
              <li key={i} className="py-2 flex items-start gap-2">
                <span className="text-[10px] font-mono text-muted-foreground w-5 shrink-0 mt-0.5">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{p.title}</div>
                  {p.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2">{p.description}</div>
                  )}
                  {p.link && (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
                    >
                      <ExternalLink className="h-3 w-3" /> {p.link}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Currently saved */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Currently saved ({items.length})
          </div>
        </div>
        {loading ? (
          <div className="rounded-2xl border border-border/60 bg-card p-6 grid place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="h-7 w-7" />}
            title="No portfolio yet"
            description="Paste your projects above and hit Save."
          />
        ) : (
          <ul className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60">
            {items.map((it) => (
              <li key={it.id} className="p-3 flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{it.title}</div>
                  {it.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2">{it.description}</div>
                  )}
                  {it.link && (
                    <a
                      href={it.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
                    >
                      <ExternalLink className="h-3 w-3" /> {it.link}
                    </a>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOne(it)}
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${it.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
