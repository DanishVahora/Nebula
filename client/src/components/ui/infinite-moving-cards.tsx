"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export const InfiniteMovingCards = ({
  items,
  direction = "left",
  speed = "normal",
  pauseOnHover = true,
  className,
}: {
  items: {
    quote: string;
    name: string;
    title: string;
  }[];
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  pauseOnHover?: boolean;
  className?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [start, setStart] = useState(false);

  const getSpeed = useCallback(() => {
    if (speed === "fast") return "20s";
    if (speed === "normal") return "40s";
    return "80s";
  }, [speed]);

  const getDirection = useCallback(() => {
    return direction === "left" ? "forwards" : "reverse";
  }, [direction]);

  useEffect(() => {
    if (!containerRef.current || !scrollerRef.current) return;

    const scrollerContent = Array.from(scrollerRef.current.children);
    scrollerContent.forEach((item) => {
      const duplicatedItem = item.cloneNode(true);
      scrollerRef.current?.appendChild(duplicatedItem);
    });

    if (containerRef.current) {
      containerRef.current.style.setProperty("--animation-duration", getSpeed());
      containerRef.current.style.setProperty("--animation-direction", getDirection());
    }

    setStart(true);
  }, [getSpeed, getDirection]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "scroller relative z-20 max-w-7xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]",
        className
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          "flex w-max min-w-full shrink-0 gap-6 py-4",
          start && "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]"
        )}
        style={
          start
            ? {
                animation: `scroll var(--animation-duration, 40s) var(--animation-direction, forwards) linear infinite`,
              }
            : undefined
        }
      >
        {items.map((item, idx) => (
          <li
            key={idx}
            className="relative w-[350px] max-w-full shrink-0 rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-8 py-6 md:w-[450px]"
          >
            <blockquote>
              <p className="relative z-20 text-sm leading-relaxed text-zinc-300">
                {item.quote}
              </p>
              <div className="relative z-20 mt-6 flex flex-row items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-white">
                  {item.name.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-200">
                    {item.name}
                  </span>
                  <span className="text-xs text-zinc-500">{item.title}</span>
                </div>
              </div>
            </blockquote>
          </li>
        ))}
      </ul>

      <style>{`
        @keyframes scroll {
          from { transform: translateX(0); }
          to { transform: translateX(calc(-50% - 0.75rem)); }
        }
      `}</style>
    </div>
  );
};
