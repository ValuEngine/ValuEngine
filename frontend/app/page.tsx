import Link from "next/link";
import { NavAuth } from "@/components/NavAuth";
import AnimatedBackground from "@/components/AnimatedBackground";
import { MockupVerdict, MockupBullBear, MockupSensitivity } from "@/components/MockupScreenshots";

/* ── Client Component islands ──────────────────────────────────────── */
import HeroSearch from "@/components/landing/HeroSearch";
import TickerTape from "@/components/landing/TickerTape";
import PricingSection from "@/components/landing/PricingSection";
import TrackRecordPreview from "@/components/landing/TrackRecordPreview";
import UserCountBadge from "@/components/landing/UserCountBadge";
import StickyAnalyzeCTA from "@/components/landing/StickyAnalyzeCTA";
import ReferralCapture from "@/components/landing/ReferralCapture";

/* ── Static data (SSR'd into HTML for SEO) ─────────────────────────── */

const FEATURES = [
  {
    title: "DCF Interactif",
    desc: "Ajuste les hypothèses en temps réel et observe la valeur intrinsèque évoluer instantanément.",
    pro: true,
  },
  {
    title: "IA Bull & Bear",
    desc: "Arguments haussiers et baissiers étayés sur les fondamentaux, générés par IA.",
    pro: true,
  },
  {
    title: "SWOT & PESTLE",
    desc: "Analyse stratégique et macro-économique complète, synthétisée par l\u2019IA.",
    pro: true,
  },
  {
    title: "Trading Comps",
    desc: "Comparaison automatique avec les principaux pairs sectoriels.",
    pro: true,
  },
  {
    title: "Track Record vérifié",
    desc: "Performance historique de nos verdicts, actualisée en temps réel.",
  },
  {
    title: "Matrice de sensibilité",
    desc: "Teste différents scénarios WACC / croissance et visualise l\u2019impact.",
    pro: true,
  },
];

const HOW_IT_WORKS = [
  { n: "01", title: "Cherche", desc: "Tape un ticker — Apple, LVMH, Tesla, Total..." },
  { n: "02", title: "Analyse", desc: "Notre moteur DCF + IA calcule la valeur intrinsèque en 60 secondes." },
  { n: "03", title: "Décide", desc: "Sous-évalué, juste valeur ou surévalué — avec les arguments pour et contre." },
];

const FAQ = [
  { q: "C\u2019est quoi un DCF ?", a: "Le DCF (Discounted Cash Flow) est la méthode de valorisation utilisée par les analystes professionnels. Elle estime la valeur d\u2019une entreprise en actualisant ses flux de trésorerie futurs. ValuEngine automatise ce calcul en quelques secondes." },
  { q: "Est-ce que les analyses sont fiables ?", a: "Nos analyses sont basées sur des données financières réelles (Financial Modeling Prep) et un modèle DCF standard. L\u2019IA ajoute une couche qualitative. Consulte notre Track Record pour juger par toi-même \u2014 nous publions toutes nos performances passées." },
  { q: "Quelles actions sont couvertes ?", a: "Toutes les actions cotées sur les bourses américaines (NYSE, NASDAQ) et européennes (Euronext Paris, Xetra, etc.). Plus de 50 000 tickers disponibles." },
  { q: "Pourquoi c\u2019est en français ?", a: "Parce qu\u2019aucun outil de valorisation sérieux n\u2019existait en français. Les investisseurs francophones méritent des outils de qualité professionnelle dans leur langue." },
  { q: "Est-ce un conseil en investissement ?", a: "Non. ValuEngine est un outil d\u2019analyse éducatif uniquement. Nos verdicts sont des estimations mathématiques, pas des recommandations au sens de la directive MIF II. Consulte un conseiller agréé avant d\u2019investir." },
  { q: "Je peux annuler mon abonnement Pro ?", a: "Oui, à tout moment. Pas d\u2019engagement, pas de frais cachés. Tu gardes l\u2019accès jusqu\u2019à la fin de ta période en cours." },
  { q: "Comment ValuEngine se compare à AlphaSpread ou Morningstar ?", a: "AlphaSpread et Morningstar sont en anglais et couvrent mal les actions françaises (CAC 40, SBF 120). ValuEngine est conçu spécifiquement pour les investisseurs francophones, avec un DCF calibré sur les valeurs françaises et européennes." },
  { q: "À quelle fréquence les données sont-elles mises à jour ?", a: "Les données financières (comptes de résultat, bilan, flux de trésorerie) proviennent de yfinance et sont mises à jour trimestriellement après chaque publication de résultats. Les prix sont actualisés en temps réel." },
  { q: "Mes données sont-elles en sécurité ?", a: "Oui. L\u2019authentification est gérée par Clerk, les paiements par Stripe, et les données sont hébergées en Union Européenne (Supabase). Aucune donnée personnelle n\u2019est revendue. Nous sommes conformes au RGPD." },
  { q: "Pourquoi 99\u20ac/an ?", a: "Une seule mauvaise décision d\u2019investissement peut coûter des milliers d\u2019euros. Si ValuEngine t\u2019aide à éviter un seul piège ou à identifier une opportunité, l\u2019abonnement est rentabilisé. C\u2019est aussi 10x moins cher que Morningstar Premium ou AlphaSpread Pro." },
  { q: "Comment se compare ValuEngine à Morningstar ou Simply Wall St ?", a: "ValuEngine est le seul outil DCF conçu pour les actions françaises et européennes, entièrement en français. Contrairement à Morningstar (199\u20ac/an) ou Simply Wall St (120\u20ac/an), nous offrons un modèle DCF interactif avec hypothèses modifiables, pas juste une note figée." },
];

