import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Code2,
  Terminal,
  Container,
  Eye,
  Bot,
  ShieldOff,
} from "lucide-react";

const capabilities = [
  {
    icon: <Code2 className="h-4 w-4" />,
    label: "Monaco Editor",
    color: "text-blue-400",
  },
  {
    icon: <Terminal className="h-4 w-4" />,
    label: "Integrated Terminal",
    color: "text-green-400",
  },
  {
    icon: <Container className="h-4 w-4" />,
    label: "Docker Isolation",
    color: "text-yellow-400",
  },
  {
    icon: <Eye className="h-4 w-4" />,
    label: "Port Preview",
    color: "text-red-400",
  },
  {
    icon: <Bot className="h-4 w-4" />,
    label: "AI Assistance",
    color: "text-purple-400",
  },
  {
    icon: <ShieldOff className="h-4 w-4" />,
    label: "AI Toggle",
    color: "text-orange-400",
  },
];

export const IDEShowcase = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="ide" className="relative px-6 py-28">
      {/* Subtle colored glow behind the section */}
      <div className="pointer-events-none absolute left-0 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-blue-500/[0.03] blur-[150px]" />

      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Left: IDE mockup */}
          <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a] shadow-2xl shadow-black/50">
              {/* IDE header — R/Y/G dots + status */}
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <span className="text-[10px] text-zinc-600">
                    nebula workspace
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1 rounded border border-green-500/20 bg-green-500/5 px-1.5 py-0.5 text-[9px] text-green-400">
                    <span className="h-1 w-1 rounded-full bg-green-400" />
                    AI
                  </div>
                  <div className="flex items-center gap-1 rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[9px] text-zinc-500">
                    <span className="h-1 w-1 rounded-full bg-yellow-400" />
                    3 online
                  </div>
                </div>
              </div>

              {/* IDE body */}
              <div className="flex">
                {/* File tree */}
                <div className="w-40 border-r border-white/[0.06] p-2.5">
                  <div className="mb-2 text-[9px] font-medium uppercase tracking-wider text-zinc-600">
                    Explorer
                  </div>
                  <div className="space-y-0.5 text-[10px]">
                    <div className="text-zinc-400">▾ src/</div>
                    <div className="flex items-center gap-1.5 rounded bg-white/[0.04] px-1.5 py-0.5 pl-3">
                      <span className="text-blue-400">TS</span>
                      <span className="text-white/80">App.tsx</span>
                    </div>
                    <div className="pl-3 text-zinc-600">index.css</div>
                    <div className="pl-3 text-zinc-600">main.tsx</div>
                    <div className="text-zinc-400">▸ public/</div>
                    <div className="text-zinc-600">package.json</div>
                  </div>
                </div>

                {/* Editor area — with colored syntax */}
                <div className="flex-1 p-3">
                  <div className="font-mono text-[10px] leading-5 text-zinc-500">
                    <div>
                      <span className="mr-3 w-3 select-none text-right text-zinc-700 inline-block">1</span>
                      <span className="text-[#c586c0]">export default</span>
                      <span className="text-[#569cd6]"> function</span>
                      <span className="text-[#dcdcaa]"> App</span>
                      <span className="text-zinc-500">() {"{"}</span>
                    </div>
                    <div>
                      <span className="mr-3 w-3 select-none text-right text-zinc-700 inline-block">2</span>
                      <span className="text-zinc-500">{"  "}</span>
                      <span className="text-[#c586c0]">return</span>
                      <span className="text-zinc-500"> (</span>
                    </div>
                    <div>
                      <span className="mr-3 w-3 select-none text-right text-zinc-700 inline-block">3</span>
                      <span className="text-zinc-500">{"    <"}</span>
                      <span className="text-[#4ec9b0]">div</span>
                      <span className="text-zinc-500">{">"}</span>
                    </div>
                    <div>
                      <span className="mr-3 w-3 select-none text-right text-zinc-700 inline-block">4</span>
                      <span className="text-[#d4d4d4]">{"      Hello, Nebula"}</span>
                    </div>
                    <div>
                      <span className="mr-3 w-3 select-none text-right text-zinc-700 inline-block">5</span>
                      <span className="text-zinc-500">{"    </"}</span>
                      <span className="text-[#4ec9b0]">div</span>
                      <span className="text-zinc-500">{">"}</span>
                    </div>
                    <div>
                      <span className="mr-3 w-3 select-none text-right text-zinc-700 inline-block">6</span>
                      <span className="text-zinc-500">{"  )"}</span>
                    </div>
                    <div>
                      <span className="mr-3 w-3 select-none text-right text-zinc-700 inline-block">7</span>
                      <span className="text-zinc-500">{"}"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terminal — with green prompt */}
              <div className="border-t border-white/[0.06] p-2.5">
                <div className="mb-1 text-[9px] font-medium uppercase tracking-wider text-zinc-600">
                  Terminal
                </div>
                <div className="font-mono text-[10px]">
                  <div>
                    <span className="text-green-500">❯</span>
                    <span className="text-zinc-400"> npm run dev</span>
                  </div>
                  <div className="text-zinc-600">
                    ▸ Local: <span className="text-blue-400/60">http://localhost:3000</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-green-500">❯</span>
                    <span className="inline-block h-3 w-[2px] animate-pulse bg-green-400/60" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Capabilities — compact with colored icons */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-600">
              Cloud IDE
            </p>
            <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Full dev environment in your browser
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-zinc-500">
              Docker container per workspace. Monaco editor, terminal, and AI — ready in seconds.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {capabilities.map((cap, i) => (
                <motion.div
                  key={cap.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.06 }}
                  className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                >
                  <div className={`${cap.color}`}>
                    {cap.icon}
                  </div>
                  <span className="text-xs font-medium text-zinc-300">
                    {cap.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
