"use client";
import { useEffect, useRef } from "react";

export default function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    let t = 0;
    let rafId = 0;

    const strands = Array.from({ length: 12 }, (_, i) => ({
      offset: (i / 12) * Math.PI * 2,
      speed:  0.0003 + i * 0.00015,
      width:  60 + i * 18,
      hue:    (i * 30) % 360,
    }));

    function draw() {
      ctx.clearRect(0, 0, W, H);

      strands.forEach(s => {
        const x1 = W * 0.1 + Math.sin(t * s.speed + s.offset) * W * 0.35;
        const y1 = H * 0.3 + Math.cos(t * s.speed * 0.7 + s.offset) * H * 0.25;
        const x2 = W * 0.5 + Math.cos(t * s.speed * 1.1 + s.offset + 1) * W * 0.3;
        const y2 = H * 0.6 + Math.sin(t * s.speed * 0.9 + s.offset + 2) * H * 0.2;
        const x3 = W * 0.9 - Math.sin(t * s.speed * 0.8 + s.offset + 3) * W * 0.25;
        const y3 = H * 0.4 + Math.cos(t * s.speed * 1.2 + s.offset + 1) * H * 0.3;

        const grad = ctx.createLinearGradient(x1, y1, x3, y3);
        grad.addColorStop(0,   `hsla(${s.hue}, 100%, 70%, 0)`);
        grad.addColorStop(0.3, `hsla(${s.hue}, 100%, 65%, 0.12)`);
        grad.addColorStop(0.5, `hsla(${(s.hue + 40) % 360}, 90%, 75%, 0.18)`);
        grad.addColorStop(0.7, `hsla(${(s.hue + 80) % 360}, 100%, 70%, 0.12)`);
        grad.addColorStop(1,   `hsla(${s.hue}, 100%, 70%, 0)`);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(x1, y2, x2, y1, x2, y2);
        ctx.bezierCurveTo(x2, y3, x3, y2, x3, y3);
        ctx.lineWidth = s.width;
        ctx.strokeStyle = grad;
        ctx.lineCap = "round";
        ctx.stroke();
      });

      t += 16;
      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);
    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: 0.85 }}
    />
  );
}
