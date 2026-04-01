import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
          <span className="text-xs text-zinc-600">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  // Redirect based on user role
  if (user?.role === "TEACHER") {
    return <Navigate to="/teacher-dashboard" replace />;
  }

  return <Navigate to="/student-dashboard" replace />;
}
