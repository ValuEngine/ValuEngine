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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(0,0,0,0.75)] backdrop-blur-sm">
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a]">
          <div>
            <h2 className="text-lg font-black text-white">Importer mon portefeuille</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {step === "broker" && "Etape 1/4 — Choisis ton courtier"}
              {step === "upload" && "Etape 2/4 — Upload ton fichier CSV"}
              {step === "preview" && "Etape 3/4 — Verifie les positions detectees"}
              {step === "done" && "Etape 4/4 — Import termine !"}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
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
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    broker === b.id
                      ? "border-[#C9A84C] bg-[rgba(201,168,76,0.08)]"
                      : "border-[#27272a] hover:border-[#3f3f46]"
                  }`}
                >
                  <p className={`text-sm font-semibold ${broker === b.id ? "text-[#C9A84C]" : "text-white"}`}>
                    {b.label}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">{b.desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: File upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#27272a] hover:border-[#C9A84C]/50 rounded-2xl p-10 text-center cursor-pointer transition-colors"
              >
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText size={24} className="text-[#C9A84C]" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white">{file.name}</p>
                      <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} Ko</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="text-zinc-500 mx-auto mb-3" />
                    <p className="text-sm text-zinc-400">Clique ou glisse ton fichier CSV ici</p>
                    <p className="text-xs text-zinc-600 mt-1">Formats: .csv, .tsv, .txt — Max 5 Mo</p>
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

              <div className="bg-[#09090b]/60 border border-[#27272a] rounded-xl p-4">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Comment exporter depuis {BROKERS.find((b) => b.id === broker)?.label || "ton courtier"} ?
                </p>
                <p className="text-xs text-zinc-500">
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
                <div className="bg-[#09090b]/60 border border-[#27272a] rounded-xl px-4 py-3 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Courtier detecte</p>
                  <p className="text-sm font-semibold text-[#C9A84C] capitalize">{preview.broker_detected}</p>
                </div>
                <div className="bg-[#09090b]/60 border border-[#27272a] rounded-xl px-4 py-3 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Positions</p>
                  <p className="text-sm font-semibold text-white">{preview.positions.length} detectees</p>
                </div>
                <div className="bg-[#09090b]/60 border border-[#27272a] rounded-xl px-4 py-3 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total investi</p>
                  <p className="text-sm font-semibold text-white">
                    ${preview.summary.total_invested.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Positions table */}
              {preview.positions.length > 0 && (
                <div className="border border-[#27272a] rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#09090b]/60 border-b border-[#27272a]">
                        <th className="px-3 py-2 text-left">
                          <input
                            type="checkbox"
                            checked={selectedPositions.size === preview.positions.length}
                            onChange={toggleAll}
                            className="accent-[#C9A84C]"
                          />
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-zinc-500">Ticker</th>
                        <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-zinc-500">Nom</th>
                        <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-zinc-500">Qte</th>
                        <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-zinc-500">PRU</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.positions.map((pos, i) => (
                        <tr
                          key={i}
                          className="border-b border-[#27272a] last:border-0 hover:bg-[rgba(255,255,255,0.02)]"
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedPositions.has(i)}
                              onChange={() => togglePosition(i)}
                              className="accent-[#C9A84C]"
                            />
                          </td>
                          <td className="px-3 py-2 font-bold text-[#C9A84C]">{pos.ticker}</td>
                          <td className="px-3 py-2 text-zinc-300 truncate max-w-[200px]">{pos.name}</td>
                          <td className="px-3 py-2 text-right text-white">{pos.shares}</td>
                          <td className="px-3 py-2 text-right text-white">${pos.avg_price.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Errors */}
              {preview.errors.length > 0 && (
                <div className="bg-[#ff4d6d]/5 border border-[#ff4d6d]/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-[#ff4d6d]" />
                    <p className="text-xs font-bold text-[#ff4d6d] uppercase tracking-wider">
                      {preview.errors.length} ligne(s) ignoree(s)
                    </p>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {preview.errors.map((err, i) => (
                      <p key={i} className="text-xs text-zinc-500">
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
              <div className="w-16 h-16 rounded-full bg-[#00d4aa]/10 border border-[#00d4aa]/30 flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-[#00d4aa]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Import termine !</h3>
              <p className="text-sm text-zinc-400 mb-6">
                {confirmResult.summary.total_imported} position(s) importee(s)
                {confirmResult.summary.total_skipped > 0 && `, ${confirmResult.summary.total_skipped} ignoree(s) (deja existantes)`}
              </p>

              {confirmResult.errors.length > 0 && (
                <div className="bg-[#ff4d6d]/5 border border-[#ff4d6d]/20 rounded-xl p-4 mb-4 text-left">
                  <p className="text-xs font-bold text-[#ff4d6d] uppercase tracking-wider mb-2">Erreurs</p>
                  {confirmResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-zinc-500">
                      {err.ticker}: {err.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="bg-[#ff4d6d]/10 border border-[#ff4d6d]/30 rounded-xl p-3 mt-4">
              <p className="text-[#ff4d6d] text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#27272a] flex justify-between">
          {step !== "broker" && step !== "done" && (
            <button
              onClick={() => setStep(step === "preview" ? "upload" : "broker")}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
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
                className="bg-[#C9A84C] text-black font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-[#e8c55a] transition-colors"
              >
                Continuer
              </button>
            )}
            {step === "upload" && (
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className="bg-[#C9A84C] text-black font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-[#e8c55a] transition-colors disabled:opacity-50 flex items-center gap-2"
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
                className="bg-[#C9A84C] text-black font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-[#e8c55a] transition-colors disabled:opacity-50 flex items-center gap-2"
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
                className="bg-[#C9A84C] text-black font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-[#e8c55a] transition-colors"
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
