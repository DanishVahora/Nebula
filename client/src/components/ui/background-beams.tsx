"use client";

import { cn } from "@/lib/utils";
import type React from "react";
import { useEffect, useRef, useState } from "react";

export const BackgroundBeams = ({ className }: { className?: string }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [_dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current?.parentElement) {
        setDimensions({
          width: svgRef.current.parentElement.offsetWidth,
          height: svgRef.current.parentElement.offsetHeight,
        });
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const paths = [
    "M-380 -189C-380 -189 -312 216 152 343C616 470 684 875 684 875",
    "M-373 -197C-373 -197 -305 208 159 335C623 462 691 867 691 867",
    "M-366 -205C-366 -205 -298 200 166 327C630 454 698 859 698 859",
    "M-359 -213C-359 -213 -291 192 173 319C637 446 705 851 705 851",
    "M-352 -221C-352 -221 -284 184 180 311C644 438 712 843 712 843",
    "M-345 -229C-345 -229 -277 176 187 303C651 430 719 835 719 835",
    "M-338 -237C-338 -237 -270 168 194 295C658 422 726 827 726 827",
    "M-331 -245C-331 -245 -263 160 201 287C665 414 733 819 733 819",
    "M-324 -253C-324 -253 -256 152 208 279C672 406 740 811 740 811",
  ];

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <svg
        ref={svgRef}
        className="pointer-events-none absolute h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 696 700"
      >
        {paths.map((path, i) => (
          <BeamPath key={i} d={path} delay={i * 0.5} />
        ))}
      </svg>
    </div>
  );
};

const BeamPath: React.FC<{ d: string; delay: number }> = ({ d, delay }) => {
  return (
    <g>
      <path d={d} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
      <path d={d} stroke="url(#beam-gradient)" strokeWidth="0.5">
        <animate
          attributeName="stroke-dashoffset"
          from="2000"
          to="0"
          dur="6s"
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
        <animate
          attributeName="stroke-dasharray"
          values="0 2000;100 2000;0 2000"
          dur="6s"
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
      </path>
      <defs>
        <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
    </g>
  );
};
