import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, Copy, Save, RefreshCw, FileText, Loader2, Trash2, Lock, Crown,
  Briefcase, Target, CheckCircle2, TrendingUp, Building2, Rocket, User2, Users,
  Heart, Zap, ShieldCheck, Lightbulb, ArrowRight, Eye,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { generateProposal } from "@/lib/proposals.functions";
import { useProposals, saveProposal, deleteProposal, uid, type Proposal } from "@/lib/store";
import { useProfile, useProposalUsage, useTotalProposals } from "@/hooks/use-profile";
import { usePortfolio } from "@/hooks/use-portfolio";
import EmptyState from "@/components/EmptyState";
import { cn } from "@/lib/utils";

const LENGTH_MODES = [
  { id: "Short", label: "Short", desc: "80–120 words" },
  { id: "Standard", label: "Standard", desc: "120–220 words" },
  { id: "Detailed", label: "Detailed", desc: "200–300 words" },
] as const;

type LengthMode = (typeof LENGTH_MODES)[number]["id"];

const CLIENT_TYPE_META: Record<string, { icon: typeof Building2; label: string; tone: string }> = {
  Agency: { icon: Users, label: "Agency / Team", tone: "scalable & collaborative" },
  Startup: { icon: Rocket, label: "Startup", tone: "fast & pragmatic" },
  "Small Client": { icon: User2, label: "Small Client", tone: "warm & simple" },
  Corporate: { icon: Building2, label: "Corporate", tone: "structured & reliable" },
  General: { icon: Briefcase, label: "General Client", tone: "confident & professional" },
};

interface MatchedItem { id: string; title: string; skills: string[] }
interface ScoreBreakdown {
  personalization: number;
  relevance: number;
  hook_strength: number;
  portfolio_usage: number;
  clarity: number;
}

const STAGES = [
  "Analyzing job…",
  "Detecting client type…",
  "Matching portfolio…",
  "Writing proposal…",
  "Scoring quality…",
];

