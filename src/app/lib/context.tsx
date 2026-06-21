import { createContext, useContext, useState, useSyncExternalStore, useEffect, useRef, type ReactNode } from "react";
import type { AuthUser, ExtendedRole } from "../services/auth-service";
import { subscribe, getState, type StoreState } from "./store";
import { setCurrentUser, apiClient } from "./api-client";

interface AppContextType {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  store: StoreState;
}

const AppContext = createContext<AppContextType>({
  user: null,
  setUser: () => {},
  sidebarOpen: true,
  setSidebarOpen: () => {},
  store: getState(),
});

const USER_KEY = "iams_user";

function normalizeRole(role: string): ExtendedRole {
  if (role === "academic_supervisor" || role === "academic-supervisor") return "academic";
  if (role === "industry_supervisor" || role === "industry-supervisor") return "supervisor";
  return role as ExtendedRole;
}

function normalizeApiUser(u: any): AuthUser {
  return {
    id: String(u.id),
    name: u.name,
    email: u.email,
    role: normalizeRole(u.role),
    department: typeof u.department === "string" ? u.department : (u.department?.name ?? undefined),
    department_id: u.department_id ?? u.departmentId ?? u.department?.id ?? undefined,
    studentId: u.student_id ?? u.studentId ?? undefined,
    avatar: u.avatar ?? u.profile_photo ?? "",
    profileComplete: u.profile_complete ?? u.profileComplete ?? false,
  };
}

function loadUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

function saveUser(user: AuthUser | null): void {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {}
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(loadUser);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const store = useSyncExternalStore(subscribe, getState, getState);

  // Track which user ID we have already backfilled so the effect doesn't
  // re-run after it writes studentId/department back into state.
  const backfilledRef = useRef<string | null>(null);

  // SECURITY: Sync loaded user to API client on mount AND refetch if incomplete
  useEffect(() => {
    if (!user?.id || !user?.role) {
      setCurrentUser(null);
      return;
    }

    setCurrentUser({
      id: user.id,
      role: user.role,
      department_id: user.department_id,
      student_id: user.id,
    });

    // Only backfill once per user session to avoid a state-update loop.
    if (backfilledRef.current === user.id) return;
    backfilledRef.current = user.id;

    const backfill = async () => {
      // If user is missing name or email, refetch from API
      if (!user.name || !user.email) {
        try {
          const res = await apiClient.me();
          if (res?.success && res?.data) {
            const rawUser = (res.data as any).user ?? res.data;
            const freshUser = normalizeApiUser(rawUser);
            setUserState(freshUser);
            saveUser(freshUser);
            setCurrentUser({
              id: freshUser.id,
              role: freshUser.role,
              department_id: freshUser.department_id,
              student_id: freshUser.id,
            });
          }
        } catch {
          // Silently fail — keep the user we have
        }
      }

      // Students' studentId/department live on the `students` table, not `users` —
      // the /me response above won't carry them, so backfill from the student profile.
      if (user.role === "student" && (!user.studentId || !user.department)) {
        try {
          const res = await apiClient.getStudentProfile(user.id);
          if (res.success && res.data) {
            const p: any = res.data;
            const studentId = user.studentId || p.student_id || undefined;
            const department =
              user.department || p.department_name ||
              (typeof p.department === "string" ? p.department : p.department?.name) || undefined;
            const department_id = user.department_id ?? p.department_id ?? undefined;
            if (studentId !== user.studentId || department !== user.department || department_id !== user.department_id) {
              const merged: AuthUser = { ...user, studentId, department, department_id };
              setUserState(merged);
              saveUser(merged);
              setCurrentUser({
                id: merged.id,
                role: merged.role,
                department_id: merged.department_id,
                student_id: merged.id,
              });
            }
          }
        } catch {
          // Silently fail — keep the user we have
        }
      }
    };

    backfill();
  }, [user?.id, user?.role, user?.department_id]);

  const setUser = (u: AuthUser | null) => {
    saveUser(u);
    setUserState(u);
    // SECURITY: Sync user to API client for supervisor context in requests
    if (u && u.id && u.role) {
      setCurrentUser({ 
        id: u.id, 
        role: u.role, 
        department_id: u.department_id,
        student_id: u.id
      });
    } else {
      setCurrentUser(null);
    }
  };

  return (
    <AppContext.Provider value={{ user, setUser, sidebarOpen, setSidebarOpen, store }}>
      {children}
    </AppContext.Provider>
  );
}

export { normalizeApiUser };

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
};

export function useRole(): ExtendedRole | null {
  const { user } = useAppContext();
  return user?.role ?? null;
}
