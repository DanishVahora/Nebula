"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export const BentoGrid = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  title,
  description,
  icon,
  className,
  header,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-6 transition-colors hover:border-white/[0.15]",
        className
      )}
    >
      {header && <div className="mb-4">{header}</div>}
      <div className="relative z-10">
        {icon && (
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/60 transition-colors group-hover:text-white/90">
            {icon}
          </div>
        )}
        <h3 className="mb-1.5 text-base font-semibold text-zinc-100">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>
    </motion.div>
  );
};
