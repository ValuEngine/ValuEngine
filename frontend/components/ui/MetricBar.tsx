"use client";

import { useEffect, useRef, useState } from "react";

interface MetricBarProps {
  label: string;
  value: number;           // actual value
  max?: number;            // max scale (default: 100)
  suffix?: string;         // e.g. "%" or "x"
  benchmark?: number;      // optional benchmark line
  benchmarkLabel?: string; // e.g. "Médiane secteur"
  color?: string;          // bar color override
  delay?: number;          // animation stagger delay (s)
}

function getAutoColor(value: number, max: number): string {
  const pct = (value / max) * 100;
  if (pct < 33) return "var(--color-danger)";
  if (pct < 66) return "var(--color-warning)";
  return "var(--color-success)";
}

export default function MetricBar({
  label,
  value,
  max = 100,
  suffix = "%",
  benchmark,
  benchmarkLabel,
  color,
  delay = 0,
}: MetricBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const resolvedColor = color || getAutoColor(value, max);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-metric-label">{label}</span>
        <span
          className="font-display text-[15px] font-bold"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
        >
          {value.toFixed(1)}{suffix}
        </span>
      </div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: visible ? `${pct}%` : "0%",
            background: resolvedColor,
            transition: `width 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
          }}
        />
        {benchmark != null && (
          <div
            className="absolute top-0 bottom-0 w-0.5"
            style={{
              left: `${Math.min((benchmark / max) * 100, 100)}%`,
              background: "var(--text-tertiary)",
            }}
            title={benchmarkLabel || `Benchmark: ${benchmark}${suffix}`}
          />
        )}
      </div>
      {benchmark != null && benchmarkLabel && (
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {benchmarkLabel}: {benchmark.toFixed(1)}{suffix}
        </span>
      )}
    </div>
  );
}
