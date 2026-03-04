import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { WelcomeSection } from "@/components/dashboard/WelcomeSection";
import { WorkspacesCard } from "@/components/dashboard/WorkspacesCard";
import { AssignmentsCard } from "@/components/dashboard/AssignmentsCard";
import { GitHubConnectCard } from "@/components/dashboard/GitHubConnectCard";
import { GitHubOverview } from "@/components/dashboard/GitHubOverview";
import { WorkspacesPanel } from "@/components/dashboard/WorkspacesPanel";
import { AssignmentsPanel } from "@/components/dashboard/AssignmentsPanel";
import { ConnectedAccounts } from "@/components/dashboard/ConnectedAccounts";
import { motion, AnimatePresence } from "framer-motion";

type Section = "dashboard" | "workspaces" | "assignments" | "github" | "settings";

/** Animated gradient streaks — subtle green/yellow/red flowing light waves */
function GradientBackground() {
  const { isDark } = useTheme();
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Primary green streak */}
      <motion.div
        animate={{ x: ["-10%", "60%", "-10%"], y: ["-20%", "40%", "-20%"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute h-[500px] w-[500px] rounded-full"
        style={{
          background: isDark
            ? "radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)",
          filter: "blur(80px)",
          top: "-10%",
          left: "10%",
        }}
      />
      {/* Yellow streak */}
      <motion.div
        animate={{ x: ["30%", "-20%", "30%"], y: ["60%", "10%", "60%"] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute h-[450px] w-[450px] rounded-full"
        style={{
          background: isDark
            ? "radial-gradient(circle, rgba(234,179,8,0.06) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(234,179,8,0.05) 0%, transparent 70%)",
          filter: "blur(80px)",
          top: "30%",
          right: "5%",
        }}
      />
      {/* Red streak */}
      <motion.div
        animate={{ x: ["50%", "-10%", "50%"], y: ["20%", "-30%", "20%"] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute h-[400px] w-[400px] rounded-full"
        style={{
          background: isDark
            ? "radial-gradient(circle, rgba(239,68,68,0.05) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(239,68,68,0.04) 0%, transparent 70%)",
          filter: "blur(80px)",
          bottom: "10%",
          left: "30%",
        }}
      />
    </div>
  );
}

export default function Dashboard() {
  const { hasGitHubConnected } = useAuth();
  const { isDark } = useTheme();
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const sidebarWidth = sidebarCollapsed ? 72 : 240;

  return (
    <div className={`relative flex min-h-screen ${isDark ? "bg-black text-zinc-100" : "bg-[#fafafc] text-zinc-900"}`}>
      <GradientBackground />

      <Sidebar
        activeSection={activeSection}
        onNavigate={(s) => setActiveSection(s as Section)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="relative z-10 flex-1 transition-all duration-300 ease-out" style={{ marginLeft: sidebarWidth }}>
        <Topbar />

        <main className="mx-auto max-w-[1200px] px-8 py-6">
          <AnimatePresence mode="wait">
            {activeSection === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-6"
              >
                <WelcomeSection />

                <div className="grid gap-5 lg:grid-cols-2">
                  <WorkspacesCard />
                  <AssignmentsCard />
                </div>
              </motion.div>
            )}

            {activeSection === "workspaces" && (
              <motion.div
                key="workspaces"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="mb-6">
                  <h1 className="text-xl font-semibold tracking-tight">Workspaces</h1>
                  <p className={`mt-1 text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>Manage and create your coding workspaces.</p>
                </div>
                <WorkspacesPanel />
              </motion.div>
            )}

            {activeSection === "assignments" && (
              <motion.div
                key="assignments"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="mb-6">
                  <h1 className="text-xl font-semibold tracking-tight">Assignments</h1>
                  <p className={`mt-1 text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>View and submit your class assignments.</p>
                </div>
                <AssignmentsPanel />
              </motion.div>
            )}

            {activeSection === "github" && (
              <motion.div
                key="github"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="mb-6">
                  <h1 className="text-xl font-semibold tracking-tight">GitHub</h1>
                  <p className={`mt-1 text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
                    {hasGitHubConnected ? "Your GitHub activity and repositories." : "Connect your GitHub account to get started."}
                  </p>
                </div>
                {hasGitHubConnected ? <GitHubOverview /> : <GitHubConnectCard />}
              </motion.div>
            )}

            {activeSection === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="mb-6">
                  <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
                  <p className={`mt-1 text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>Account settings and connected services.</p>
                </div>
                <ConnectedAccounts />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
