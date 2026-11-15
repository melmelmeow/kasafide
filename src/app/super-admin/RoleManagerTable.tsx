"use client";

import { useState, useTransition } from "react";
import { updateUserRoleAction } from "@/app/auth/actions";
import { type AppRole } from "@/lib/auth";

type UserItem = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
};

export function RoleManagerTable({ initialUsers }: { initialUsers: UserItem[] }) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const handleRoleChange = (userId: string, newRole: AppRole) => {
    setStatusMsg(null);
    startTransition(async () => {
      const res = await updateUserRoleAction(userId, newRole);
      if (res.error) {
        setStatusMsg({ text: res.error, isError: true });
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        setStatusMsg({ text: "Role updated successfully." });
      }
    });
  };

  return (
    <div>
      {statusMsg && (
        <div
          style={{
            padding: "8px 12px",
            marginBottom: "16px",
            borderRadius: "6px",
            backgroundColor: statusMsg.isError ? "#fee2e2" : "#dcfce7",
            color: statusMsg.isError ? "#dc2626" : "#16a34a",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          {statusMsg.text}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-soft text-xs uppercase text-text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Current Role</th>
              <th className="px-4 py-3">Change Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{u.full_name || "—"}</td>
                <td className="px-4 py-3 text-text-muted">{u.email || "—"}</td>
                <td className="px-4 py-3 capitalize font-semibold">{u.role}</td>
                <td className="px-4 py-3">
                  <select
                    disabled={isPending}
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as AppRole)}
                    className="rounded border border-border bg-surface px-2 py-1 text-sm font-medium"
                  >
                    <option value="buyer">buyer</option>
                    <option value="seller">seller</option>
                    <option value="admin">admin</option>
                    <option value="super_admin">super_admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