export default function Proposals() {
  const [viewProposal, setViewProposal] = useState<Proposal | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [freelancerName, setFreelancerName] = useState(() =>
    typeof window !== "undefined" ? window.localStorage.getItem("prolance_freelancer_name") ?? "" : "",
  );
  const [lengthMode, setLengthMode] = useState<LengthMode>("Standard");
  const [usePortfolioMatch, setUsePortfolioMatch] = useState(true);
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);

  const [result, setResult] = useState<string>("");
  const [hook, setHook] = useState<string>("");
  const [clientType, setClientType] = useState<string>("");
  const [clientNeeds, setClientNeeds] = useState<string[]>([]);
  const [score, setScore] = useState<number>(0);
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [extractedDeliverables, setExtractedDeliverables] = useState<string[]>([]);
  const [matchedPortfolio, setMatchedPortfolio] = useState<MatchedItem[]>([]);
  const [wordCount, setWordCount] = useState<number>(0);
  const [clientPsychology, setClientPsychology] = useState<string[]>([]);
  const [strongestLines, setStrongestLines] = useState<string[]>([]);
  const [improvement, setImprovement] = useState<string>("");
  const [weakExample, setWeakExample] = useState<string>("");
  const [whyWorks, setWhyWorks] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<number>(0);
  const [detectedTools, setDetectedTools] = useState<string[]>([]);
  const [detectedDomains, setDetectedDomains] = useState<Array<{ name: string; label: string; focus: string[] }>>([]);
  const [showCompare, setShowCompare] = useState<boolean>(false);
  const [altHookBold, setAltHookBold] = useState<string>("");
  const [altHookInsight, setAltHookInsight] = useState<string>("");
  const [clientAnalysis, setClientAnalysis] = useState<{ core_problem: string; hidden_ux_issue: string; business_goal: string } | null>(null);

  const proposals = useProposals();
  const { profile } = useProfile();
  const isPremium = true;
  const { increment } = useProposalUsage();
  const { total: totalProposals } = useTotalProposals();
  const { items: portfolio } = usePortfolio();

  const planLimit = profile?.proposal_limit ?? null;
  const remaining = planLimit != null ? Math.max(0, planLimit - totalProposals) : Infinity;
  const blocked = planLimit != null && remaining === 0;

  // Cycle through stage messages while loading
  useEffect(() => {
    if (!loading) return;
    setStageIndex(0);
    const id = setInterval(() => {
      setStageIndex((i) => (i < STAGES.length - 1 ? i + 1 : i));
    }, 900);
    return () => clearInterval(id);
  }, [loading]);

  const generate = async () => {
    if (!jobTitle.trim() || !jobDescription.trim()) {
      toast.error("Add a job title and description first.");
      return;
    }
    if (blocked) {
      toast.error("You've already used your proposal limit", {
        description: "Please renew your subscription or contact your admin to continue generating proposals.",
        duration: 6000,
      });
      return;
    }
    setLoading(true);
    setResult("");
    setHook("");
    setClientType("");
    setClientNeeds([]);
    setScore(0);
    setBreakdown(null);
    setExtractedSkills([]);
    setExtractedDeliverables([]);
    setMatchedPortfolio([]);
    setWordCount(0);
    setClientPsychology([]);
    setStrongestLines([]);
    setImprovement("");
    setWeakExample("");
    setWhyWorks([]);
    setConfidence(0);
    setDetectedTools([]);
    setDetectedDomains([]);
    setShowCompare(false);
    setAltHookBold("");
    setAltHookInsight("");
    setClientAnalysis(null);
    try {
      const portfolioPayload = usePortfolioMatch
        ? portfolio.map((p) => ({ id: p.id, title: p.title, description: p.description, skills: p.skills }))
        : [];
      const data = await generateProposal({
        data: {
          jobTitle,
          jobDescription,
          clientName: clientName.trim(),
          freelancerName: freelancerName.trim(),
          lengthMode,
          includePortfolio: usePortfolioMatch,
          portfolio: portfolioPayload,
        },
      });
      if ((data as any)?.error) throw new Error((data as any).error);
      const d = data as any;
      setResult(d?.proposal ?? "");
      setHook(d?.hook ?? "");
      setClientType(d?.client_type ?? "General");
      setClientNeeds(d?.client_needs ?? []);
      setScore(Number(d?.score ?? 0));
      setBreakdown(d?.score_breakdown ?? null);
      setExtractedSkills(d?.extracted_skills ?? []);
      setExtractedDeliverables(d?.extracted_deliverables ?? []);
      setMatchedPortfolio(d?.matched_portfolio ?? []);
      setWordCount(Number(d?.word_count ?? 0));
      setClientPsychology(d?.client_psychology ?? []);
      setStrongestLines(d?.strongest_lines ?? []);
      setImprovement(d?.improvement_suggestion ?? "");
      setWeakExample(d?.weak_proposal_example ?? "");
      setWhyWorks(d?.why_this_works ?? []);
      setConfidence(Number(d?.confidence_level ?? 0));
      setDetectedTools(d?.detected_tools ?? []);
      setDetectedDomains(d?.detected_domains ?? []);
      setAltHookBold(d?.alt_hook_bold ?? "");
      setAltHookInsight(d?.alt_hook_insight ?? "");
      setClientAnalysis(d?.client_analysis ?? null);
      await increment();
      if (typeof window !== "undefined" && freelancerName.trim()) {
        window.localStorage.setItem("prolance_freelancer_name", freelancerName.trim());
      }
      toast.success("Proposal ready ✨");
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const copy = () => { navigator.clipboard.writeText(result); toast.success("Copied"); };
  const save = () => {
    saveProposal({ id: uid(), jobTitle, jobDescription, content: result, createdAt: Date.now() });
    toast.success("Saved");
  };

  const scoreLabel = score >= 75 ? "Strong" : score >= 50 ? "Good" : "Weak";
  const scoreClass = score >= 75 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
  const ctMeta = CLIENT_TYPE_META[clientType] ?? CLIENT_TYPE_META.General;
  const CTIcon = ctMeta.icon;

  const confidenceLabel = confidence >= 80 ? "Very high" : confidence >= 60 ? "High" : confidence >= 40 ? "Medium" : "Low";
  const confidenceMessage =
    confidence >= 75
      ? "You can confidently send this proposal."
      : confidence >= 50
      ? "Solid proposal — a small tweak could make it even stronger."
      : "Worth a polish before sending.";

  // Highlight strongest sentences inside the proposal text
  const proposalSegments = useMemo(() => {
    if (!result) return [] as { text: string; strong: boolean }[];
    if (!strongestLines.length) return [{ text: result, strong: false }];
    const segments: { text: string; strong: boolean }[] = [];
    let remaining = result;
    const sorted = [...strongestLines].sort((a, b) => b.length - a.length);
    while (remaining.length) {
      let bestIdx = -1;
      let bestLine = "";
      for (const line of sorted) {
        if (!line) continue;
        const idx = remaining.toLowerCase().indexOf(line.toLowerCase());
        if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
          bestIdx = idx;
          bestLine = remaining.substring(idx, idx + line.length);
        }
      }
      if (bestIdx === -1) {
        segments.push({ text: remaining, strong: false });
        break;
      }
      if (bestIdx > 0) segments.push({ text: remaining.slice(0, bestIdx), strong: false });
      segments.push({ text: bestLine, strong: true });
      remaining = remaining.slice(bestIdx + bestLine.length);
    }
    return segments;
  }, [result, strongestLines]);

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider bg-gradient-soft text-primary px-2.5 py-1 rounded-full">
          <Sparkles className="h-3 w-3" /> Client Win Mode
        </div>
        <h1 className="font-display font-bold text-2xl mt-2">Proposal Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">Top 1% proposals — tailored, scored, and built to get replies.</p>
      </header>




      {blocked && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3 animate-fade-in">
          <div className="h-9 w-9 rounded-xl bg-destructive/20 grid place-items-center shrink-0">
            <Lock className="h-4 w-4 text-destructive" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-destructive">You've already used your proposal limit</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              You've generated {totalProposals} of {planLimit} proposals on your current plan. Please renew your subscription or contact your admin to continue generating new proposals.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 shadow-soft">

        <div className="space-y-1.5">
          <label className="text-xs font-semibold">Job title</label>
          <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Landing page for a SaaS startup" className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold">Job description</label>
          <Textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the brief or describe what the client needs..." rows={4} className="rounded-xl resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Client name <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Sarah" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Your name <span className="text-muted-foreground font-normal">(sign-off)</span></label>
            <Input value={freelancerName} onChange={(e) => setFreelancerName(e.target.value)} placeholder="e.g. Alex Rivera" className="h-11 rounded-xl" />
          </div>
        </div>

        {/* Length mode */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold">Proposal length</label>
          <div className="grid grid-cols-3 gap-2">
            {LENGTH_MODES.map(({ id, label, desc }) => (
              <button
                key={id}
                type="button"
                onClick={() => setLengthMode(id)}
                className={cn(
                  "rounded-xl text-[11px] font-semibold border transition-smooth p-2.5 flex flex-col items-center gap-0.5",
                  lengthMode === id ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow" : "bg-card border-border hover:bg-muted"
                )}
              >
                <span>{label}</span>
                <span className={cn("text-[9px] font-medium", lengthMode === id ? "opacity-90" : "text-muted-foreground")}>{desc}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">Hard cap: 400 words. Default Standard.</p>
        </div>

        {/* Portfolio toggle */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-soft grid place-items-center shrink-0">
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold">Include portfolio in proposal</div>
              <div className="text-[10px] text-muted-foreground">
                {portfolio.length === 0 ? (
                  <Link to="/portfolio" className="text-primary hover:underline">Add portfolio items →</Link>
                ) : (
                  `Auto-match from ${portfolio.length} project${portfolio.length === 1 ? "" : "s"}`
                )}
              </div>
            </div>
          </div>
          <Switch
            checked={usePortfolioMatch && portfolio.length > 0}
            onCheckedChange={setUsePortfolioMatch}
            disabled={portfolio.length === 0}
          />
        </div>

        <Button
          onClick={generate}
          disabled={loading || blocked}
          className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-95 transition-smooth disabled:opacity-60"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {STAGES[stageIndex]}</>
          ) : blocked ? (
            <><Lock className="h-4 w-4 mr-2" /> Proposal limit reached</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" /> Generate Winning Proposal {planLimit != null ? `(${remaining} left)` : ""}</>
          )}
        </Button>
      </div>

      {/* Step-by-step loader */}
      {loading && (
        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-2.5 animate-fade-in">
          <ol className="space-y-2">
            {STAGES.map((s, i) => {
              const done = i < stageIndex;
              const active = i === stageIndex;
              return (
                <li key={s} className={cn("flex items-center gap-2.5 text-sm", !done && !active && "text-muted-foreground")}>
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-border shrink-0" />
                  )}
                  <span className={cn(active && "font-semibold text-foreground")}>{s}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4 animate-fade-in">
          {/* Premium indicator chips */}
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-gradient-soft text-primary border border-primary/20">
              <Sparkles className="h-3 w-3" /> Personalized for this job
            </span>
            {matchedPortfolio.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-gradient-soft text-primary border border-primary/20">
                <Briefcase className="h-3 w-3" /> Portfolio matched
              </span>
            )}
            {score >= 75 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-success/10 text-success border border-success/30">
                <TrendingUp className="h-3 w-3" /> High chance to get reply
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-muted text-foreground border border-border">
              Optimized for replies
            </span>
          </div>

          {/* Final output summary — at-a-glance decision panel */}
          <div className="rounded-2xl border border-primary/30 bg-gradient-soft p-4 grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Score</div>
              <div className={cn("text-lg font-bold mt-0.5", isPremium ? scoreClass : "text-foreground")}>
                {isPremium ? `${score}` : "—"}<span className="text-xs font-medium text-muted-foreground">/100</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Confidence</div>
              <div className="text-lg font-bold mt-0.5 text-foreground">{confidenceLabel}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Client type</div>
              <div className="text-sm font-semibold mt-0.5 truncate">{ctMeta.label}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Portfolio used</div>
              <div className="text-sm font-semibold mt-0.5 truncate">
                {matchedPortfolio[0]?.title ?? <span className="text-muted-foreground font-normal">None</span>}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
            {clientType && (
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-gradient-soft grid place-items-center shrink-0">
                  <CTIcon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Client type</div>
                  <div className="text-sm font-semibold">{ctMeta.label}</div>
                  <div className="text-[10px] text-muted-foreground">Tone: {ctMeta.tone}</div>
                </div>
              </div>
            )}
            {clientNeeds.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  <Target className="h-3 w-3" /> Client needs
                </div>
                <ul className="space-y-1">
                  {clientNeeds.map((n, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Client psychology — what they truly care about */}
          {clientPsychology.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                <Heart className="h-3 w-3 text-primary" /> What this client cares about
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {clientPsychology.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deep client analysis (Step 1) */}
          {clientAnalysis && (clientAnalysis.core_problem || clientAnalysis.hidden_ux_issue || clientAnalysis.business_goal) && (
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Lightbulb className="h-3.5 w-3.5 text-primary" /> Deep client analysis
              </div>
              <div className="space-y-2 text-sm">
                {clientAnalysis.core_problem && (
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary w-20 shrink-0 mt-0.5">Problem</span>
                    <span className="text-foreground/90">{clientAnalysis.core_problem}</span>
                  </div>
                )}
                {clientAnalysis.hidden_ux_issue && (
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary w-20 shrink-0 mt-0.5">Hidden UX</span>
                    <span className="text-foreground/90">{clientAnalysis.hidden_ux_issue}</span>
                  </div>
                )}
                {clientAnalysis.business_goal && (
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary w-20 shrink-0 mt-0.5">Goal</span>
                    <span className="text-foreground/90">{clientAnalysis.business_goal}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {matchedPortfolio.length > 0 && (
            <div className="rounded-2xl border border-primary/30 bg-gradient-soft p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary mb-2">
                <Briefcase className="h-3 w-3" /> Best match portfolio
              </div>
              <div className="space-y-1.5">
                {matchedPortfolio.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold truncate">{m.title}</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {m.skills.slice(0, 2).map((s) => (
                        <span key={s} className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-card text-primary border border-primary/20">{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Matched on shared skills & keywords from the brief.</p>
            </div>
          )}

          {/* Proposal */}
          <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your proposal</div>
              <span className="text-[10px] text-muted-foreground">{wordCount} words</span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {proposalSegments.map((seg, i) =>
                seg.strong ? (
                  <mark
                    key={i}
                    className="bg-primary/15 text-foreground rounded px-0.5 border-b-2 border-primary/40"
                  >
                    {seg.text}
                  </mark>
                ) : (
                  <span key={i}>{seg.text}</span>
                ),
              )}
            </p>
            {strongestLines.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Zap className="h-3 w-3 text-primary" />
                <span><span className="font-semibold text-primary">{strongestLines.length} reply-worthy line{strongestLines.length === 1 ? "" : "s"}</span> highlighted</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 pt-1">
              <Button variant="outline" onClick={copy} className="h-10 rounded-xl"><Copy className="h-4 w-4 mr-1.5" />Copy</Button>
              <Button variant="outline" onClick={save} className="h-10 rounded-xl"><Save className="h-4 w-4 mr-1.5" />Save</Button>
              <Button variant="outline" onClick={generate} className="h-10 rounded-xl"><RefreshCw className="h-4 w-4 mr-1.5" />Retry</Button>
            </div>
          </div>

          {/* Alternative hooks (Bonus) */}
          {(altHookBold || altHookInsight) && (
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <ArrowRight className="h-3.5 w-3.5 text-primary" /> Alternative hooks — swap in if you want a different angle
              </div>
              {altHookBold && (
                <div className="rounded-xl border border-border/60 bg-gradient-soft p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                      <Zap className="h-3 w-3" /> Bold
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { navigator.clipboard.writeText(altHookBold); toast.success("Bold hook copied"); }}
                      className="h-7 px-2 text-[10px]"
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90 italic">"{altHookBold}"</p>
                </div>
              )}
              {altHookInsight && (
                <div className="rounded-xl border border-border/60 bg-gradient-soft p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                      <Lightbulb className="h-3 w-3" /> Insight-driven
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { navigator.clipboard.writeText(altHookInsight); toast.success("Insight hook copied"); }}
                      className="h-7 px-2 text-[10px]"
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90 italic">"{altHookInsight}"</p>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
                Proposal strength
                {!isPremium && <Lock className="h-3 w-3" />}
              </div>
              <div className={cn("text-sm font-bold", isPremium ? scoreClass : "text-muted-foreground")}>
                {isPremium ? `${score}% · ${scoreLabel}` : "Premium"}
              </div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full transition-all duration-700 ease-out", isPremium ? "bg-gradient-primary" : "bg-muted-foreground/30")}
                style={{ width: `${isPremium ? score : 0}%` }}
              />
            </div>

            {isPremium && breakdown && (
              <div className="grid grid-cols-1 gap-1.5 pt-1">
                {([
                  ["Personalization", breakdown.personalization],
                  ["Relevance", breakdown.relevance],
                  ["Hook strength", breakdown.hook_strength],
                  ["Portfolio usage", breakdown.portfolio_usage],
                  ["Clarity", breakdown.clarity],
                ] as const).map(([label, v]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-[11px] w-24 shrink-0 text-muted-foreground">{label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${v}%` }} />
                    </div>
                    <span className="text-[11px] font-semibold w-8 text-right">{v}</span>
                  </div>
                ))}
              </div>
            )}

            {!isPremium && (
              <Link to="/settings" className="inline-block text-[11px] font-semibold text-primary hover:underline">
                Unlock score breakdown with Premium →
              </Link>
            )}
          </div>

          {/* Confidence indicator */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Confidence to send
              </div>
              <div className="text-sm font-bold text-primary">{confidence}% · {confidenceLabel}</div>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-primary transition-all duration-700 ease-out"
                style={{ width: `${confidence}%` }}
              />
            </div>
            <p className="text-xs text-foreground/80">{confidenceMessage}</p>
          </div>

          {/* Reply Boost mode — strongest lines + improvement */}
          {(strongestLines.length > 0 || improvement) && (
            <div className="rounded-2xl border border-primary/30 bg-gradient-soft p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                <Zap className="h-3.5 w-3.5" /> Reply Boost mode
              </div>
              <p className="text-xs text-foreground/85 -mt-1">This proposal is optimized to get replies.</p>

              {strongestLines.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Strongest lines
                  </div>
                  <ul className="space-y-1.5">
                    {strongestLines.map((l, i) => (
                      <li key={i} className="text-xs leading-relaxed flex gap-2">
                        <Sparkles className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                        <span className="italic">"{l}"</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {improvement && (
                <div className="rounded-xl border border-border/60 bg-card p-3 flex gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-warning/15 grid place-items-center shrink-0">
                    <Lightbulb className="h-3.5 w-3.5 text-warning" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">One small improvement</div>
                    <p className="text-xs text-foreground/90 mt-0.5">{improvement}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Before vs After comparison */}
          {weakExample && (
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Before vs After
                </div>
                <button
                  onClick={() => setShowCompare((v) => !v)}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  {showCompare ? "Hide" : "Show comparison"}
                </button>
              </div>

              {showCompare && (
                <div className="space-y-3 animate-fade-in">
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-destructive mb-1.5">
                      What most freelancers send
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground italic">{weakExample}</p>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary bg-gradient-soft px-2.5 py-1 rounded-full border border-primary/20">
                      <ArrowRight className="h-3 w-3" /> Why yours wins
                    </div>
                  </div>

                  <div className="rounded-xl border border-success/30 bg-success/5 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-success mb-1.5">
                      Your proposal (excerpt)
                    </div>
                    <p className="text-xs leading-relaxed">{(hook || result).slice(0, 240)}{(hook || result).length > 240 ? "…" : ""}</p>
                  </div>

                  {whyWorks.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Why this works better
                      </div>
                      <ul className="space-y-1">
                        {whyWorks.map((w, i) => (
                          <li key={i} className="text-xs flex gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Detected requirements */}
          {(extractedSkills.length > 0 || extractedDeliverables.length > 0 || detectedTools.length > 0 || detectedDomains.length > 0) && (
            <div className="rounded-2xl border border-border/60 bg-card p-4 grid grid-cols-1 gap-3">
              {detectedDomains.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Target className="h-3 w-3" /> Project domain detected
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {detectedDomains.map((d) => (
                      <span key={d.name} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent text-accent-foreground border border-border">
                        {d.label}
                      </span>
                    ))}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Focus: {detectedDomains.flatMap((d) => d.focus).slice(0, 4).join(" · ")}
                  </div>
                </div>
              )}
              {detectedTools.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Zap className="h-3 w-3" /> Tools mentioned in the job
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detectedTools.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">{s}</span>
                    ))}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1.5">Woven into the proposal so it feels tailored, not generic.</div>
                </div>
              )}
              {extractedSkills.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Skills detected</div>
                  <div className="flex flex-wrap gap-1.5">
                    {extractedSkills.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-secondary-foreground">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {extractedDeliverables.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Deliverables detected</div>
                  <div className="flex flex-wrap gap-1.5">
                    {extractedDeliverables.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-foreground">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <section className="pt-2">
        <h2 className="font-display font-semibold text-base mb-3">Saved proposals</h2>
        {proposals.length === 0 ? (
          <EmptyState icon={<FileText className="h-7 w-7" />} title="No saved proposals yet" description="Generate one above and tap Save to keep it for later." />
        ) : (
          <div className="space-y-2">
            {proposals.map((p: Proposal) => (
              <div key={p.id} className="rounded-2xl border border-border/60 bg-card p-4 group">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{p.jobTitle}</div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.content}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setViewProposal(p)}
                      className="h-8 w-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth"
                      aria-label="View"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { deleteProposal(p.id); toast.success("Deleted"); }}
                      className="h-8 w-8 grid place-items-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-smooth"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!viewProposal} onOpenChange={(o) => !o && setViewProposal(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-8">{viewProposal?.jobTitle}</DialogTitle>
          </DialogHeader>
          {viewProposal && (
            <div className="space-y-4">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {viewProposal.content}
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(viewProposal.content);
                    toast.success("Copied to clipboard");
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