/* ── Page (Server Component — all text is SSR'd for SEO) ───────────── */

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden relative" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>

      {/* Schema.org structured data — SSR'd */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "ValuEngine",
        "description": "Outil de valorisation DCF et analyse boursière IA pour investisseurs francophones",
        "url": "https://valuengine.fr",
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "Web",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR", "description": "Plan gratuit — 3 analyses par jour" },
      })}} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": FAQ.map(f => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": { "@type": "Answer", "text": f.a },
        })),
      })}} />

      {/* Referral capture — client only, no SSR output */}
      <ReferralCapture />

      <AnimatedBackground />

      {/* ── LIVE TICKER TAPE ─────────────────────────────────────────── */}
      <div className="relative z-10 overflow-hidden py-2" style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center">
          <span className="flex-shrink-0 text-[10px] font-medium uppercase tracking-widest px-4" style={{ color: "var(--text-tertiary)" }}>Marchés</span>
          <TickerTape />
        </div>
      </div>

      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-[33px] left-0 right-0 z-50 backdrop-blur-xl" style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(10,10,15,0.85)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-base)", border: "1px solid rgba(108,92,231,0.4)" }}>
              <span className="font-black text-sm leading-none" style={{ color: "var(--accent-primary)" }}>V</span>
            </div>
            <span className="text-base font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>ValuEngine</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/track-record" className="text-sm transition-colors px-3 py-2 hidden sm:block" style={{ color: "var(--text-secondary)" }}>Track Record</Link>
            <Link href="/methodology" className="text-sm transition-colors px-3 py-2 hidden sm:block" style={{ color: "var(--text-secondary)" }}>Méthodologie</Link>
            <Link href="/analyze" className="text-sm transition-colors px-3 py-2" style={{ color: "var(--text-secondary)" }}>Analyser</Link>
            <NavAuth />
          </div>
        </div>
      </nav>

      {/* ── HERO (static text SSR'd + interactive search client-side) ─ */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-3xl mx-auto">

          <div className="inline-flex items-center gap-2 text-xs tracking-[0.2em] rounded-full px-4 py-1.5 mb-8" style={{ color: "var(--text-tertiary)", border: "1px solid var(--border-subtle)" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-success)" }} />
            1ER OUTIL DE VALORISATION DCF EN FRANÇAIS
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-center leading-[1.1] tracking-tight mb-4" style={{ color: "var(--text-primary)" }}>
            Prends de meilleures<br />décisions d&apos;investissement,{" "}
            <span style={{ background: "linear-gradient(135deg, var(--accent-primary), #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              plus vite
            </span>
          </h1>
          <p className="text-base sm:text-lg font-semibold text-center mb-6" style={{ color: "var(--text-secondary)" }}>
            Investis avec une thèse, pas une intuition.
          </p>

          <p className="text-base sm:text-lg md:text-xl font-medium text-center max-w-xl mx-auto mb-2" style={{ color: "var(--accent-primary)" }}>
            L&apos;analyse fondamentale que font les pros — en français, en 60 secondes.
          </p>
          <p className="text-sm sm:text-base text-center max-w-xl mx-auto mb-10" style={{ color: "var(--text-secondary)" }}>
            Valorisation DCF, arguments Bull &amp; Bear par IA, matrice de sensibilité — gratuit, sans carte bancaire.
          </p>

          {/* Client island: search bar + typewriter + autocomplete */}
          <HeroSearch />

          <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>✓ Gratuit · ✓ Sans carte bancaire · ✓ 3 analyses/jour</p>

          {/* Client island: user count badge */}
          <UserCountBadge />

        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" style={{ color: "var(--text-tertiary)" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>Comment ça marche</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Une analyse complète en 3 étapes.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ n, title, desc }) => (
              <div key={n} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
                  <span className="text-2xl font-black" style={{ color: "var(--accent-primary)" }}>{n}</span>
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-tertiary)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRACK RECORD (client island — only renders when data exists) */}
      <TrackRecordPreview />

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>Ce que tu obtiens</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              6 outils d&apos;analyse professionnels,<br /><span style={{ color: "var(--text-tertiary)" }}>accessibles en un clic.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="card-interactive relative p-6">
                {f.pro && (
                  <span className="absolute top-3 right-3 text-[10px] font-black tracking-wider px-2.5 py-0.5 rounded-full" style={{ background: "var(--accent-gold)", color: "var(--bg-base)" }}>PRO</span>
                )}
                <h3 className="text-sm font-bold mb-1.5" style={{ color: "var(--text-primary)" }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-center mt-6 max-w-xl mx-auto" style={{ color: "var(--text-tertiary)" }}>
            Ces analyses sont éducatives et ne constituent pas des conseils en investissement au sens de la directive MIF II.
          </p>
        </div>
      </section>

      {/* ── INTERFACE PREVIEW ───────────────────────────────────────── */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 overflow-hidden" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>Aperçu</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>Une analyse complète en un coup d&apos;œil</h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: "var(--text-tertiary)" }}>Verdict DCF, analyse IA Bull &amp; Bear, et matrice de sensibilité — tout ce dont tu as besoin pour prendre une décision éclairée.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="flex justify-center max-w-full overflow-hidden"><MockupVerdict /></div>
            <div className="flex justify-center max-w-full overflow-hidden"><MockupBullBear /></div>
            <div className="flex justify-center max-w-full overflow-hidden"><MockupSensitivity /></div>
          </div>
        </div>
      </section>

      {/* ── WHY VALUENGINE ─────────────────────────────────────────── */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>Pourquoi ValuEngine</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Ce qui nous différencie</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6 text-center">
              <h3 className="text-sm font-bold mb-2" style={{ color: "var(--text-primary)" }}>Transparence totale</h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>Nous publions notre Track Record en temps réel. Chaque verdict est vérifiable. Aucun autre outil ne fait ça.</p>
            </div>
            <div className="card p-6 text-center">
              <h3 className="text-sm font-bold mb-2" style={{ color: "var(--text-primary)" }}>60 secondes</h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>Une analyse DCF complète prend 2-3 heures sur Excel. ValuEngine la génère en moins d&apos;une minute.</p>
            </div>
            <div className="card p-6 text-center">
              <h3 className="text-sm font-bold mb-2" style={{ color: "var(--text-primary)" }}>100% en français</h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>Le seul outil de valorisation DCF + IA conçu pour les investisseurs francophones. Actions US et européennes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMMUNAUTÉ ──────────────────────────────────────────────── */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>Communauté</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4" style={{ color: "var(--text-primary)" }}>Rejoint par des investisseurs particuliers partout en France</h2>
          <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
            Parle-nous de ton expérience :{" "}
            <a href="mailto:contact@valuengine.fr" className="hover:underline" style={{ color: "var(--accent-primary)" }}>contact@valuengine.fr</a>
          </p>
          <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
            {[
              { href: "https://x.com/ValuEngine_", label: "@ValuEngine_" },
              { href: "https://valuengine.substack.com", label: "Substack" },
              { href: "https://reddit.com/r/vosfinances", label: "r/vosfinances" },
            ].map(({ href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all text-xs font-semibold"
                style={{ color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── POUR QUI ? ─────────────────────────────────────────────── */}
      <section className="relative z-10 py-16 sm:py-20 px-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="max-w-5xl mx-auto text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-black" style={{ color: "var(--text-primary)" }}>Pour qui ?</h2>
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>ValuEngine s&apos;adapte à ton niveau d&apos;expérience</p>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { emoji: "🎯", title: "Débutant curieux", desc: "Tu veux comprendre si une action est chère ou pas. ValuEngine t\u2019explique tout, sans jargon inutile." },
            { emoji: "📊", title: "Investisseur actif", desc: "Tu fais tes propres analyses. ValuEngine automatise le DCF, le SWOT et les comparables sectoriels en 60 secondes." },
            { emoji: "👥", title: "Club d\u2019investissement", desc: "Partagez des analyses professionnelles entre membres. Exportez en PDF, comparez vos thèses d\u2019investissement." },
          ].map(p => (
            <div key={p.title} className="card p-6 text-center">
              <div className="text-3xl mb-3">{p.emoji}</div>
              <h3 className="font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>{p.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING (client island for toggle + Stripe checkout) ───── */}
      <section id="pricing" className="relative z-10 py-16 sm:py-24 px-4 sm:px-6" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>Tarifs</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-6" style={{ color: "var(--text-primary)" }}>Simple. Transparent. Sans engagement.</h2>
          </div>
          <PricingSection />
        </div>
      </section>

      {/* ── FAQ (static HTML with <details> for SEO — no JS needed) ── */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>Questions fréquentes</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Tout ce que tu veux savoir</h2>
          </div>
          <div>
            {FAQ.map((item) => (
              <details key={item.q} className="group" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <summary className="w-full flex items-center justify-between py-5 text-left cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="text-sm font-semibold transition-colors group-open:text-[var(--accent-primary)]" style={{ color: "var(--text-primary)" }}>{item.q}</span>
                  <svg className="w-4 h-4 flex-shrink-0 ml-4 transition-transform duration-200 group-open:rotate-180" style={{ color: "var(--text-tertiary)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </summary>
                <p className="text-sm leading-relaxed pb-5" style={{ color: "var(--text-secondary)" }}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST SIGNALS ────────────────────────────────────────────── */}
      <section className="relative z-10 py-12 px-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-8 items-center">
          {[
            { label: "Données financières", sub: "Financial Modeling Prep" },
            { label: "Intelligence artificielle", sub: "Anthropic Claude" },
            { label: "Hébergement", sub: "UE · Vercel + Railway" },
            { label: "Authentification", sub: "Clerk · Conforme RGPD" },
          ].map(t => (
            <div key={t.label} className="text-center">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>{t.label}</p>
              <p className="text-sm font-medium mt-1" style={{ color: "var(--text-secondary)" }}>{t.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="relative z-10 py-6 sm:py-8 px-4 sm:px-6" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "var(--bg-base)", border: "1px solid rgba(108,92,231,0.3)" }}>
              <span className="font-black text-xs leading-none" style={{ color: "var(--accent-primary)" }}>V</span>
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>ValuEngine</span>
            <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>© 2026</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center text-xs" style={{ color: "var(--text-tertiary)" }}>
            <Link href="/legal" className="hover:text-white transition-colors">Mentions légales</Link>
            <span className="hidden sm:inline" style={{ color: "var(--border-subtle)" }}>·</span>
            <Link href="/about" className="hover:text-white transition-colors">À propos</Link>
            <span className="hidden sm:inline" style={{ color: "var(--border-subtle)" }}>·</span>
            <Link href="/methodology" className="hover:text-white transition-colors">Méthodologie</Link>
            <span className="hidden sm:inline" style={{ color: "var(--border-subtle)" }}>·</span>
            <a href="mailto:contact@valuengine.fr" className="hover:text-white transition-colors">Contact</a>
          </div>
          <p className="text-xs text-center max-w-sm" style={{ color: "var(--text-tertiary)" }}>
            Outil d&apos;analyse éducatif uniquement. Ne constitue pas un conseil en investissement au sens de la directive MIF II.
          </p>
        </div>
      </footer>

      {/* ── STICKY CTA (client island) ───────────────────────────────── */}
      <StickyAnalyzeCTA />

    </main>
  );
}
