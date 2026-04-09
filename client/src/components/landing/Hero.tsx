import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { SparklesCore } from "@/components/ui/sparkles";
import { motion } from "framer-motion";
import { ArrowRight, LogOut, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

export const Navbar = () => {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.avatar]);

  const getDashboardLink = () => {
    if (!user) return "/dashboard";
    return user.role === "TEACHER" ? "/teacher-dashboard" : "/student-dashboard";
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-black/60 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 overflow-hidden rounded-lg border border-white/10 bg-white/5">
            <img src="/logo.png" alt="Nebula logo" className="h-full w-full object-cover" />
          </div>
          <span className="text-base font-semibold tracking-tight">Nebula</span>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          {["IDE", "Workflow", "Testimonials"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-xs text-zinc-500 transition-colors hover:text-white"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
          ) : isAuthenticated && user ? (
            // Logged in state
            <>
              <Link
                to={getDashboardLink()}
                className="flex items-center gap-2 text-xs text-zinc-400 transition-colors hover:text-white"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5">
                {user.avatar && !avatarFailed ? (
                  <img
                    src={user.avatar}
                    alt={user.name || "User"}
                    onError={() => setAvatarFailed(true)}
                    className="h-5 w-5 rounded-full"
                  />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-green-400 to-blue-500" />
                )}
                <span className="text-xs text-zinc-300">{user.name || user.email}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${user.role === "TEACHER"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-green-500/20 text-green-400"
                  }`}>
                  {user.role}
                </span>
              </div>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-red-400"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            // Logged out state
            <>
              <Link
                to="/login"
                className="hidden text-xs text-zinc-500 transition-colors hover:text-white sm:block"
              >
                Sign in
              </Link>
              <Link to="/signup">
                <HoverBorderGradient containerClassName="hidden sm:block">
                  <span className="flex items-center gap-1.5 text-xs">
                    Get Started <ArrowRight className="h-3 w-3" />
                  </span>
                </HoverBorderGradient>
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export const Hero = () => {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-14">
      {/* Sparkles background */}
      <div className="absolute inset-0">
        <SparklesCore
          id="hero-sparkles"
          background="transparent"
          minSize={0.3}
          maxSize={1}
          particleDensity={40}
          particleColor="#ffffff"
          speed={0.3}
        />
      </div>

      {/* Colored ambient glows */}
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[400px] w-[400px] rounded-full bg-red-500/[0.04] blur-[120px]" />
      <div className="pointer-events-none absolute -top-20 right-1/4 h-[350px] w-[350px] rounded-full bg-green-500/[0.04] blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-yellow-500/[0.03] blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Badge with green live dot */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] text-zinc-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
            </span>
            A space where development happens
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="text-balance text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl md:text-7xl"
        >
          Build. Collaborate.
          <br />
          <span className="text-zinc-600">Teach. Ship.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-zinc-500"
        >
          AI-powered cloud IDE for teams and classrooms.
          Write, run, and review code — all in one place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            to="/signup"
            className="group flex h-10 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-black transition-all hover:bg-zinc-200"
          >
            Enter Nebula
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#"
            className="flex h-10 items-center gap-2 rounded-full border border-white/10 px-5 text-sm text-zinc-400 transition-colors hover:border-white/20 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </a>
        </motion.div>

        {/* Editor Preview — colored traffic lights + syntax highlighting */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          className="mx-auto mt-16 max-w-3xl"
        >
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a] shadow-2xl shadow-white/[0.02]">
            {/* Title bar — R/Y/G dots */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </div>
              <div className="ml-4 flex gap-1">
                <div className="rounded-t border border-b-0 border-white/[0.08] bg-white/[0.03] px-3 py-0.5 text-[10px] text-zinc-400">
                  index.tsx
                </div>
                <div className="rounded-t border border-transparent px-3 py-0.5 text-[10px] text-zinc-600">
                  styles.css
                </div>
              </div>
            </div>
            {/* Code body with VS Code-style syntax colors */}
            <div className="p-4 font-mono text-[12px] leading-6">
              <div className="flex">
                <span className="mr-5 w-4 select-none text-right text-zinc-700">1</span>
                <span>
                  <span className="text-[#c586c0]">import</span>
                  <span className="text-[#9cdcfe]"> {"{ Nebula }"} </span>
                  <span className="text-[#c586c0]">from</span>
                  <span className="text-[#ce9178]"> '@nebula/sdk'</span>
                </span>
              </div>
              <div className="flex">
                <span className="mr-5 w-4 select-none text-right text-zinc-700">2</span>
              </div>
              <div className="flex">
                <span className="mr-5 w-4 select-none text-right text-zinc-700">3</span>
                <span>
                  <span className="text-[#569cd6]">const</span>
                  <span className="text-[#9cdcfe]"> workspace </span>
                  <span className="text-zinc-500">= </span>
                  <span className="text-[#c586c0]">await</span>
                  <span className="text-[#9cdcfe]"> Nebula</span>
                  <span className="text-zinc-500">.</span>
                  <span className="text-[#dcdcaa]">create</span>
                  <span className="text-zinc-500">({"{"}</span>
                </span>
              </div>
              <div className="flex">
                <span className="mr-5 w-4 select-none text-right text-zinc-700">4</span>
                <span>
                  <span className="text-[#9cdcfe]">{"  "}template</span>
                  <span className="text-zinc-500">: </span>
                  <span className="text-[#ce9178]">'react-ts'</span>
                  <span className="text-zinc-500">,</span>
                </span>
              </div>
              <div className="flex">
                <span className="mr-5 w-4 select-none text-right text-zinc-700">5</span>
                <span>
                  <span className="text-[#9cdcfe]">{"  "}ai</span>
                  <span className="text-zinc-500">: </span>
                  <span className="text-[#569cd6]">true</span>
                  <span className="text-zinc-500">,</span>
                </span>
              </div>
              <div className="flex">
                <span className="mr-5 w-4 select-none text-right text-zinc-700">6</span>
                <span className="text-zinc-500">{"})"}</span>
              </div>
              <div className="flex">
                <span className="mr-5 w-4 select-none text-right text-zinc-700">7</span>
              </div>
              <div className="flex">
                <span className="mr-5 w-4 select-none text-right text-zinc-700">8</span>
                <span className="text-[#6a9955]">{"// ✨ Your cloud IDE is ready"}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Language tags */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-2"
        >
          {["TypeScript", "Python", "React", "Next.js", "Java", "C++"].map(
            (lang) => (
              <span
                key={lang}
                className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-0.5 text-[10px] text-zinc-600"
              >
                {lang}
              </span>
            )
          )}
        </motion.div>
      </div>
    </section>
  );
};
