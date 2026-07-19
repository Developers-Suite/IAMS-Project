import { useState, useEffect, useCallback, useMemo } from "react";
import { SkeletonList } from "../../components/skeleton";
import { useAppContext } from "../../lib/context";
import {
  Users, CheckCircle2, X, Eye, BarChart3, AlertTriangle, Loader2, Plus, Search,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { apiClient } from "../../lib/api-client";
import { getNameInitials } from "../../lib/validation";
import { toast } from "sonner";

interface SupervisorRow {
  id: string;
  name: string;
  email: string;
  currentLoad: number;
  maxLoad: number;
}

function normalizeSupervisor(s: any): SupervisorRow {
  return {
    id: String(s.id),
    name: s.user?.name ?? s.name ?? "—",
    email: s.user?.email ?? s.email ?? "",
    currentLoad: s.current_students ?? 0,
    maxLoad: s.max_students ?? 0,
  };
}

export function SupervisorsPage() {
  const { user } = useAppContext();
  const department = user?.department || "";

  const [supervisors, setSupervisors] = useState<SupervisorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewStudents, setViewStudents] = useState<{ supervisor: SupervisorRow; students: any[] } | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [allSupervisors, setAllSupervisors] = useState<any[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [search, setSearch] = useState("");
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const fetchSupervisors = useCallback(async () => {
    setLoading(true);
    const res = await apiClient.getAvailableSupervisors({ department });
    if (res.success) setSupervisors(res.data.map(normalizeSupervisor));
    setLoading(false);
  }, [department]);

  useEffect(() => { fetchSupervisors(); }, [fetchSupervisors]);

  const openAddModal = async () => {
    setShowAddModal(true);
    setSearch("");
    setLoadingAll(true);
    const res = await apiClient.getAllAcademicSupervisors();
    if (res.success) setAllSupervisors(res.data ?? []);
    setLoadingAll(false);
  };

  const handleViewStudents = async (sup: SupervisorRow) => {
    setLoadingStudents(true);
    setViewStudents({ supervisor: sup, students: [] });
    const res = await apiClient.getSupervisorStudents(sup.id);
    if (res.success) {
      const internships = res.data?.internships ?? res.data?.data?.internships ?? [];
      setViewStudents({ supervisor: sup, students: internships });
    }
    setLoadingStudents(false);
  };

  const handleAssign = async (userId: string) => {
    setAssigningId(userId);
    const res = await apiClient.assignSupervisorToDepartment(userId);
    setAssigningId(null);
    if (res.success) {
      toast.success("Supervisor added to your department.");
      setShowAddModal(false);
      fetchSupervisors();
    } else {
      toast.error(res.message ?? "Failed to assign supervisor.");
    }
  };

  const currentIds = useMemo(() => new Set(supervisors.map((s) => s.id)), [supervisors]);

  const filteredAll = useMemo(() => {
    const q = search.toLowerCase();
    return allSupervisors.filter((u: any) => {
      const name = (u.name ?? "").toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      return !q || name.includes(q) || email.includes(q);
    });
  }, [allSupervisors, search]);

  const totalCapacity = supervisors.reduce((sum, s) => sum + s.maxLoad, 0);
  const totalLoad = supervisors.reduce((sum, s) => sum + s.currentLoad, 0);
  const utilizationRate = totalCapacity > 0 ? Math.round((totalLoad / totalCapacity) * 100) : 0;

  const workloadData = supervisors.map((s) => ({
    id: s.id,
    name: (s.name || "").split(" ").pop() || s.name || "Unknown",
    value: s.currentLoad,
    color: s.currentLoad >= s.maxLoad ? "#EF4444" : s.currentLoad >= s.maxLoad * 0.75 ? "#F59E0B" : "#10B981",
  })).filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1>Supervisor Directory</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            {department ? `${department} · ` : ""}Academic supervisor pool and workload distribution
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 flex items-center gap-2"
          style={{ fontSize: "0.85rem" }}
        >
          <Plus className="w-4 h-4" /> Add Supervisor
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Users className="w-4 h-4" /></div>
          <div>
            <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Available</p>
            <p style={{ fontSize: "1.25rem" }}>{supervisors.length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-4 h-4" /></div>
          <div>
            <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Active Load</p>
            <p style={{ fontSize: "1.25rem" }}>{totalLoad}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><AlertTriangle className="w-4 h-4" /></div>
          <div>
            <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Available Slots</p>
            <p style={{ fontSize: "1.25rem" }}>{Math.max(0, totalCapacity - totalLoad)}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center"><BarChart3 className="w-4 h-4" /></div>
          <div>
            <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Utilization</p>
            <p style={{ fontSize: "1.25rem" }}>{utilizationRate}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Supervisor List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <SkeletonList rows={4} />
          ) : supervisors.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>No available supervisors with open capacity.</p>
            </div>
          ) : (
            supervisors.map((sup) => (
              <div key={sup.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground" style={{ fontSize: "0.8rem" }}>
                      {getNameInitials(sup.name)}
                    </div>
                    <div>
                      <p style={{ fontSize: "0.9rem" }}>{sup.name}</p>
                      <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{sup.email}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full ${
                    sup.currentLoad >= sup.maxLoad ? "bg-red-100 text-red-700" :
                    sup.currentLoad >= sup.maxLoad * 0.75 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                  }`} style={{ fontSize: "0.75rem" }}>
                    {sup.currentLoad >= sup.maxLoad ? "Full" : sup.currentLoad >= sup.maxLoad * 0.75 ? "Near Capacity" : "Available"}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Current Load</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${
                        sup.currentLoad >= sup.maxLoad ? "bg-red-500" : sup.currentLoad >= sup.maxLoad * 0.75 ? "bg-amber-500" : "bg-emerald-500"
                      }`} style={{ width: `${sup.maxLoad > 0 ? (sup.currentLoad / sup.maxLoad) * 100 : 0}%` }} />
                    </div>
                    <span className="text-muted-foreground shrink-0" style={{ fontSize: "0.75rem" }}>{sup.currentLoad}/{sup.maxLoad}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <button onClick={() => handleViewStudents(sup)}
                    className="px-3 py-1.5 border border-border rounded-lg hover:bg-accent flex items-center gap-1 text-muted-foreground" style={{ fontSize: "0.8rem" }}>
                    <Eye className="w-3.5 h-3.5" /> View Assignments
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Workload Chart */}
        <div className="bg-card border border-border rounded-xl p-5 h-fit lg:sticky lg:top-6">
          <h3 className="mb-4">Workload Distribution</h3>
          {workloadData.length > 0 ? (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={workloadData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} dataKey="value" nameKey="name">
                      {workloadData.map((entry) => <Cell key={`wl-${entry.id}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {supervisors.map((s) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <span style={{ fontSize: "0.8rem" }}>{s.name}</span>
                    <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{s.currentLoad}/{s.maxLoad}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-center py-8" style={{ fontSize: "0.85rem" }}>No assigned students yet.</p>
          )}
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Total Utilization</span>
              <span style={{ fontSize: "0.85rem" }}>{totalLoad}/{totalCapacity} ({utilizationRate}%)</span>
            </div>
            <div className="mt-2 h-2.5 bg-secondary rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${utilizationRate >= 90 ? "bg-red-500" : utilizationRate >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${utilizationRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Add Supervisor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-lg flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <div>
                <h3>Add Supervisor to Department</h3>
                {department && (
                  <p className="text-muted-foreground mt-0.5" style={{ fontSize: "0.75rem" }}>{department}</p>
                )}
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-md hover:bg-accent"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 border-b border-border shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background"
                  style={{ fontSize: "0.85rem" }}
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {loadingAll ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
              ) : filteredAll.length === 0 ? (
                <p className="text-muted-foreground text-center py-10" style={{ fontSize: "0.85rem" }}>
                  {search ? "No supervisors match your search." : "No university supervisors found in the system."}
                </p>
              ) : (
                filteredAll.map((u: any) => {
                  const uid = String(u.id);
                  const alreadyIn = currentIds.has(uid);
                  const busy = assigningId === uid;
                  const supDept = u.academic_supervisor?.department?.name ?? u.department?.name ?? u.department ?? "";
                  return (
                    <div key={uid} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/40">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0" style={{ fontSize: "0.75rem" }}>
                        {getNameInitials(u.name ?? "")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: "0.85rem" }} className="truncate">{u.name ?? "—"}</p>
                        <p className="text-muted-foreground truncate" style={{ fontSize: "0.72rem" }}>{u.email ?? ""}</p>
                        {supDept && (
                          <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Currently: {supDept}</p>
                        )}
                      </div>
                      {alreadyIn ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 shrink-0" style={{ fontSize: "0.72rem" }}>
                          <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />In dept
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAssign(uid)}
                          disabled={busy}
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-1 shrink-0"
                          style={{ fontSize: "0.78rem" }}
                        >
                          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          Add
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Students Modal */}
      {viewStudents && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewStudents(null)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3>{viewStudents.supervisor.name} — Assigned Students</h3>
              <button onClick={() => setViewStudents(null)} className="p-1 rounded-md hover:bg-accent"><X className="w-5 h-5" /></button>
            </div>
            {loadingStudents ? (
              <div className="py-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : viewStudents.students.length === 0 ? (
              <p className="text-muted-foreground text-center py-6" style={{ fontSize: "0.85rem" }}>No students currently assigned.</p>
            ) : (
              <div className="space-y-2">
                {viewStudents.students.map((i: any) => (
                  <div key={i.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <div>
                      <p style={{ fontSize: "0.85rem" }}>{i.student?.user?.name ?? "—"}</p>
                      <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{i.student?.student_id ?? ""} · {i.company?.name ?? ""}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary capitalize" style={{ fontSize: "0.7rem" }}>{i.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
