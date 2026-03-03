"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const SparklesCore = ({
  id,
  background,
  minSize,
  maxSize,
  speed,
  particleColor,
  particleDensity,
  className,
}: {
  id?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  particleColor?: string;
  particleDensity?: number;
  className?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [_context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  const density = particleDensity || 120;
  const color = particleColor || "#ffffff";
  const minS = minSize || 0.4;
  const maxS = maxSize || 1.4;
  const spd = speed || 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setContext(ctx);

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      fadeDirection: number;
    }

    const particles: Particle[] = [];

    for (let i = 0; i < density; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * (maxS - minS) + minS,
        speedX: (Math.random() - 0.5) * spd * 0.3,
        speedY: (Math.random() - 0.5) * spd * 0.3,
        opacity: Math.random(),
        fadeDirection: Math.random() > 0.5 ? 1 : -1,
      });
    }

    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.opacity += p.fadeDirection * 0.005 * spd;

        if (p.opacity <= 0) {
          p.opacity = 0;
          p.fadeDirection = 1;
        }
        if (p.opacity >= 1) {
          p.opacity = 1;
          p.fadeDirection = -1;
        }

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [density, color, minS, maxS, spd]);

  return (
    <canvas
      ref={canvasRef}
      id={id}
      className={cn("absolute inset-0", className)}
      style={{ background: background || "transparent" }}
    />
  );
};
