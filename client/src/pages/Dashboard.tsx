import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function Dashboard() {
  const { user, loading, updateRole } = useAuth();
  const [applyingRole, setApplyingRole] = useState(false);
  const [roleApplied, setRoleApplied] = useState(false);

  useEffect(() => {
    if (!user || applyingRole || roleApplied) return;

    const pendingRole = localStorage.getItem("nebula_signup_role") as "STUDENT" | "TEACHER" | null;
    if (pendingRole && (pendingRole === "STUDENT" || pendingRole === "TEACHER") && pendingRole !== user.role) {
      setApplyingRole(true);
      updateRole(pendingRole)
        .then(() => {
          localStorage.removeItem("nebula_signup_role");
          setRoleApplied(true);
        })
        .catch(() => {
          localStorage.removeItem("nebula_signup_role");
          setRoleApplied(true);
        })
        .finally(() => setApplyingRole(false));
    } else {
      localStorage.removeItem("nebula_signup_role");
      setRoleApplied(true);
    }
  }, [user, applyingRole, roleApplied, updateRole]);

  if (loading || applyingRole || !roleApplied) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
          <span className="text-xs text-zinc-600">Setting up your dashboard...</span>
        </div>
      </div>
    );
  }

  if (user?.role === "TEACHER") {
    return <Navigate to="/teacher-dashboard" replace />;
  }

  return <Navigate to="/student-dashboard" replace />;
}
