import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "../../lib/api-client";
import { useAppContext } from "../../lib/context";
import { SkeletonStatCards, SkeletonCardGrid } from "../../components/skeleton";
import {
  Users as UsersIcon, UserCheck, UserX, GraduationCap,
  Search, ShieldCheck, Building2, Pencil, X, Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";

// ── Types ──────────────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  departmentName?: string;
  departmentId?: string;
  phone?: string;
  createdAt?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  clo: "CLO",
  dlo: "DLO",
  hod: "HOD",
  academic_supervisor: "University Supervisor",
  industry_supervisor: "Workplace Supervisor",
  student: "Student",
};

const ROLE_BADGE: Record<string, string> = {
  clo: "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300",
  dlo: "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300",
  hod: "bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  academic_supervisor: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300",
  industry_supervisor: "bg-cyan-100 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  student: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

function normalizeUser(u: any): UserRow {
  const departmentName =
    u.department?.name ??
    u.student_profile?.department?.name ??
    u.academic_supervisor?.department?.name ??
    u.department_head?.department?.name ??
    undefined;

  return {
    id: String(u.id),
    name: u.name ?? "Unknown",
    email: u.email ?? "",
    role: u.role ?? "student",
    status: u.status === "inactive" ? "inactive" : "active",
    departmentName,
    departmentId: u.department_id ? String(u.department_id) : undefined,
    phone: u.phone ?? undefined,
    createdAt: u.created_at ?? undefined,
  };
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CLOUsersPage() {
  const { user: currentUser } = useAppContext();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", role: "", departmentId: "" });
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const [usersRes, deptRes] = await Promise.all([
        apiClient.getUsers({ per_page: 200 }),
        apiClient.getDepartments(),
      ]);
      if (!active) return;
      if (usersRes.success) setUsers(usersRes.data.map(normalizeUser));
      if (deptRes.success) {
        setDepartments(deptRes.data.map((d: any, i: number) => ({ id: String(d.id ?? `dept-${i}`), name: d.name ?? `Department ${i + 1}` })));
      }
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (departmentFilter !== "all" && u.departmentId !== departmentFilter) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter, departmentFilter]);

  const totalCount = users.length;
  const activeCount = users.filter((u) => u.status === "active").length;
  const inactiveCount = users.filter((u) => u.status === "inactive").length;
  const studentCount = users.filter((u) => u.role === "student").length;
  const staffCount = totalCount - studentCount;

  const handleActivate = async (target: UserRow) => {
    setBusyId(target.id);
    const res = await apiClient.activateUser(target.id);
    if (res.success) {
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, status: "active" } : u)));
      toast.success(`${target.name} activated.`);
    } else {
      toast.error(res.message ?? "Failed to activate user.");
    }
    setBusyId(null);
  };

  const handleDeactivate = async (target: UserRow) => {
    setBusyId(target.id);
    const res = await apiClient.deactivateUser(target.id);
    if (res.success) {
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, status: "inactive" } : u)));
      toast.success(`${target.name} deactivated.`);
    } else {
      toast.error(res.message ?? "Failed to deactivate user.");
    }
    setBusyId(null);
  };

  const openEdit = (target: UserRow) => {
    setEditTarget(target);
    setEditForm({
      name: target.name,
      email: target.email,
      phone: target.phone ?? "",
      role: target.role,
      departmentId: target.departmentId ?? "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    const payload: Record<string, any> = {
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone || null,
      role: editForm.role,
    };
    if (editForm.departmentId) payload.department_id = editForm.departmentId;
    const res = await apiClient.updateUser(editTarget.id, payload);
    if (res.success) {
      const dept = departments.find((d) => d.id === editForm.departmentId);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editTarget.id
            ? { ...u, name: editForm.name, email: editForm.email, phone: editForm.phone, role: editForm.role, departmentId: editForm.departmentId || u.departmentId, departmentName: dept?.name ?? u.departmentName }
            : u
        )
      );
      toast.success(`${editForm.name} updated.`);
      setEditTarget(null);
    } else {
      toast.error(res.message ?? "Failed to update user.");
    }
    setSaving(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1>User Management</h1>
        <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
          {loading ? "Loading users…" : `${totalCount} user${totalCount !== 1 ? "s" : ""} across the system`}
        </p>
      </div>

      {/* Stats */}
      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Users", value: totalCount, icon: UsersIcon, color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10" },
            { label: "Active", value: activeCount, icon: UserCheck, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" },
            { label: "Inactive", value: inactiveCount, icon: UserX, color: "text-gray-500 bg-gray-100 dark:bg-gray-500/10" },
            { label: "Students / Staff", value: `${studentCount} / ${staffCount}`, icon: GraduationCap, color: "text-violet-600 bg-violet-50 dark:bg-violet-500/10" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${stat.color} flex items-center justify-center shrink-0`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{stat.label}</p>
                  <p style={{ fontSize: "1.35rem", fontWeight: 600, lineHeight: 1 }}>{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card"
            style={{ fontSize: "0.85rem" }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border bg-card"
          style={{ fontSize: "0.85rem" }}
        >
          <option value="all">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border bg-card"
          style={{ fontSize: "0.85rem" }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border bg-card"
          style={{ fontSize: "0.85rem" }}
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Users list */}
      {loading ? <SkeletonCardGrid cards={6} cols={1} /> : null}
      {!loading && (
        <div className="space-y-2">
          {filtered.map((u) => {
            const isSelf = currentUser?.id != null && String(currentUser.id) === u.id;
            return (
              <div
                key={u.id}
                className="bg-card rounded-2xl border border-border/50 p-4 flex items-center justify-between gap-4 flex-wrap hover:shadow-[0_2px_12px_rgba(11,94,215,0.08)] transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="truncate" style={{ fontWeight: 600, fontSize: "0.92rem" }}>{u.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[u.role] ?? "bg-gray-100 dark:bg-gray-500/15 text-gray-600"}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.status === "active" ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-gray-100 dark:bg-gray-500/15 text-gray-600 dark:text-gray-400"}`}
                      >
                        {u.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground truncate" style={{ fontSize: "0.78rem" }}>{u.email}</p>
                    {u.departmentName && (
                      <p className="text-muted-foreground flex items-center gap-1 mt-0.5" style={{ fontSize: "0.74rem" }}>
                        <Building2 className="w-3 h-3" /> {u.departmentName}
                      </p>
                    )}
                  </div>
                </div>

                {!isSelf && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(u)}
                      className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-accent flex items-center gap-1.5 transition-colors"
                      style={{ fontSize: "0.8rem" }}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    {u.status === "active" ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            disabled={busyId === u.id}
                            className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10 disabled:opacity-60 transition-colors"
                            style={{ fontSize: "0.8rem" }}
                          >
                            {busyId === u.id ? "Working…" : "Deactivate"}
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Deactivate {u.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This account will no longer be able to sign in. You can reactivate it at any time.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => handleDeactivate(u)}
                            >
                              Yes, Deactivate
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <button
                        disabled={busyId === u.id}
                        onClick={() => handleActivate(u)}
                        className="px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/10 disabled:opacity-60 transition-colors"
                        style={{ fontSize: "0.8rem" }}
                      >
                        {busyId === u.id ? "Working…" : "Activate"}
                      </button>
                    )}
                  </div>
                )}

              </div>
            );
          })}

          {filtered.length === 0 && (
            <div
              className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border/50"
              style={{ fontSize: "0.85rem" }}
            >
              No users match your filters.
            </div>
          )}
        </div>
      )}

      {/* Edit User Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditTarget(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Edit User</h3>
              <button onClick={() => setEditTarget(null)} className="p-1 rounded-md hover:bg-accent"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem" }}>Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem" }}>Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem" }}>Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem" }}>Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  style={{ fontSize: "0.85rem" }}
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem" }}>Department</label>
                <select
                  value={editForm.departmentId}
                  onChange={(e) => setEditForm((f) => ({ ...f, departmentId: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  style={{ fontSize: "0.85rem" }}
                >
                  <option value="">— No department —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-border">
              <button
                onClick={() => setEditTarget(null)}
                className="px-4 py-2 rounded-lg border border-border hover:bg-accent"
                style={{ fontSize: "0.85rem" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editForm.name.trim() || !editForm.email.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                style={{ fontSize: "0.85rem" }}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
