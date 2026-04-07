"use client";

import { useEffect, useState } from "react";

interface CircularScoreProps {
  value: number;           // 0-100
  size?: "sm" | "md" | "lg";
  label?: string;
  color?: string;          // Override auto color
  showValue?: boolean;
  animate?: boolean;
}

const SIZES = {
  sm: { dim: 48, stroke: 4, fontSize: 14 },
  md: { dim: 80, stroke: 5, fontSize: 22 },
  lg: { dim: 120, stroke: 6, fontSize: 32 },
};

function getAutoColor(value: number): string {
  if (value < 40) return "var(--color-danger)";
  if (value < 70) return "var(--color-warning)";
  return "var(--color-success)";
}

export default function CircularScore({
  value,
  size = "md",
  label,
  color,
  showValue = true,
  animate = true,
}: CircularScoreProps) {
  const [animatedValue, setAnimatedValue] = useState(animate ? 0 : value);
  const { dim, stroke, fontSize } = SIZES[size];
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;
  const resolvedColor = color || getAutoColor(value);

  useEffect(() => {
    if (!animate) return;
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value, animate]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth={stroke}
          />
          {/* Progress arc */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke={resolvedColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: animate ? "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)" : "none",
              filter: `drop-shadow(0 0 6px ${resolvedColor}40)`,
            }}
          />
        </svg>
        {showValue && (
          <div
            className="absolute inset-0 flex items-center justify-center font-display font-bold"
            style={{ fontSize, letterSpacing: "-0.02em", color: resolvedColor }}
          >
            {Math.round(animatedValue)}
          </div>
        )}
      </div>
      {label && (
        <span className="text-metric-label text-center">{label}</span>
      )}
    </div>
  );
}
