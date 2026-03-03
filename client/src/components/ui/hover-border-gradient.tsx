"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import type React from "react";
import { cn } from "@/lib/utils";

export const HoverBorderGradient = ({
  children,
  containerClassName,
  className,
  as: Tag = "button",
  ...props
}: {
  children: React.ReactNode;
  containerClassName?: string;
  className?: string;
  as?: React.ElementType;
} & React.HTMLAttributes<HTMLElement>) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  }

  return (
    <div
      className={cn("group relative rounded-full p-[1px]", containerClassName)}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-[1px] rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`radial-gradient(200px circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.15), transparent 80%)`,
        }}
      />
      <div className="absolute inset-0 rounded-full border border-white/10" />
      <Tag
        className={cn(
          "relative z-10 rounded-full bg-black px-6 py-2 text-sm font-medium text-white transition-colors",
          className
        )}
        {...props}
      >
        {children}
      </Tag>
    </div>
  );
};
