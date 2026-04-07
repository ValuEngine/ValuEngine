import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "var(--accent-primary-muted)" }}
      >
        <Icon className="w-8 h-8" style={{ color: "var(--accent-primary)" }} />
      </div>
      <h3
        className="font-display text-lg font-semibold tracking-tight mb-2 text-center"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </h3>
      <p
        className="text-[15px] text-center max-w-sm mb-8 leading-relaxed"
        style={{ color: "var(--text-tertiary)" }}
      >
        {description}
      </p>
      {action && (
        <button className="btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
