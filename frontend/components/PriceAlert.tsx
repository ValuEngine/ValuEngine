"use client";
import { useState, useEffect, useCallback } from "react";
import { Bell, X } from "lucide-react";

interface Alert {
  ticker: string;
  targetPrice: number;
  condition: "above" | "below";
  createdAt: number;
}

interface Toast {
  id: number;
  message: string;
}

function getAlerts(): Alert[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("ve_alerts") || "[]"); } catch { return []; }
}

function saveAlerts(alerts: Alert[]) {
  localStorage.setItem("ve_alerts", JSON.stringify(alerts));
}

// Modal for creating an alert
export function PriceAlertModal({ ticker, onClose }: { ticker: string; onClose: () => void }) {
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) return;
    const alerts = getAlerts();
    alerts.push({ ticker, targetPrice: price, condition, createdAt: Date.now() });
    saveAlerts(alerts);
    setSaved(true);
    setTimeout(onClose, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1c2128] border border-[#30363d] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Bell size={18} className="text-[#C9A84C]" /> Alerte prix — {ticker}
          </h3>
          <button onClick={onClose} className="text-[#8b949e] hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[#8b949e] text-sm block mb-1">Condition</label>
            <select
              value={condition}
              onChange={e => setCondition(e.target.value as "above" | "below")}
              className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] rounded-lg px-3 py-2 text-sm"
            >
              <option value="above">Au-dessus de</option>
              <option value="below">En-dessous de</option>
            </select>
          </div>
          <div>
            <label className="text-[#8b949e] text-sm block mb-1">Prix cible ($)</label>
            <input
              type="number"
              value={targetPrice}
              onChange={e => setTargetPrice(e.target.value)}
              placeholder="ex: 180.00"
              className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleSave}
            className="w-full py-2.5 bg-[#C9A84C] hover:bg-[#b8943d] text-[#0d1117] font-bold rounded-lg transition-all"
          >
            {saved ? "✓ Alerte créée !" : "Créer l'alerte"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Toast notification component
export function AlertToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="animate-slide-in-right flex items-center gap-3 bg-[#1c2128] border border-[#C9A84C]/40 text-[#e6edf3] px-4 py-3 rounded-xl shadow-xl max-w-sm">
      <Bell size={16} className="text-[#C9A84C] shrink-0" />
      <span className="text-sm">{message}</span>
      <button onClick={onDismiss} className="ml-auto text-[#8b949e] hover:text-white"><X size={14} /></button>
    </div>
  );
}

// Hook for checking alerts
export function usePriceAlerts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const checkAlerts = useCallback(async () => {
    const alerts = getAlerts();
    if (alerts.length === 0) return;
    const triggered: Toast[] = [];
    for (const alert of alerts) {
      try {
        const res = await fetch(`/api/search/${encodeURIComponent(alert.ticker)}`);
        if (!res.ok) continue;
        const data = await res.json();
        const price = data.price;
        const hit = alert.condition === "above" ? price >= alert.targetPrice : price <= alert.targetPrice;
        if (hit) {
          triggered.push({
            id: Date.now() + Math.random(),
            message: `🔔 ${alert.ticker} est à $${price.toFixed(2)} — votre alerte (${alert.condition === "above" ? ">" : "<"} $${alert.targetPrice}) est déclenchée !`,
          });
        }
      } catch { /* skip */ }
    }
    if (triggered.length > 0) setToasts(t => [...t, ...triggered]);
  }, []);

  useEffect(() => {
    checkAlerts();
    const interval = setInterval(checkAlerts, 5 * 60 * 1000); // every 5 min
    return () => clearInterval(interval);
  }, [checkAlerts]);

  const dismiss = (id: number) => setToasts(t => t.filter(x => x.id !== id));

  return { toasts, dismiss };
}
