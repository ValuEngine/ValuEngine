"use client";
import { usePriceAlerts, AlertToast } from "./PriceAlert";

export default function AlertsProvider() {
  const { toasts, dismiss } = usePriceAlerts();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(t => (
        <AlertToast key={t.id} message={t.message} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}
