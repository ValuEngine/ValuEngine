"use client";

interface Tab {
  id: string;
  label: string;
}

export default function Tabs({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-base)" }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === tab.id
              ? "shadow-sm"
              : "hover:text-[var(--text-secondary)]"
          }`}
          style={{
            background: activeTab === tab.id ? "var(--bg-elevated)" : "transparent",
            color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-tertiary)",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
