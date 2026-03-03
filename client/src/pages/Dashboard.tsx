import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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

type Section = "dashboard" | "workspaces" | "assignments" | "classroom" | "settings";

export default function Dashboard() {
  const { hasGitHubConnected } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const sidebarWidth = sidebarCollapsed ? 64 : 220;

  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar
        activeSection={activeSection}
        onNavigate={(s) => setActiveSection(s as Section)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content area */}
      <div className="flex-1 transition-all duration-200" style={{ marginLeft: sidebarWidth }}>
        <Topbar />

        <main className="px-6 py-6">
          <AnimatePresence mode="wait">
            {activeSection === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Welcome */}
                <WelcomeSection />

                {/* Cards Grid */}
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  <WorkspacesCard />
                  <AssignmentsCard />

                  {/* GitHub section — conditional */}
                  {!hasGitHubConnected && <GitHubConnectCard />}
                </div>

                {/* GitHub Overview — only when connected */}
                {hasGitHubConnected && <GitHubOverview />}
              </motion.div>
            )}

            {activeSection === "workspaces" && (
              <motion.div
                key="workspaces"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6">
                  <h1 className="text-lg font-bold tracking-tight text-white">Workspaces</h1>
                  <p className="mt-1 text-sm text-zinc-500">Manage and create your coding workspaces.</p>
                </div>
                <WorkspacesPanel />
              </motion.div>
            )}

            {activeSection === "assignments" && (
              <motion.div
                key="assignments"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6">
                  <h1 className="text-lg font-bold tracking-tight text-white">Assignments</h1>
                  <p className="mt-1 text-sm text-zinc-500">View and submit your class assignments.</p>
                </div>
                <AssignmentsPanel />
              </motion.div>
            )}

            {activeSection === "classroom" && (
              <motion.div
                key="classroom"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6 text-zinc-600">
                    <path d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                  </svg>
                </div>
                <h2 className="mt-4 text-base font-semibold text-white">Classroom</h2>
                <p className="mt-1.5 text-sm text-zinc-500">Coming soon. Join and manage your classes.</p>
              </motion.div>
            )}

            {activeSection === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6">
                  <h1 className="text-lg font-bold tracking-tight text-white">Settings</h1>
                  <p className="mt-1 text-sm text-zinc-500">Account settings and connected services.</p>
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
