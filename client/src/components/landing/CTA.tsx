import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Zap } from "lucide-react";
import { SparklesCore } from "@/components/ui/sparkles";
import { Link } from "react-router-dom";

export const CTA = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0a] px-8 py-16 text-center sm:px-16"
        >
          {/* Sparkles */}
          <div className="absolute inset-0 opacity-40">
            <SparklesCore
              id="cta-sparkles"
              background="transparent"
              minSize={0.4}
              maxSize={1}
              particleDensity={30}
              particleColor="#ffffff"
              speed={0.2}
            />
          </div>

          {/* Colored accent glows */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full bg-green-500/[0.06] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-red-500/[0.06] blur-3xl" />

          <div className="relative z-10">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/5 px-3 py-1">
              <Zap className="h-3 w-3 text-green-400" />
              <span className="text-[11px] font-medium text-green-400">Ready in 50ms</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Launch your workspace
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm text-zinc-500">
              No install. No setup. Just code.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="group flex h-10 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-black transition-all hover:bg-zinc-200"
              >
                Let's Enter Nebula
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#"
                className="flex h-10 items-center rounded-full border border-white/10 px-5 text-sm text-zinc-400 transition-colors hover:border-white/20 hover:text-white"
              >
                Documentation
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
