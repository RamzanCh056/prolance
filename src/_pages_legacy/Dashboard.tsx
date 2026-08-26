import { Link } from "@tanstack/react-router";
import { FileText, Users, Receipt, LayoutTemplate, ArrowRight, TrendingUp, Sparkles, Zap, Lightbulb, ChevronRight } from "lucide-react";
import { useClients, useInvoices, useProposals } from "@/lib/store";
import { useProfile, useTotalProposals } from "@/hooks/use-profile";
import { useDailyTip } from "@/hooks/use-daily-tip";

function TipText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        const bold = part.match(/^\*\*([^*]+)\*\*$/);
        if (bold) {
          return (
            <span key={i} className="font-bold text-warning">
              {bold[1]}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function Dashboard() {
  const clients = useClients();
  const invoices = useInvoices();
  const proposals = useProposals();
  const { profile } = useProfile();
  const { total: totalProposals } = useTotalProposals();
  const { tip, title, titleColor } = useDailyTip();


  const activeClients = clients.filter((c) => c.status === "Active").length;
  const completedClients = clients.filter((c) => c.status === "Completed").length;
  const conversion = clients.length > 0 ? Math.round((completedClients / clients.length) * 100) : 0;
  const userName = (profile?.display_name || "there").split(" ")[0];

  const quickActions = [
    { to: "/proposals", label: "Generate Proposal", desc: "AI-powered", icon: FileText, gradient: true },
    { to: "/invoices/new", label: "Create Invoice", desc: "Bill clients", icon: Receipt },
    { to: "/clients", label: "Manage Clients", desc: "Mini CRM", icon: Users },
    { to: "/templates", label: "Templates", desc: "Reusable pitches", icon: LayoutTemplate },
  ];

  return (
    <div className="space-y-7">
      {tip ? (
        <Link
          to="/proposals"
          className="flex items-center gap-3 rounded-2xl glass-subtle px-3.5 py-3.5 hover:bg-white/5 transition-smooth"
        >
          <div className="h-10 w-10 shrink-0 rounded-full bg-warning/15 grid place-items-center shadow-[0_0_18px_hsl(var(--warning)/0.25)]">
            <Lightbulb className="h-5 w-5 text-warning" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ color: titleColor }}
            >
              {title}
            </div>
            <p className="text-sm leading-snug mt-0.5">
              <TipText text={tip} />
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      ) : null}

      {/* Greeting */}
      <section className="pt-3">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/90 mb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-glow shadow-[0_0_10px_hsl(var(--primary-glow))] animate-glow-pulse" />
          Welcome back
        </div>
        <h1 className="font-display font-bold text-[34px] leading-[1.05] tracking-tight">
          Hey {userName} <span className="inline-block animate-float">👋</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-2">Let's win some clients today.</p>
      </section>

      {/* Hero card */}
      <Link
        to="/proposals"
        className="group block relative overflow-hidden rounded-3xl p-6 bg-gradient-hero text-white shadow-elevated transition-spring hover:scale-[1.01] active:scale-[0.99] gradient-border"
      >
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary-glow/25 blur-3xl" />
        <div className="absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-accent/25 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] bg-white/15 backdrop-blur px-2.5 py-1 rounded-full border border-white/20">
            <Sparkles className="h-3 w-3" /> AI Powered
          </div>
          <h2 className="font-display font-bold text-[26px] mt-4 leading-[1.1] tracking-tight">
            Win your next client<br />in <span className="text-gradient-accent">seconds</span>.
          </h2>
          <p className="text-sm text-white/75 mt-2 max-w-[280px]">Tell us about the job — AI writes a pitch that converts.</p>
          <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold bg-white/15 backdrop-blur px-4 py-2 rounded-full border border-white/20 group-hover:bg-white/25 transition-smooth">
            Try it now <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Link>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-3">
        <StatCard label="Proposals" value={totalProposals} accent="primary" />
        <StatCard
          label="Left"
          value={
            profile?.proposal_limit != null
              ? Math.max(0, profile.proposal_limit - totalProposals)
              : "∞"
          }
          accent="cyan"
        />
        <StatCard label="Conversion" value={`${conversion}%`} accent="pink" highlight />
      </section>


      {/* Quick actions */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-lg tracking-tight">Quick actions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Jump straight into the flow</p>
          </div>
          <Zap className="h-4 w-4 text-primary-glow" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="group relative overflow-hidden rounded-2xl glass p-4 transition-spring hover:-translate-y-1 hover:shadow-glow"
            >
              <div className={`h-11 w-11 rounded-xl grid place-items-center mb-3 transition-spring group-hover:scale-110 ${q.gradient ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-white/10 text-foreground border border-white/15"}`}>
                <q.icon className="h-5 w-5" />
              </div>
              <div className="font-semibold text-sm leading-tight">{q.label}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{q.desc}</div>
              <ArrowRight className="absolute top-4 right-4 h-4 w-4 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-smooth" />
            </Link>
          ))}
        </div>
      </section>

      {/* Recent proposals */}
      {proposals.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-lg tracking-tight">Recent proposals</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Your latest pitches</p>
            </div>
            <Link to="/proposals" className="text-xs font-semibold text-primary-glow hover:underline">View all →</Link>
          </div>
          <div className="space-y-2.5">
            {proposals.slice(0, 3).map((p) => (
              <div key={p.id} className="group rounded-2xl glass-subtle p-4 hover:bg-white/5 transition-smooth cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-soft border border-white/10 grid place-items-center">
                    <FileText className="h-4 w-4 text-primary-glow" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{p.jobTitle}</div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{p.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  accent?: "primary" | "cyan" | "pink";
}) {
  const barGradient =
    accent === "cyan"
      ? "from-primary-glow to-primary"
      : accent === "pink"
        ? "from-accent to-primary"
        : "from-primary to-primary-glow";
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-3.5 glass-subtle transition-smooth hover:-translate-y-0.5 ${
        highlight ? "shadow-glow" : ""
      }`}
    >
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">
        {label}
      </div>
      <div
        className={`mt-1.5 font-display font-bold text-2xl leading-none ${
          highlight ? "text-gradient" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className={`mt-2.5 h-1 rounded-full bg-gradient-to-r ${barGradient} opacity-80`} />
    </div>
  );
}
