"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export const TracingBeam = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="absolute -left-4 top-0 hidden h-full md:-left-12 md:block">
        <motion.div
          style={{ opacity }}
          className="sticky top-20 flex h-[calc(100vh-5rem)] flex-col items-center"
        >
          <svg
            viewBox="0 0 20 100"
            className="h-full w-5"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <motion.path
              d="M10 0 L10 100"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="0.5"
            />
            <motion.path
              d="M10 0 L10 100"
              stroke="white"
              strokeWidth="0.5"
              style={{ pathLength }}
            />
          </svg>
          <motion.div
            className="h-2 w-2 rounded-full border border-white/20 bg-white"
            style={{ opacity }}
          />
        </motion.div>
      </div>
      <div className="md:pl-12">{children}</div>
    </div>
  );
};
