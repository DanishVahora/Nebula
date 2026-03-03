import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { authAPI } from "@/lib/api";
import { GitHubRepos } from "@/components/dashboard/GitHubRepos";
import { Link2, Unlink, CheckCircle2 } from "lucide-react";

export function ConnectedAccounts() {
  const { user, hasGitHubConnected, refreshUser } = useAuth();
  const [disconnecting, setDisconnecting] = useState(false);

  const connectGitHub = () => {
    window.location.href = authAPI.githubLinkUrl;
  };

  const disconnectGitHub = async () => {
    setDisconnecting(true);
    try {
      await authAPI.disconnectGitHub();
      await refreshUser();
    } catch {
      // Handle error
    } finally {
      setDisconnecting(false);
    }
  };

  const githubAccount = user?.connectedAccounts?.find(
    (a) => a.provider === "github"
  );

  return (
    <div>
      <p className="text-sm text-zinc-400">
        Link external accounts to unlock features like repo import.
      </p>

      {/* GitHub connection card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-white"
                fill="currentColor"
              >
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">GitHub</h3>
                {hasGitHubConnected && (
                  <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Connected
                  </span>
                )}
              </div>
              {githubAccount ? (
                <p className="mt-0.5 text-xs text-zinc-500">
                  @{githubAccount.username} · Connected{" "}
                  {new Date(githubAccount.createdAt).toLocaleDateString()}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-zinc-600">
                  Connect to import repos and push code.
                </p>
              )}
            </div>
          </div>

          {hasGitHubConnected ? (
            <button
              onClick={disconnectGitHub}
              disabled={disconnecting}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-red-500/20 px-3 text-xs text-red-400 transition-colors hover:bg-red-500/5 disabled:opacity-40"
            >
              <Unlink className="h-3 w-3" />
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          ) : (
            <button
              onClick={connectGitHub}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-medium text-black transition-colors hover:bg-zinc-200"
            >
              <Link2 className="h-3 w-3" />
              Connect GitHub
            </button>
          )}
        </div>
      </motion.div>

      {/* Google (primary) */}
      {user?.provider === "google" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-3 rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="currentColor"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">Google</h3>
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                  Primary
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">{user.email}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* GitHub Repos panel — only shown when connected */}
      {hasGitHubConnected && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight">
            Import from GitHub
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Select a repository to import as a Nebula workspace.
          </p>
          <GitHubRepos />
        </div>
      )}
    </div>
  );
}
