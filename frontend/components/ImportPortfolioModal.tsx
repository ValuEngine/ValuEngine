"use client";

import { useState, useRef } from "react";
import { X, Upload, Loader2, Check, AlertTriangle, FileText } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { authedFetch } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const BROKERS = [
  { id: "auto", label: "Detection automatique", desc: "On detecte ton courtier" },
  { id: "boursorama", label: "Boursorama", desc: "PEA / CTO Boursorama Banque" },
  { id: "degiro", label: "Degiro", desc: "Export CSV Degiro" },
  { id: "trade_republic", label: "Trade Republic", desc: "Export depuis l'app" },
  { id: "interactive_brokers", label: "Interactive Brokers", desc: "Activity Statement CSV" },
];

interface ImportPosition {
  ticker: string;
  name: string;
  shares: number;
  avg_price: number;
  isin?: string;
}

interface ImportError {
  row: number;
  reason: string;
  raw_data: string;
}

interface PreviewResult {
  broker_detected: string;
  positions: ImportPosition[];
  errors: ImportError[];
  summary: {
    total_positions: number;
    positions_imported: number;
    positions_failed: number;
    total_invested: number;
  };
}

interface ConfirmResult {
  imported: string[];
  skipped: { ticker: string; reason: string }[];
  errors: { ticker: string; reason: string }[];
  summary: {
    total_imported: number;
    total_skipped: number;
    total_errors: number;
  };
}

type Step = "broker" | "upload" | "preview" | "done";

