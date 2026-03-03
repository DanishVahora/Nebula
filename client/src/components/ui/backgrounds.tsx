"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";

export const GridBackground = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0",
        className
      )}
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
        backgroundSize: "64px 64px",
      }}
    >
      <div className="absolute inset-0 bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
    </div>
  );
};

export const DotBackground = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0",
        className
      )}
      style={{
        backgroundImage: `radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
      }}
    >
      <div className="absolute inset-0 bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
    </div>
  );
};

export const Meteors = ({
  number = 20,
  className,
}: {
  number?: number;
  className?: string;
}) => {
  const [meteorStyles, setMeteorStyles] = useState<Array<{
    top: string;
    left: string;
    delay: string;
    duration: string;
  }>>([]);

  const generateMeteors = useCallback(() => {
    return [...new Array(number)].map(() => ({
      top: -5 + "px",
      left: Math.floor(Math.random() * 100) + "%",
      delay: Math.random() * 1 + 0.2 + "s",
      duration: Math.floor(Math.random() * 8 + 2) + "s",
    }));
  }, [number]);

  useEffect(() => {
    setMeteorStyles(generateMeteors());
  }, [generateMeteors]);

  return (
    <>
      {meteorStyles.map((style, idx) => (
        <span
          key={idx}
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 h-0.5 w-0.5 rotate-[215deg] animate-meteor rounded-[9999px] bg-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]",
            "before:absolute before:top-1/2 before:h-[1px] before:w-[50px] before:-translate-y-[50%] before:bg-gradient-to-r before:from-white/20 before:to-transparent before:content-['']",
            className
          )}
          style={{
            top: style.top,
            left: style.left,
            animationDelay: style.delay,
            animationDuration: style.duration,
          }}
        />
      ))}
      <style>{`
        @keyframes meteor {
          0% { transform: rotate(215deg) translateX(0); opacity: 1; }
          70% { opacity: 1; }
          100% { transform: rotate(215deg) translateX(-600px); opacity: 0; }
        }
        .animate-meteor {
          animation: meteor 3s linear infinite;
        }
      `}</style>
    </>
  );
};
