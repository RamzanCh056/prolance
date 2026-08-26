import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Search, Trash2, Plus, CalendarIcon, Pencil, LogOut } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import {
  adminListUsers,
  adminDeleteUser,
  adminCreateUser,
  adminUpdateUser,
  type AdminUserRow,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function formatRemaining(endMs: number, now: number): { label: string; expired: boolean } {
  const diff = endMs - now;
  if (diff <= 0) return { label: "Expired", expired: true };
  const totalHours = Math.floor(diff / 3600000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return { label: `${days}d ${hours}h left`, expired: false };
  if (hours > 0) return { label: `${hours}h ${mins}m left`, expired: false };
  return { label: `${mins}m left`, expired: false };
}

function AdminPage() {
  const { user, isReady, signOut } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [adminId, setAdminId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "free">("all");
  const [toDelete, setToDelete] = useState<AdminUserRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Add user dialog
  const [addOpen, setAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [nName, setNName] = useState("");
  const [nEmail, setNEmail] = useState("");
  const [nPassword, setNPassword] = useState("");
  const [nJoin, setNJoin] = useState<Date | undefined>(new Date());
  const [nPlan, setNPlan] = useState<15 | 30>(15);
  const [nLimit, setNLimit] = useState<number>(15);

  // Edit user dialog
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [eName, setEName] = useState("");
  const [ePassword, setEPassword] = useState("");
  const [eJoin, setEJoin] = useState<Date | undefined>(undefined);
  const [ePlan, setEPlan] = useState<15 | 30>(15);
  const [eLimit, setELimit] = useState<number>(15);

  const openEdit = (u: AdminUserRow) => {
    setEditUser(u);
    setEName(u.display_name ?? "");
    setEPassword("");
    setEJoin(u.plan_started_at ? new Date(u.plan_started_at) : new Date(u.created_at));
    setEPlan(u.plan_days === 30 ? 30 : 15);
    setELimit(u.proposal_limit ?? (u.plan_days === 30 ? 30 : 15));
  };

  const doUpdate = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await adminUpdateUser({
        data: {
          userId: editUser.id,
          name: eName.trim() || undefined,
          password: ePassword || undefined,
          joinDate: eJoin ? eJoin.toISOString() : undefined,
          planDays: ePlan,
          proposalLimit: Number.isFinite(eLimit) && eLimit > 0 ? eLimit : undefined,
        },
      });
      toast({ title: "User updated", description: editUser.email ?? editUser.id });
      setEditUser(null);
      await load();
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message ?? "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    try {
      const res = await adminListUsers();
      setUsers(res.users);
      setAdminId(res.adminUserId);
      setForbidden(false);
    } catch (e: any) {
      if (String(e?.message || "").match(/Forbidden|Unauthorized/)) {
        setForbidden(true);
      } else {
        toast({ title: "Failed to load", description: e?.message ?? "Error", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    if (!user) { setLoading(false); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, user?.id]);

  const stats = useMemo(() => {
    const total = users.length;
    const paid = users.filter((u) => u.is_premium).length;
    const oneWeek = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newWeek = users.filter((u) => new Date(u.created_at).getTime() >= oneWeek).length;
    return { total, paid, free: total - paid, newWeek };
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "paid" && !u.is_premium) return false;
      if (filter === "free" && u.is_premium) return false;
      if (!q) return true;
      return (u.email ?? "").toLowerCase().includes(q) || (u.display_name ?? "").toLowerCase().includes(q);
    });
  }, [users, query, filter]);

  if (!isReady || loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || forbidden) return <Navigate to="/" replace />;

  const doDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await adminDeleteUser({ data: { userId: toDelete.id } });
      setUsers((prev) => prev.filter((u) => u.id !== toDelete.id));
      toast({ title: "User removed", description: toDelete.email ?? toDelete.id });
      setToDelete(null);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message ?? "Error", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const doCreate = async () => {
    if (!nName.trim() || !nEmail.trim() || nPassword.length < 8 || !nJoin) {
      toast({ title: "Missing fields", description: "Name, email, 8+ char password, and join date are required.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await adminCreateUser({
        data: {
          name: nName.trim(),
          email: nEmail.trim(),
          password: nPassword,
          joinDate: nJoin.toISOString(),
          planDays: nPlan,
          proposalLimit: Number.isFinite(nLimit) && nLimit > 0 ? nLimit : nPlan,
        },
      });
      toast({ title: "User created", description: nEmail });
      setAddOpen(false);
      setNName(""); setNEmail(""); setNPassword(""); setNJoin(new Date()); setNPlan(15); setNLimit(15);
      await load();
    } catch (e: any) {
      toast({ title: "Create failed", description: e?.message ?? "Error", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "—");

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Admin</h1>
            <p className="text-sm text-muted-foreground">Manage users and access.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add user
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await signOut();
                toast({ title: "Signed out" });
                nav({ to: "/auth", replace: true });
              }}
            >
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total users" value={stats.total} />
          <StatCard label="Paid" value={stats.paid} />
          <StatCard label="Free" value={stats.free} />
          <StatCard label="New this week" value={stats.newWeek} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(["all", "paid", "free"] as const).map((k) => (
              <Button key={k} variant={filter === k ? "default" : "outline"} size="sm" onClick={() => setFilter(k)}>
                {k[0].toUpperCase() + k.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Joined</th>
                <th className="p-3 font-medium">Plan</th>
                <th className="p-3 font-medium">Time left</th>
                <th className="p-3 font-medium">Proposals (left)</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium text-right">Actions</th>

              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const startMs = u.plan_started_at ? new Date(u.plan_started_at).getTime() : null;
                const endMs = startMs && u.plan_days ? startMs + u.plan_days * 86400000 : null;
                const rem = endMs ? formatRemaining(endMs, now) : null;
                return (
                  <tr key={u.id} className="border-t">
                    <td className="p-3">{u.display_name ?? "—"}</td>
                    <td className="p-3">{u.email ?? "—"}</td>
                    <td className="p-3">{fmt(u.plan_started_at ?? u.created_at)}</td>
                    <td className="p-3">{u.plan_days ? `${u.plan_days} days` : "—"}</td>
                    <td className="p-3">
                      {rem ? (
                        <span className={cn("text-xs font-semibold", rem.expired ? "text-destructive" : "text-primary")}>
                          {rem.label}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {(() => {
                        const reached = u.proposal_limit != null && u.total_proposals >= u.proposal_limit;
                        return (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-foreground">
                              {u.total_proposals}
                              {u.proposal_limit != null && (
                                <span className="text-muted-foreground font-normal">
                                  {" "}/ {u.proposal_limit}{" "}
                                  <span className={cn(reached ? "text-destructive" : "text-primary")}>
                                    ({Math.max(0, u.proposal_limit - u.total_proposals)} left)
                                  </span>
                                </span>
                              )}
                            </span>
                            {reached && (
                              <span className="inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold border border-destructive/40 bg-destructive/10 text-destructive">
                                Limit reached
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    <td className="p-3">
                      <span
                        className={
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border " +
                          (u.is_premium && !(rem?.expired)
                            ? "bg-success/15 text-success border-success/30"
                            : "bg-muted text-muted-foreground border-border")
                        }
                      >
                        {u.is_premium && !(rem?.expired) ? "Paid" : "Free"}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={u.id === adminId}
                          onClick={() => openEdit(u)}
                        >
                          <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={u.id === adminId}
                          onClick={() => setToDelete(u)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">No users match.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {toDelete?.email ?? "this account"} and all of their data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} disabled={deleting}>
              {deleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add new user</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={nName} onChange={(e) => setNName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={nEmail} onChange={(e) => setNEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="text" value={nPassword} onChange={(e) => setNPassword(e.target.value)} placeholder="At least 8 characters" />
            </div>
            <div className="space-y-1.5">
              <Label>Join date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !nJoin && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {nJoin ? format(nJoin, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={nJoin} onSelect={setNJoin} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <div className="flex gap-2">
                {([15, 30] as const).map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant={nPlan === d ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => { setNPlan(d); setNLimit(d); }}
                  >
                    {d} days
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Proposal limit</Label>
              <Input
                type="number"
                min={1}
                max={10000}
                value={nLimit}
                onChange={(e) => setNLimit(Number(e.target.value))}
                placeholder="e.g. 15 or 30"
              />
              <p className="text-[11px] text-muted-foreground">Total proposals this user can generate during their plan.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={doCreate} disabled={creating}>
              {creating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating...</> : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={editUser?.email ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={eName} onChange={(e) => setEName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label>New password (leave blank to keep)</Label>
              <Input
                type="text"
                value={ePassword}
                onChange={(e) => setEPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Join date (resets timer)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !eJoin && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {eJoin ? format(eJoin, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={eJoin} onSelect={setEJoin} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <div className="flex gap-2">
                {([15, 30] as const).map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant={ePlan === d ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => { setEPlan(d); setELimit(d); }}
                  >
                    {d} days
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Proposal limit</Label>
              <Input
                type="number"
                min={1}
                max={10000}
                value={eLimit}
                onChange={(e) => setELimit(Number(e.target.value))}
              />
              <p className="text-[11px] text-muted-foreground">
                Used: {editUser?.total_proposals ?? 0}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={saving}>Cancel</Button>
            <Button onClick={doUpdate} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
