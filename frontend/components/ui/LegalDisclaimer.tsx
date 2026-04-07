"use client";

import { AlertTriangle, Scale } from "lucide-react";

interface Props {
  variant?: "full" | "compact";
  className?: string;
}

export default function LegalDisclaimer({ variant = "compact", className = "" }: Props) {
  if (variant === "compact") {
    return (
      <div
        className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs leading-relaxed ${className}`}
        style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.15)", color: "var(--text-secondary)" }}
        role="note"
        aria-label="Avertissement légal"
      >
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: "rgb(234,179,8)" }} />
        <span>
          <strong style={{ color: "var(--text-primary)" }}>Outil éducatif uniquement.</strong>{" "}
          Les informations fournies ne constituent pas un conseil en investissement au sens de la directive MIF II.
          ValuEngine n&apos;est pas enregistré auprès de l&apos;AMF.
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl p-5 space-y-3 ${className}`}
      style={{ background: "rgba(234,179,8,0.04)", border: "1px solid rgba(234,179,8,0.12)" }}
      role="note"
      aria-label="Avertissement réglementaire"
    >
      <div className="flex items-center gap-2">
        <Scale size={16} style={{ color: "rgb(234,179,8)" }} />
        <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>Avertissement réglementaire</p>
      </div>
      <div className="text-xs leading-relaxed space-y-2" style={{ color: "var(--text-secondary)" }}>
        <p>
          ValuEngine est un <strong style={{ color: "var(--text-primary)" }}>outil d&apos;analyse éducatif</strong>.
          Les informations, analyses et valorisations présentées ne constituent en aucun cas un conseil en investissement,
          une recommandation d&apos;achat ou de vente, ni une sollicitation au sens de la directive MIF II (2014/65/UE).
        </p>
        <p>
          ValuEngine n&apos;est pas enregistré en tant que conseiller en investissements financiers (CIF) auprès de l&apos;AMF
          et ne dispose d&apos;aucun agrément de l&apos;Autorité des Marchés Financiers.
        </p>
        <p>
          Les performances passées ne préjugent pas des performances futures.
          Tout investissement comporte un risque de perte en capital.
          Consultez un conseiller financier agréé avant toute décision d&apos;investissement.
        </p>
      </div>
    </div>
  );
}
