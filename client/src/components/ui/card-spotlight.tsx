"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import type React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

export const CardSpotlight = ({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) => {
  const { isDark } = useTheme();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  }

  return (
    <div
      className={cn(
        "group relative rounded-2xl border p-6 backdrop-blur-sm transition-all duration-300",
        isDark
          ? "border-white/8 bg-white/[0.03] hover:border-white/12 hover:shadow-[0_0_30px_rgba(34,197,94,0.06)]"
          : "border-black/8 bg-white/70 hover:border-black/12 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]",
        className
      )}
      onMouseMove={handleMouseMove}
      {...props}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`radial-gradient(350px circle at ${mouseX}px ${mouseY}px, ${
            isDark ? "rgba(34,197,94,0.06)" : "rgba(34,197,94,0.04)"
          }, transparent 80%)`,
        }}
      />
      {children}
    </div>
  );
};
