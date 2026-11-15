import type { Metadata } from "next";
import { requireRole, SUPER_ADMIN_ROLES } from "@/lib/auth";
import { StatCard } from "@/components/ui/StatCard";
import { RoleManagerTable } from "./RoleManagerTable";

export const metadata: Metadata = { title: "Super Admin Dashboard" };

export default async function SuperAdminDashboardPage() {
  const { supabase, profile } = await requireRole(SUPER_ADMIN_ROLES, "/super-admin");

  const [usersCount, listingsCount, profilesRes] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("properties").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <div>
      <h1 className="dash-title">Super Admin Management</h1>
      <p className="dash-sub">
        Welcome, {profile.full_name || profile.first_name || "Super Admin"}. Manage application roles and system settings.
      </p>

      <div className="cards mb-8">
        <StatCard label="Total Users" value={usersCount.count ?? 0} />
        <StatCard label="Total Listings" value={listingsCount.count ?? 0} />
      </div>

      <h2 className="mb-4 text-xl font-bold">User Role Management</h2>
      <RoleManagerTable initialUsers={profilesRes.data ?? []} />
    </div>
  );
}
