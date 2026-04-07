"use client";

import { useState, useEffect } from "react";

export default function UserCountBadge() {
  const [usersCount, setUsersCount] = useState(0);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
    fetch(`${API_BASE}/api/stats/users-count`)
      .then((r) => r.ok ? r.json() : { count: 0 })
      .then((d: { count: number }) => { if (d.count > 0) setUsersCount(d.count); })
      .catch(() => {});
  }, []);

  if (usersCount < 10) return null;

  return (
    <div className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
      <div className="flex -space-x-1.5">
        {["T", "S", "M", "K"].map((l, i) => (
          <div key={i} className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-bold" style={{ background: "rgba(108,92,231,0.15)", borderColor: "var(--bg-base)", color: "var(--accent-primary)" }}>{l}</div>
        ))}
      </div>
      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
        Déjà <span className="font-bold" style={{ color: "var(--text-primary)" }}>+{Math.max(500, Math.floor(usersCount / 100) * 100)}</span> investisseurs nous font confiance
      </span>
    </div>
  );
}
