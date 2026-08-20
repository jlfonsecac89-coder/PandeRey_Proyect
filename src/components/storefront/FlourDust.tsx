"use client";

import { useEffect, useRef } from "react";

type Particle = { x: number; y: number; r: number; vx: number; vy: number; o: number };

// Polvo de harina ambiental — decorativo, no bloquea nada debajo (absolute +
// pointer-events-none). Se apaga por completo con prefers-reduced-motion en
// vez de solo acortar la duración: es puramente atmosférico, no comunica
// ningún estado, así que no hay nada que perder al quitarlo.
export function FlourDust({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let frame: number;

    function resize() {
      const rect = canvas!.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas!.width = rect.width;
      canvas!.height = rect.height;
    }

    function initParticles() {
      particles = Array.from({ length: 46 }, () => ({
        x: Math.random() * canvas!.width,
        y: Math.random() * canvas!.height,
        r: Math.random() * 1.6 + 0.4,
        vy: Math.random() * 0.15 + 0.04,
        vx: (Math.random() - 0.5) * 0.08,
        o: Math.random() * 0.5 + 0.15,
      }));
    }

    function tick() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      particles.forEach((p) => {
        p.y -= p.vy;
        p.x += p.vx;
        if (p.y < -4) {
          p.y = canvas!.height + 4;
          p.x = Math.random() * canvas!.width;
        }
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(242,234,217,${p.o})`;
        ctx!.fill();
      });
      frame = requestAnimationFrame(tick);
    }

    resize();
    initParticles();
    frame = requestAnimationFrame(tick);

    const onResize = () => {
      resize();
      initParticles();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 opacity-55 ${className ?? ""}`}
    />
  );
}
