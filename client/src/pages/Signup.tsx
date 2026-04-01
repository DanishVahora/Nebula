import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { WavyBackground } from "@/components/ui/wavy-background";
import { GraduationCap, BookOpen, AlertCircle } from "lucide-react";

export default function Signup() {
  const { isAuthenticated, loading, signup, user } = useAuth();
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");
  const existingRole = searchParams.get("existingRole");
  const [selectedRole, setSelectedRole] = useState<"STUDENT" | "TEACHER">("STUDENT");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    const target = user.role === "TEACHER" ? "/teacher-dashboard" : "/student-dashboard";
    return <Navigate to={target} replace />;
  }

  const handleSignup = (provider: "google" | "github") => {
    signup(provider, selectedRole);
  };

  // Map error codes to user-friendly messages
  const getErrorMessage = () => {
    switch (error) {
      case "google_auth_failed":
      case "github_auth_failed":
        return "Authentication failed. Please try again.";
      case "account_not_found":
        return "No account found with this email. Please complete your signup below.";
      case "role_conflict":
        return `This account is already registered as a ${existingRole}. You cannot sign up as a different role.`;
      case "email_exists":
        return `This email is already registered as a ${existingRole}. Please log in instead.`;
      default:
        return error ? "Something went wrong. Please try again." : null;
    }
  };

  const errorMessage = getErrorMessage();

  return (
    <WavyBackground
      colors={["#22c55e", "#ef4444", "#f59e0b", "#16a34a", "#dc2626"]}
      waveOpacity={0.3}
      blur={12}
      speed="slow"
      backgroundFill="#000000"
      containerClassName="min-h-screen"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md px-6"
      >
        {/* Logo & heading */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <img src="/logo.png" alt="Nebula logo" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            Get started with Nebula in seconds
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 backdrop-blur-sm"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-300">{errorMessage}</p>
                {(error === "role_conflict" || error === "email_exists") && (
                  <Link to="/login" className="mt-2 inline-block text-sm text-red-400 hover:text-red-300 underline">
                    Go to login →
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Auth card */}
        <div className="rounded-2xl border border-white/[0.08] bg-black/60 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl">
          {/* Role selection */}
          <div className="mb-5">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
              I am a
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedRole("STUDENT")}
                className={`group flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-200 ${
                  selectedRole === "STUDENT"
                    ? "border-green-500/40 bg-green-500/10 text-white"
                    : "border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:border-white/[0.15] hover:text-zinc-200"
                }`}
              >
                <GraduationCap className={`h-6 w-6 ${selectedRole === "STUDENT" ? "text-green-400" : "text-zinc-500"}`} />
                <span className="text-sm font-medium">Student</span>
              </button>
              <button
                onClick={() => setSelectedRole("TEACHER")}
                className={`group flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-200 ${
                  selectedRole === "TEACHER"
                    ? "border-yellow-500/40 bg-yellow-500/10 text-white"
                    : "border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:border-white/[0.15] hover:text-zinc-200"
                }`}
              >
                <BookOpen className={`h-6 w-6 ${selectedRole === "TEACHER" ? "text-yellow-400" : "text-zinc-500"}`} />
                <span className="text-sm font-medium">Teacher</span>
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-zinc-600">
              ⚠️ Choose carefully — you cannot change your role later
            </p>
          </div>

          <div className="space-y-3">
            {/* Google */}
            <button
              onClick={() => handleSignup("google")}
              className="group flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm font-medium text-zinc-200 transition-all duration-200 hover:border-white/[0.2] hover:bg-white/[0.08] hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[11px] uppercase tracking-wider text-zinc-600">
                or
              </span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>

            {/* GitHub */}
            <button
              onClick={() => handleSignup("github")}
              className="group flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm font-medium text-zinc-200 transition-all duration-200 hover:border-white/[0.2] hover:bg-white/[0.08] hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              Sign up with GitHub
            </button>
          </div>

          {/* Features bullet */}
          <div className="mt-6 space-y-2">
            {[
              "Cloud-based IDE — code from anywhere",
              "Real-time collaboration with your team",
              "GitHub integration built-in",
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-zinc-500">
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                  <svg
                    viewBox="0 0 12 12"
                    className="h-2.5 w-2.5 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                </div>
                {feature}
              </div>
            ))}
          </div>

          <p className="mt-5 text-center text-xs text-zinc-500">
            By creating an account, you agree to our{" "}
            <span className="text-zinc-400 hover:text-white cursor-pointer transition-colors">
              Terms
            </span>{" "}
            &{" "}
            <span className="text-zinc-400 hover:text-white cursor-pointer transition-colors">
              Privacy Policy
            </span>
          </p>
        </div>

        {/* Footer links */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-sm text-zinc-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-white transition-colors hover:text-zinc-300"
            >
              Sign in
            </Link>
          </p>
          <Link
            to="/"
            className="text-xs text-zinc-600 transition-colors hover:text-white"
          >
            ← Back to home
          </Link>
        </div>
      </motion.div>
    </WavyBackground>
  );
}
