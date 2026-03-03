import { CardSpotlight } from "@/components/ui/card-spotlight";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Rocket, Users, ClipboardCheck, GitBranch } from "lucide-react";

const steps = [
  {
    step: "01",
    title: "Create workspace",
    description: "Pick a template. Cloud environment in seconds.",
    icon: <Rocket className="h-4 w-4" />,
    color: "text-green-400",
    borderColor: "border-green-500/20",
    bgColor: "bg-green-500/5",
  },
  {
    step: "02",
    title: "Write & collaborate",
    description: "AI assistance, live cursors, real-time sync.",
    icon: <Users className="h-4 w-4" />,
    color: "text-blue-400",
    borderColor: "border-blue-500/20",
    bgColor: "bg-blue-500/5",
  },
  {
    step: "03",
    title: "Assign & assess",
    description: "Timers, AI toggle, auto-submit, code review.",
    icon: <ClipboardCheck className="h-4 w-4" />,
    color: "text-yellow-400",
    borderColor: "border-yellow-500/20",
    bgColor: "bg-yellow-500/5",
  },
  {
    step: "04",
    title: "Ship & review",
    description: "Push to GitHub. Track metrics. Iterate.",
    icon: <GitBranch className="h-4 w-4" />,
    color: "text-red-400",
    borderColor: "border-red-500/20",
    bgColor: "bg-red-500/5",
  },
];

export const HowItWorks = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="workflow" className="relative px-6 py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-600">
            Workflow
          </p>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Zero to deployed in minutes
          </h2>
        </div>

        <div ref={ref} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.5,
                delay: i * 0.1,
                ease: "easeOut",
              }}
            >
              <CardSpotlight className="h-full">
                <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${item.borderColor} ${item.bgColor}`}>
                  <span className={item.color}>{item.icon}</span>
                </div>
                <span className={`mb-1 block font-mono text-[10px] ${item.color}`}>
                  {item.step}
                </span>
                <h3 className="mb-1 text-sm font-semibold text-zinc-100">
                  {item.title}
                </h3>
                <p className="text-xs leading-relaxed text-zinc-500">
                  {item.description}
                </p>
              </CardSpotlight>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
