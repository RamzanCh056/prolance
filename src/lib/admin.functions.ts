import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AdminUserRow {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_premium: boolean;
  plan_days: number | null;
  plan_started_at: string | null;
  total_proposals: number;
  proposal_limit: number | null;
}


export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const users: AdminUserRow[] = [];
    let page = 1;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      for (const u of data.users) {
        users.push({
          id: u.id,
          email: u.email ?? null,
          display_name: null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          is_premium: false,
          plan_days: null,
          plan_started_at: null,
          total_proposals: 0,
          proposal_limit: null,
        });
      }
      if (data.users.length < 200) break;
      page += 1;
    }

    const ids = users.map((u) => u.id);
    if (ids.length) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, display_name, is_premium, plan_days, plan_started_at, proposal_limit")
        .in("user_id", ids);
      const map = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      for (const u of users) {
        const p: any = map.get(u.id);
        if (p) {
          u.display_name = p.display_name ?? null;
          u.is_premium = !!p.is_premium;
          u.plan_days = p.plan_days ?? null;
          u.plan_started_at = p.plan_started_at ?? null;
          u.proposal_limit = p.proposal_limit ?? null;
        }
      }

      const { data: usage } = await supabaseAdmin
        .from("proposal_usage")
        .select("user_id, count")
        .in("user_id", ids);
      const totals = new Map<string, number>();
      for (const row of usage ?? []) {
        totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + (row.count ?? 0));
      }
      for (const u of users) {
        u.total_proposals = totals.get(u.id) ?? 0;
      }
    }

    return { users, adminUserId: context.userId };
  });


export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Forbidden");
    if (data.userId === context.userId) {
      throw new Error("You cannot delete your own admin account.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(120),
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(72),
        joinDate: z.string(), // ISO date
        planDays: z.union([z.literal(15), z.literal(30)]),
        proposalLimit: z.number().int().min(1).max(10000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.name },
    });
    if (error) throw new Error(error.message);
    const newId = created.user?.id;
    if (!newId) throw new Error("Failed to create user");

    // Ensure profile has plan info (trigger creates profile row)
    const started = new Date(data.joinDate).toISOString();
    const proposalLimit = data.proposalLimit ?? data.planDays;
    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({
        display_name: data.name,
        is_premium: true,
        plan_days: data.planDays,
        plan_started_at: started,
        proposal_limit: proposalLimit,
      })
      .eq("user_id", newId);
    if (upErr) {
      // fallback insert
      await supabaseAdmin.from("profiles").insert({
        user_id: newId,
        display_name: data.name,
        is_premium: true,
        plan_days: data.planDays,
        plan_started_at: started,
        proposal_limit: proposalLimit,
      });
    }

    return { ok: true, id: newId };
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        name: z.string().trim().min(1).max(120).optional(),
        password: z.string().min(8).max(72).optional().or(z.literal("")),
        joinDate: z.string().optional(),
        planDays: z.union([z.literal(15), z.literal(30)]).optional(),
        proposalLimit: z.number().int().min(1).max(10000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.password && data.password.length >= 8) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        password: data.password,
      });
      if (error) throw new Error(error.message);
    }

    const patch: { display_name?: string; plan_days?: number; is_premium?: boolean; plan_started_at?: string; proposal_limit?: number } = {};
    if (data.name !== undefined) patch.display_name = data.name;
    if (data.planDays !== undefined) {
      patch.plan_days = data.planDays;
      patch.is_premium = true;
    }
    if (data.joinDate) patch.plan_started_at = new Date(data.joinDate).toISOString();
    if (data.proposalLimit !== undefined) patch.proposal_limit = data.proposalLimit;

    if (Object.keys(patch).length) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update(patch)
        .eq("user_id", data.userId);
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });

export const checkCurrentUserAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin) return { status: "ok" as const, isAdmin: true };

    const { data: profile, error } = await context.supabase
      .from("profiles")
      .select("is_premium, plan_days, plan_started_at")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!profile || !profile.is_premium || !profile.plan_days || !profile.plan_started_at) {
      return { status: "free" as const, isAdmin: false };
    }

    const endMs = new Date(profile.plan_started_at).getTime() + profile.plan_days * 86400000;
    if (Date.now() > endMs) return { status: "expired" as const, isAdmin: false };
    return { status: "ok" as const, isAdmin: false };
  });

export const checkUserAccess = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().email() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Find user by email
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);
    // Note: paginate to find user
    let found = list.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    let page = 2;
    while (!found && list.users.length === 200) {
      const { data: more } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (!more || more.users.length === 0) break;
      found = more.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
      if (more.users.length < 200) break;
      page += 1;
    }
    if (!found) return { status: "not_found" as const };

    // Check admin role
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", found.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (isAdmin) return { status: "ok" as const, isAdmin: true };

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_premium, plan_days, plan_started_at")
      .eq("user_id", found.id)
      .maybeSingle();

    if (!profile || !profile.is_premium || !profile.plan_days || !profile.plan_started_at) {
      return { status: "free" as const };
    }
    const endMs = new Date(profile.plan_started_at).getTime() + profile.plan_days * 86400000;
    if (Date.now() > endMs) return { status: "expired" as const };
    return { status: "ok" as const, isAdmin: false };
  });
