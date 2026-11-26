"use client";
import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { useEffect, useRef } from "react";
import { loadWorld } from "@/lib/client/world";

/** Slowly rotating decorative globe for the landing page (canvas, respects reduced motion). */
export function Globe({ size = 520 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    let alive = true;
    const canvas = ref.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const proj = geoOrthographic()
      .scale(size / 2 - 8)
      .translate([size / 2, size / 2])
      .clipAngle(90);
    const path = geoPath(proj, ctx);
    const grat = geoGraticule10();
    loadWorld().then((w) => {
      if (!alive) return;
      let lambda = -20;
      const reduce = document.documentElement.classList.contains("reduce-motion") || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const draw = () => {
        proj.rotate([lambda, -18]);
        ctx.clearRect(0, 0, size, size);
        const g = ctx.createRadialGradient(size * 0.38, size * 0.32, size * 0.05, size / 2, size / 2, size / 2);
        g.addColorStop(0, "#4da3e0");
        g.addColorStop(1, "#1a5c96");
        ctx.beginPath();
        path({ type: "Sphere" });
        ctx.fillStyle = g;
        ctx.fill();
        ctx.beginPath();
        path(grat);
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.beginPath();
        path(w.land);
        ctx.fillStyle = "#7dba67";
        ctx.fill();
        ctx.strokeStyle = "#3f7334";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.beginPath();
        path(w.borders);
        ctx.strokeStyle = "rgba(47,95,40,0.5)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
        // atmosphere rim
        ctx.beginPath();
        path({ type: "Sphere" });
        ctx.strokeStyle = "rgba(160,220,255,0.6)";
        ctx.lineWidth = 3;
        ctx.stroke();
        if (!reduce) {
          lambda += 0.08;
          raf = requestAnimationFrame(draw);
        }
      };
      draw();
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [size]);
  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden className="drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)]" />;
}
