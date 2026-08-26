import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  Home,
  FileText,
  Users,
  Receipt,
  Briefcase,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/" as const, label: "Home", icon: Home, exact: true },
  { to: "/proposals" as const, label: "Proposals", icon: FileText, exact: false },
  { to: "/portfolio" as const, label: "Portfolio", icon: Briefcase, exact: false },
  { to: "/clients" as const, label: "Clients", icon: Users, exact: false },
  { to: "/invoices" as const, label: "Invoices", icon: Receipt, exact: false },
];

export default function AppLayout() {
  const loc = useLocation();

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      {/* Animated gradient orbs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,hsl(260_100%_60%/0.55),transparent_65%)] blur-3xl animate-float" />
        <div className="absolute top-1/3 -right-24 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,hsl(187_100%_55%/0.40),transparent_65%)] blur-3xl animate-float" style={{ animationDelay: "1.2s" }} />
        <div className="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,hsl(330_100%_65%/0.30),transparent_65%)] blur-3xl animate-float" style={{ animationDelay: "2.4s" }} />
      </div>

      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/40 border-b border-white/5">
        <div className="mx-auto max-w-md px-5 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-primary shadow-glow flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">
                P
              </span>
            </div>
            <span className="font-display font-bold text-base tracking-tight">
              Prolance<span className="text-gradient">.</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/settings"
              aria-label="Settings"
              className="h-9 w-9 rounded-full grid place-items-center hover:bg-muted transition-smooth"
            >
              <SettingsIcon className="h-[18px] w-[18px]" />
            </Link>
          </div>
        </div>
      </header>

      <main
        key={loc.pathname}
        className="flex-1 mx-auto w-full max-w-md px-5 pt-4 pb-28 animate-fade-in"
      >
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
        <div className="mx-auto max-w-md px-4 pb-4 pointer-events-auto">
          <div className="rounded-2xl glass-strong shadow-elevated">
            <ul className="grid grid-cols-5">
              {navItems.map(({ to, label, icon: Icon, exact }) => {
                const isActive = exact
                  ? loc.pathname === to
                  : loc.pathname === to || loc.pathname.startsWith(to + "/");
                return (
                  <li key={to}>
                    <Link
                      to={to}
                      className={cn(
                        "relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-smooth",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {isActive && (
                        <span
                          aria-hidden
                          className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-full bg-gradient-secondary shadow-glow"
                        />
                      )}
                      <span
                        className={cn(
                          "h-8 w-12 rounded-xl grid place-items-center transition-spring",
                          isActive && "bg-gradient-soft scale-105",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px]",
                            isActive && "stroke-[2.5]",
                          )}
                        />
                      </span>
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </nav>
    </div>
  );
}
