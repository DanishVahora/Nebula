import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Sidebar, teacherNavItems } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { WelcomeSection } from "@/components/dashboard/WelcomeSection";
import { WorkspacesCard } from "@/components/dashboard/WorkspacesCard";
import { WorkspacesPanel } from "@/components/dashboard/WorkspacesPanel";
import { AssignmentsCard } from "@/components/dashboard/AssignmentsCard";
import { TeacherAssignmentsPanel } from "@/components/dashboard/TeacherAssignmentsPanel";
import { GitHubConnectCard } from "@/components/dashboard/GitHubConnectCard";
import { GitHubOverview } from "@/components/dashboard/GitHubOverview";
import { ConnectedAccounts } from "@/components/dashboard/ConnectedAccounts";
import { TeacherClassroomsPanel } from "@/components/dashboard/TeacherClassroomsPanel";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, BarChart3, Plus } from "lucide-react";

type Section =
  | "dashboard"
  | "classrooms"
  | "assignments"
  | "contests"
  | "students"
  | "analytics"
  | "workspaces"
  | "github"
  | "settings";

function GradientBackground() {
  const { isDark } = useTheme();
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <motion.div
        animate={{ x: ["-10%", "60%", "-10%"], y: ["-20%", "40%", "-20%"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute h-[500px] w-[500px] rounded-full"
        style={{
          background: isDark
            ? "radial-gradient(circle, rgba(234,179,8,0.08) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(234,179,8,0.06) 0%, transparent 70%)",
          filter: "blur(80px)",
          top: "-10%",
          left: "10%",
        }}
      />
      <motion.div
        animate={{ x: ["30%", "-20%", "30%"], y: ["60%", "10%", "60%"] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute h-[450px] w-[450px] rounded-full"
        style={{
          background: isDark
            ? "radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(239,68,68,0.05) 0%, transparent 70%)",
          filter: "blur(80px)",
          top: "30%",
          right: "5%",
        }}
      />
      <motion.div
        animate={{ x: ["50%", "-10%", "50%"], y: ["20%", "-30%", "20%"] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute h-[400px] w-[400px] rounded-full"
        style={{
          background: isDark
            ? "radial-gradient(circle, rgba(34,197,94,0.05) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(34,197,94,0.04) 0%, transparent 70%)",
          filter: "blur(80px)",
          bottom: "10%",
          left: "30%",
        }}
      />
    </div>
  );
}

function EmptySection({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  const { isDark } = useTheme();
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border py-16 ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-black/[0.06] bg-black/[0.02]"
      }`}>
      <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${isDark ? "bg-white/5" : "bg-black/5"
        }`}>
        <Icon className={`h-7 w-7 ${isDark ? "text-zinc-600" : "text-zinc-400"}`} />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className={`mt-1.5 max-w-sm text-center text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
        {description}
      </p>
      <button className="mt-5 flex items-center gap-2 rounded-lg bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-500 transition-colors hover:bg-yellow-500/20">
        <Plus className="h-4 w-4" />
        Create
      </button>
    </div>
  );
}

export default function TeacherDashboard() {
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
        navItems={teacherNavItems}
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
                  <AssignmentsCard onOpenAssignments={() => setActiveSection("assignments")} />
                </div>
              </motion.div>
            )}

            {activeSection === "classrooms" && (
              <motion.div
                key="classrooms"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="mb-6">
                  <h1 className="text-xl font-semibold tracking-tight">Classrooms</h1>
                  <p className={`mt-1 text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
                    Create and manage your virtual classrooms.
                  </p>
                </div>
                <TeacherClassroomsPanel />
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
                  <p className={`mt-1 text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
                    Create and distribute coding assignments to your students.
                  </p>
                </div>
                <TeacherAssignmentsPanel />
              </motion.div>
            )}

            {activeSection === "contests" && (
              <motion.div
                key="contests"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="mb-6">
                  <h1 className="text-xl font-semibold tracking-tight">Contests</h1>
                  <p className={`mt-1 text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
                    Host coding contests and competitions for your students.
                  </p>
                </div>
                <EmptySection
                  icon={Trophy}
                  title="No contests yet"
                  description="Create timed coding contests with automatic evaluation and leaderboards."
                />
              </motion.div>
            )}

            {activeSection === "students" && (
              <motion.div
                key="students"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="mb-6">
                  <h1 className="text-xl font-semibold tracking-tight">Students</h1>
                  <p className={`mt-1 text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
                    View and manage students across all your classrooms.
                  </p>
                </div>
                <EmptySection
                  icon={Users}
                  title="No students yet"
                  description="Students will appear here once they join your classrooms. Share your classroom invite code to get started."
                />
              </motion.div>
            )}

            {activeSection === "analytics" && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="mb-6">
                  <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
                  <p className={`mt-1 text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
                    Track student performance, submission trends, and classroom engagement.
                  </p>
                </div>
                <EmptySection
                  icon={BarChart3}
                  title="No data yet"
                  description="Analytics will populate once students begin submitting assignments and participating in contests."
                />
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
                  <p className={`mt-1 text-sm ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
                    Manage and create your coding workspaces.
                  </p>
                </div>
                <WorkspacesPanel />
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
