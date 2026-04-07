"use client";

const VARIANT_STYLES: Record<string, string> = {
  success: "bg-[rgba(0,230,138,0.1)] text-[var(--color-success)] border-[rgba(0,230,138,0.2)]",
  danger:  "bg-[rgba(255,84,112,0.1)] text-[var(--color-danger)] border-[rgba(255,84,112,0.2)]",
  warning: "bg-[rgba(255,184,77,0.1)] text-[var(--color-warning)] border-[rgba(255,184,77,0.2)]",
  info:    "bg-[rgba(84,184,255,0.1)] text-[var(--color-info)] border-[rgba(84,184,255,0.2)]",
  pro:     "bg-[rgba(240,200,80,0.1)] text-[var(--accent-gold)] border-[rgba(240,200,80,0.2)]",
  neutral: "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-default)]",
};

export default function Badge({
  variant = "neutral",
  children,
}: {
  variant?: keyof typeof VARIANT_STYLES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
        VARIANT_STYLES[variant] || VARIANT_STYLES.neutral
      }`}
    >
      {children}
    </span>
  );
}