export default function ImportPortfolioModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const { getToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("broker");
  const [broker, setBroker] = useState("auto");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null);
  const [selectedPositions, setSelectedPositions] = useState<Set<number>>(new Set());

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError("Fichier trop volumineux (max 5 Mo)");
      return;
    }
    setFile(f);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("broker", broker);

      const token = await getToken();
      const resp = await fetch(`${API_BASE}/api/portfolio/import`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.detail || "Erreur lors de l'upload");
      }

      const result: PreviewResult = await resp.json();
      setPreview(result);
      // Select all valid positions by default
      setSelectedPositions(new Set(result.positions.map((_, i) => i)));
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);

    const positionsToImport = preview.positions.filter((_, i) => selectedPositions.has(i));

    try {
      const resp = await authedFetch(`${API_BASE}/api/portfolio/import/confirm`, getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions: positionsToImport }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.detail || "Erreur lors de la confirmation");
      }

      const result: ConfirmResult = await resp.json();
      setConfirmResult(result);
      setStep("done");
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const togglePosition = (idx: number) => {
    setSelectedPositions((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (!preview) return;
    if (selectedPositions.size === preview.positions.length) {
      setSelectedPositions(new Set());
    } else {
      setSelectedPositions(new Set(preview.positions.map((_, i) => i)));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div
        className="rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col border"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border-default)" }}>
          <div>
            <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>Importer mon portefeuille</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              {step === "broker" && "Etape 1/4 — Choisis ton courtier"}
              {step === "upload" && "Etape 2/4 — Upload ton fichier CSV"}
              {step === "preview" && "Etape 3/4 — Verifie les positions detectees"}
              {step === "done" && "Etape 4/4 — Import termine !"}
            </p>
          </div>
          <button onClick={onClose} className="transition-colors" style={{ color: "var(--text-tertiary)" }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Step 1: Broker selection */}
          {step === "broker" && (
            <div className="space-y-3">
              {BROKERS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBroker(b.id)}
                  className="w-full text-left px-4 py-3 rounded-xl border transition-all"
                  style={{
                    borderColor: broker === b.id ? "var(--accent-primary)" : "var(--border-default)",
                    background: broker === b.id ? "rgba(99,102,241,0.08)" : "transparent",
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: broker === b.id ? "var(--accent-primary)" : "var(--text-primary)" }}>
                    {b.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{b.desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: File upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors"
                style={{ borderColor: "var(--border-default)" }}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText size={24} style={{ color: "var(--accent-primary)" }} />
                    <div className="text-left">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{file.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{(file.size / 1024).toFixed(1)} Ko</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="mx-auto mb-3" style={{ color: "var(--text-tertiary)" }} />
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Clique ou glisse ton fichier CSV ici</p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Formats: .csv, .tsv, .txt — Max 5 Mo</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div
                className="rounded-xl p-4 border"
                style={{ background: "var(--bg-base)", borderColor: "var(--border-default)" }}
              >
                <p className="text-[13px] font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                  Comment exporter depuis {BROKERS.find((b) => b.id === broker)?.label || "ton courtier"} ?
                </p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {broker === "boursorama" && "Portefeuille → Exporter en CSV. Le fichier utilise des points-virgules et l'encodage Latin-1."}
                  {broker === "degiro" && "Activity → Export → CSV. Le fichier utilise des virgules et l'encodage UTF-8."}
                  {broker === "trade_republic" && "Profil → Activity → Export. Exporte en CSV."}
                  {broker === "interactive_brokers" && "Reports → Activity Statements → CSV. Choisis 'Portfolio' dans les sections."}
                  {(broker === "auto" || broker === "generic") && "Exporte ton portefeuille en CSV depuis ton courtier. On detecte automatiquement le format."}
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && preview && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-4">
                <div
                  className="rounded-xl px-4 py-3 flex-1 border"
                  style={{ background: "var(--bg-base)", borderColor: "var(--border-default)" }}
                >
                  <p className="text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Courtier detecte</p>
                  <p className="text-sm font-semibold capitalize" style={{ color: "var(--accent-primary)" }}>{preview.broker_detected}</p>
                </div>
                <div
                  className="rounded-xl px-4 py-3 flex-1 border"
                  style={{ background: "var(--bg-base)", borderColor: "var(--border-default)" }}
                >
                  <p className="text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Positions</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{preview.positions.length} detectees</p>
                </div>
                <div
                  className="rounded-xl px-4 py-3 flex-1 border"
                  style={{ background: "var(--bg-base)", borderColor: "var(--border-default)" }}
                >
                  <p className="text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Total investi</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    ${preview.summary.total_invested.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Positions table */}
              {preview.positions.length > 0 && (
                <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--border-default)" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ background: "var(--bg-base)", borderColor: "var(--border-default)" }}>
                        <th className="px-3 py-2 text-left">
                          <input
                            type="checkbox"
                            checked={selectedPositions.size === preview.positions.length}
                            onChange={toggleAll}
                            className="accent-[#6366f1]"
                          />
                        </th>
                        <th className="px-3 py-2 text-left text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Ticker</th>
                        <th className="px-3 py-2 text-left text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Nom</th>
                        <th className="px-3 py-2 text-right text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Qte</th>
                        <th className="px-3 py-2 text-right text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>PRU</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.positions.map((pos, i) => (
                        <tr
                          key={i}
                          className="border-b last:border-0 hover:bg-[rgba(255,255,255,0.02)]"
                          style={{ borderColor: "var(--border-default)" }}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedPositions.has(i)}
                              onChange={() => togglePosition(i)}
                              className="accent-[#6366f1]"
                            />
                          </td>
                          <td className="px-3 py-2 font-bold" style={{ color: "var(--accent-primary)" }}>{pos.ticker}</td>
                          <td className="px-3 py-2 truncate max-w-[200px]" style={{ color: "var(--text-secondary)" }}>{pos.name}</td>
                          <td className="px-3 py-2 text-right" style={{ color: "var(--text-primary)" }}>{pos.shares}</td>
                          <td className="px-3 py-2 text-right" style={{ color: "var(--text-primary)" }}>${pos.avg_price.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Errors */}
              {preview.errors.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: "rgba(248,81,73,0.05)", border: "1px solid rgba(248,81,73,0.2)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} style={{ color: "var(--color-danger)" }} />
                    <p className="text-[13px] font-medium" style={{ color: "var(--color-danger)" }}>
                      {preview.errors.length} ligne(s) ignoree(s)
                    </p>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {preview.errors.map((err, i) => (
                      <p key={i} className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        Ligne {err.row}: {err.reason}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Done */}
          {step === "done" && confirmResult && (
            <div className="text-center py-8">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border"
                style={{ background: "rgba(63,185,80,0.1)", borderColor: "rgba(63,185,80,0.3)" }}
              >
                <Check size={32} style={{ color: "var(--color-success)" }} />
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Import termine !</h3>
              <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                {confirmResult.summary.total_imported} position(s) importee(s)
                {confirmResult.summary.total_skipped > 0 && `, ${confirmResult.summary.total_skipped} ignoree(s) (deja existantes)`}
              </p>

              {confirmResult.errors.length > 0 && (
                <div className="rounded-xl p-4 mb-4 text-left" style={{ background: "rgba(248,81,73,0.05)", border: "1px solid rgba(248,81,73,0.2)" }}>
                  <p className="text-[13px] font-medium mb-2" style={{ color: "var(--color-danger)" }}>Erreurs</p>
                  {confirmResult.errors.map((err, i) => (
                    <p key={i} className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {err.ticker}: {err.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="rounded-xl p-3 mt-4" style={{ background: "rgba(248,81,73,0.1)", border: "1px solid rgba(248,81,73,0.3)" }}>
              <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-between" style={{ borderColor: "var(--border-default)" }}>
          {step !== "broker" && step !== "done" && (
            <button
              onClick={() => setStep(step === "preview" ? "upload" : "broker")}
              className="text-sm transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              Retour
            </button>
          )}
          {step === "broker" && <div />}
          {step === "done" && <div />}

          <div className="flex gap-3">
            {step === "broker" && (
              <button
                onClick={() => setStep("upload")}
                className="font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
                style={{ background: "var(--accent-primary)", color: "#fff" }}
              >
                Continuer
              </button>
            )}
            {step === "upload" && (
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className="font-bold px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                style={{ background: "var(--accent-primary)", color: "#fff" }}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Analyse...
                  </>
                ) : (
                  "Analyser le fichier"
                )}
              </button>
            )}
            {step === "preview" && (
              <button
                onClick={handleConfirm}
                disabled={selectedPositions.size === 0 || loading}
                className="font-bold px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                style={{ background: "var(--accent-primary)", color: "#fff" }}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Import...
                  </>
                ) : (
                  `Importer ${selectedPositions.size} position(s)`
                )}
              </button>
            )}
            {step === "done" && (
              <button
                onClick={onClose}
                className="font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
                style={{ background: "var(--accent-primary)", color: "#fff" }}
              >
                Fermer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
