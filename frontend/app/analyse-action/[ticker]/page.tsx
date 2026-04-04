import { Metadata } from "next";
import Link from "next/link";

export const revalidate = 3600; // ISR — revalidate every hour

const SEO_TICKERS = [
  "MC.PA", "TTE.PA", "BNP.PA", "AIR.PA", "OR.PA", "SAN.PA", "SU.PA", "DG.PA",
  "AAPL", "MSFT", "NVDA", "TSLA", "GOOGL", "AMZN", "META", "ASML.AS", "SAP.DE",
  "NESN", "LVMH", "JPM", "V", "JNJ", "NOVO-B.CO",
];

interface CompanyProfile {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  description: string;
  price: number;
  market_cap: number;
  pe_ratio: number | null;
  country: string;
  exchange: string;
  currency: string;
  image?: string;
}

async function getProfile(ticker: string): Promise<CompanyProfile | null> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
  if (!API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}/api/profile/${ticker}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function fmt(n: number): string {
  if (!n) return "N/A";
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)} T$`;
  if (n >= 1e9)  return `${(n / 1e9).toFixed(1)} Md$`;
  if (n >= 1e6)  return `${(n / 1e6).toFixed(1)} M$`;
  return n.toLocaleString();
}

export function generateStaticParams() {
  return SEO_TICKERS.map((ticker) => ({ ticker }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ ticker: string }> }
): Promise<Metadata> {
  const { ticker } = await params;
  const t = ticker.toUpperCase();
  const profile = await getProfile(t);
  const name    = profile?.name   || t;
  const sector  = profile?.sector || "Bourse";
  const pe      = profile?.pe_ratio ? profile.pe_ratio.toFixed(1) : "N/A";

  const title = `Analyse ${t} (${name}) — Valorisation DCF et verdict IA | ValuEngine`;
  const description = `Analyse financière de ${name} (${t}). Valorisation DCF, métriques clés (P/E : ${pe}, Market Cap : ${fmt(profile?.market_cap || 0)}), secteur ${sector}. Verdict IA et potentiel d'investissement.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://valuengine.fr/analyse-action/${t}`,
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function TickerSEOPage(
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const t       = ticker.toUpperCase();
  const profile = await getProfile(t);

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    "name": `Analyse ${profile?.name || t}`,
    "description": `Analyse financière DCF et verdict IA de ${profile?.name || t} (${t}) par ValuEngine.`,
    "provider": {
      "@type": "Organization",
      "name": "ValuEngine",
      "url": "https://valuengine.fr",
    },
    "url": `https://valuengine.fr/analyse-action/${t}`,
    ...(profile && {
      "additionalProperty": [
        { "@type": "PropertyValue", "name": "Prix", "value": profile.price?.toFixed(2) || "N/A" },
        { "@type": "PropertyValue", "name": "P/E Ratio", "value": profile.pe_ratio?.toFixed(1) || "N/A" },
        { "@type": "PropertyValue", "name": "Secteur", "value": profile.sector || "N/A" },
      ],
    }),
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-white">

      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />

      {/* Header */}
      <header className="border-b border-[#27272a] bg-[#09090b]/95 sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#09090b] border border-[rgba(201,168,76,0.3)] flex items-center justify-center">
              <span className="text-[#C9A84C] font-black text-sm leading-none">V</span>
            </div>
            <span className="text-base font-bold tracking-tight">ValuEngine</span>
          </Link>
          <Link
            href={`/analyze?ticker=${t}`}
            className="text-sm bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold px-4 py-2 rounded-lg transition-colors"
          >
            Analyser →
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Breadcrumb */}
        <nav className="text-xs text-zinc-600 mb-8 flex items-center gap-2 flex-wrap">
          <Link href="/" className="hover:text-zinc-400 transition-colors">Accueil</Link>
          <span>/</span>
          <span className="text-zinc-500">Analyse action</span>
          <span>/</span>
          <span className="text-zinc-300 font-semibold">{t}</span>
        </nav>

        {profile ? (
          <>
            {/* Company header */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                {profile.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.image} alt={profile.name} className="w-10 h-10 rounded-xl object-contain bg-white p-1" />
                )}
                <h1 className="text-2xl sm:text-3xl font-black">{profile.name}</h1>
                <span className="text-xl text-zinc-500 font-mono">{t}</span>
                {profile.sector && (
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C9A84C] bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.25)] px-3 py-1 rounded-full">
                    {profile.sector}
                  </span>
                )}
              </div>
              {profile.industry && (
                <p className="text-zinc-500 text-sm mt-1">
                  {profile.industry}
                  {profile.exchange && ` · ${profile.exchange}`}
                  {profile.country  && ` · ${profile.country}`}
                </p>
              )}
            </div>

            {/* Key metrics */}
            <section aria-label="Métriques clés" className="mb-10">
              <h2 className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-4">Métriques clés</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Prix actuel",  value: profile.price ? `${profile.price.toFixed(2)} ${profile.currency}` : "N/A" },
                  { label: "Market Cap",   value: fmt(profile.market_cap) },
                  { label: "P/E Ratio",    value: profile.pe_ratio ? `${profile.pe_ratio.toFixed(1)}x` : "N/A" },
                  { label: "Secteur",      value: profile.sector || "N/A" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 hover:border-[#3f3f46] transition-colors">
                    <p className="text-[10px] font-bold uppercase tracking-[1.6px] text-zinc-500 mb-2">{label}</p>
                    <p className="text-lg font-bold text-white leading-tight">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Description */}
            {profile.description && (
              <section aria-label="À propos" className="mb-10">
                <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6">
                  <h2 className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-4">À propos de {profile.name}</h2>
                  <p className="text-zinc-400 text-sm leading-relaxed">{profile.description}</p>
                </div>
              </section>
            )}

            {/* Disclaimer */}
            <p className="text-zinc-700 text-xs mb-8">
              Les données affichées sont issues de sources publiques (Financial Modeling Prep).
              Elles sont fournies à titre indicatif et ne constituent pas un conseil en investissement.
              Les métriques avancées (DCF, valeur intrinsèque, verdict IA) sont disponibles sur ValuEngine.
            </p>
          </>
        ) : (
          <div className="mb-10">
            <h1 className="text-2xl sm:text-3xl font-black mb-2">{t}</h1>
            <p className="text-zinc-500 mb-4">Données de marché non disponibles pour ce ticker.</p>
          </div>
        )}

        {/* CTA */}
        <div className="bg-[#18181b] border border-[rgba(201,168,76,0.3)] rounded-2xl p-8 text-center">
          <div className="inline-block text-xs tracking-[0.2em] text-zinc-500 border border-zinc-800 rounded-full px-4 py-1.5 mb-4">
            · DCF INTERACTIF · ANALYSE IA · SWOT · PESTLE ·
          </div>
          <h2 className="text-xl font-black mb-2">
            Voir l&apos;analyse complète de {profile?.name || t}
          </h2>
          <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
            Valorisation DCF interactive, analyse IA Bull/Bear, SWOT, PESTLE, matrice de sensibilité et verdict d&apos;investissement.
          </p>
          <Link
            href={`/analyze?ticker=${t}`}
            className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold px-6 sm:px-8 py-3 rounded-xl transition-all text-sm w-full sm:w-auto justify-center min-h-[44px]"
          >
            Voir l&apos;analyse complète →
          </Link>
        </div>

        {/* Contextual links */}
        <div className="mt-8 pt-6 border-t border-[#27272a] flex flex-wrap gap-4 text-xs text-zinc-600">
          <Link href="/" className="hover:text-zinc-400 transition-colors">Accueil ValuEngine</Link>
          <span>·</span>
          <Link href="/track-record" className="hover:text-zinc-400 transition-colors">Track Record IA</Link>
          <span>·</span>
          <Link href="/blog" className="hover:text-zinc-400 transition-colors">Blog investissement</Link>
          <span>·</span>
          <span>{t} — Analyse financière gratuite</span>
        </div>
      </div>
    </main>
  );
}
