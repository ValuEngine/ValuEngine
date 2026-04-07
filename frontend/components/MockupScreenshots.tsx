"use client";

/* ── Mockup 1: Verdict DCF Card ──────────────────────────────────────── */

export function MockupVerdict() {
  return (
    <div className="bg-[#132032]/90 border border-[rgba(108,92,231,0.18)] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-widest text-zinc-500 mb-1">Verdict DCF</p>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-white">LVMH</span>
            <span className="text-sm text-zinc-400">MC.PA</span>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
          style={{
            background: "rgba(var(--color-success-rgb,63,185,80),0.1)",
            color: "var(--color-success)",
            borderColor: "rgba(var(--color-success-rgb,63,185,80),0.2)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-success)" }} />
          Sous-évalué
        </span>
      </div>

      {/* Price vs Intrinsic */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-wider text-zinc-500 mb-1">Prix actuel</p>
          <p className="text-lg font-black text-white">583,40€</p>
        </div>
        <div>
          <p className="text-[13px] font-medium uppercase tracking-wider text-zinc-500 mb-1">Valeur intrinsèque</p>
          <p className="text-lg font-black" style={{ color: "var(--color-success)" }}>742,80€</p>
        </div>
      </div>

      {/* Upside bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] font-medium uppercase tracking-wider text-zinc-500">Upside potentiel</span>
          <span className="text-sm font-black" style={{ color: "var(--color-success)" }}>+27,3%</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: "27%", background: "linear-gradient(to right, var(--color-success), var(--color-success))" }}
          />
        </div>
      </div>

      {/* Mini metrics */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-zinc-800/50">
        {[
          { label: "P/E", value: "24.1x" },
          { label: "EV/EBITDA", value: "15.8x" },
          { label: "Marge", value: "19.2%" },
        ].map((m) => (
          <div key={m.label} className="text-center">
            <p className="text-[13px] font-medium text-zinc-600">{m.label}</p>
            <p className="text-xs font-bold text-zinc-300">{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Mockup 2: Bull/Bear IA Analysis ─────────────────────────────────── */

export function MockupBullBear() {
  return (
    <div className="bg-[#132032]/90 border border-[rgba(108,92,231,0.18)] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
      <p className="text-[13px] font-medium uppercase tracking-widest text-zinc-500 mb-4">Analyse IA Bull & Bear</p>

      {/* Bull Case */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(var(--color-success-rgb,63,185,80),0.1)" }}>
            <span className="text-xs" style={{ color: "var(--color-success)" }}>▲</span>
          </div>
          <span className="text-xs font-bold" style={{ color: "var(--color-success)" }}>Bull Case</span>
        </div>
        <div className="space-y-1.5 ml-8">
          {[
            "Leader mondial du luxe avec pricing power exceptionnel (+8% CA/an)",
            "Expansion Asie-Pacifique en forte reprise post-Covid",
            "Marge opérationnelle stable >25% malgré l'inflation",
          ].map((p, i) => (
            <p key={i} className="text-[11px] text-zinc-400 leading-relaxed flex items-start gap-2">
              <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: "rgba(var(--color-success-rgb,63,185,80),0.6)" }} />
              {p}
            </p>
          ))}
        </div>
      </div>

      {/* Bear Case */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(var(--color-danger-rgb,248,81,73),0.1)" }}>
            <span className="text-xs" style={{ color: "var(--color-danger)" }}>▼</span>
          </div>
          <span className="text-xs font-bold" style={{ color: "var(--color-danger)" }}>Bear Case</span>
        </div>
        <div className="space-y-1.5 ml-8">
          {[
            "Dépendance Chine (30% CA) — risque géopolitique élevé",
            "Multiples de valorisation tendus (P/E >24x)",
            "Risque de ralentissement du marché du luxe en Europe",
          ].map((p, i) => (
            <p key={i} className="text-[11px] text-zinc-400 leading-relaxed flex items-start gap-2">
              <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: "rgba(var(--color-danger-rgb,248,81,73),0.6)" }} />
              {p}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Mockup 3: Sensitivity Matrix ────────────────────────────────────── */

export function MockupSensitivity() {
  const waccValues = ["8%", "9%", "10%", "11%", "12%"];
  const growthValues = ["4%", "6%", "8%", "10%", "12%"];
  const matrix = [
    [892, 821, 761, 709, 664],
    [798, 742, 694, 652, 615],
    [724, 678, 638, 603, 572],
    [664, 626, 593, 563, 537],
    [614, 583, 555, 530, 508],
  ];
  const currentPrice = 583;

  return (
    <div className="bg-[#132032]/90 border border-[rgba(108,92,231,0.18)] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
      <p className="text-[13px] font-medium uppercase tracking-widest text-zinc-500 mb-1">Matrice de sensibilité</p>
      <p className="text-[13px] font-medium text-zinc-600 mb-4">Valeur intrinsèque selon WACC × Croissance</p>

      <div className="overflow-hidden rounded-lg">
        <table className="w-full text-[10px]">
          <thead>
            <tr>
              <th className="px-1.5 py-1.5 text-zinc-600 bg-zinc-900/50 text-left">WACC↓ / g→</th>
              {growthValues.map((g) => (
                <th key={g} className="px-1.5 py-1.5 font-bold bg-zinc-900/50 text-center" style={{ color: "var(--accent-primary)" }}>{g}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {waccValues.map((w, wi) => (
              <tr key={w}>
                <td className="px-1.5 py-1.5 font-bold bg-zinc-900/30" style={{ color: "var(--accent-primary)" }}>{w}</td>
                {matrix[wi].map((val, gi) => {
                  const diff = ((val - currentPrice) / currentPrice) * 100;
                  const style = diff > 10
                    ? { background: "rgba(var(--color-success-rgb,63,185,80),0.15)", color: "var(--color-success)" }
                    : diff < -10
                    ? { background: "rgba(var(--color-danger-rgb,248,81,73),0.15)", color: "var(--color-danger)" }
                    : { background: "rgba(234,179,8,0.1)", color: "rgb(234,179,8)" };
                  return (
                    <td key={gi} className="px-1.5 py-1.5 text-center font-bold" style={style}>
                      {val}€
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 mt-3 text-[9px] text-zinc-600">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: "rgba(var(--color-success-rgb,63,185,80),0.2)" }} /> Sous-évalué</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-500/15" /> Juste valeur</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: "rgba(var(--color-danger-rgb,248,81,73),0.2)" }} /> Surévalué</span>
      </div>
    </div>
  );
}
