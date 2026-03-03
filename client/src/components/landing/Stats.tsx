import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const stats = [
  { value: "50ms", label: "Boot time", color: "text-green-400" },
  { value: "12+", label: "Languages", color: "text-blue-400" },
  { value: "99.9%", label: "Uptime", color: "text-yellow-400" },
  { value: "10k+", label: "Developers", color: "text-red-400" },
];

export const Stats = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <div
          ref={ref}
          className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04] md:grid-cols-4"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex flex-col items-center justify-center bg-black px-4 py-8"
            >
              <span className={`text-2xl font-bold tracking-tight sm:text-3xl ${stat.color}`}>
                {stat.value}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
