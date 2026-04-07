import AppLayout from "@/components/AppLayout";
import Link from "next/link";

export default function AboutPage() {
  return (
    <AppLayout>
      <div className="min-h-screen text-white px-4 sm:px-6 md:px-16 py-8 sm:py-10 max-w-4xl mx-auto">
        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
          Qui sommes-nous
        </h1>
        <div className="h-1 w-16 rounded-full mb-10" style={{ background: "var(--accent-primary)" }} />

        {/* Pourquoi ValuEngine existe */}
        <section className="mb-10">
          <h2
            className="text-[13px] font-medium uppercase mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            Pourquoi ValuEngine existe
          </h2>
          <div
            className="rounded-xl backdrop-blur-sm p-6"
            style={{ background: "rgba(24,24,27,0.8)", border: "1px solid var(--border-default)" }}
          >
            <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
              Créé par un investisseur particulier frustré par les outils anglais complexes
              et les plateformes françaises sans analyse fondamentale sérieuse. ValuEngine est
              né d&apos;un besoin simple: avoir accès à un DCF professionnel, en
              français, sans passer par Bloomberg.
            </p>
          </div>
        </section>

        {/* Notre mission */}
        <section className="mb-10">
          <h2
            className="text-[13px] font-medium uppercase mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            Notre mission
          </h2>
          <div
            className="rounded-xl backdrop-blur-sm p-6"
            style={{ background: "rgba(24,24,27,0.8)", border: "1px solid var(--border-default)" }}
          >
            <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
              Démocratiser l&apos;analyse fondamentale pour les investisseurs particuliers francophones.
            </p>
          </div>
        </section>

        {/* Fondateur */}
        <section className="mb-10">
          <h2
            className="text-[13px] font-medium uppercase mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            Fondateur
          </h2>
          <div className="max-w-md">
            <div
              className="rounded-xl backdrop-blur-sm p-6 w-full max-w-md"
              style={{ background: "rgba(24,24,27,0.8)", border: "1px solid var(--border-default)" }}
            >
              <div className="flex items-center gap-4 mb-3">
                <img
                  src="/images/ilias.jpg"
                  alt="Ilias — Fondateur de ValuEngine"
                  className="w-12 h-12 rounded-full object-cover"
                  style={{ border: "2px solid rgba(108,92,231,0.3)" }}
                />
                <div>
                  <p className="text-white font-semibold">Ilias</p>
                  <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Fondateur</p>
                  <p className="text-xs" style={{ color: "var(--accent-primary)" }}>Ingénieur &amp; investisseur particulier</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
                Ingénieur passionné de finance quantitative et d&apos;IA. Après des années à investir avec des outils inadaptés, j&apos;ai créé ValuEngine pour
                démocratiser les outils d&apos;analyse réservés aux professionnels.
              </p>
              <a
                href="https://linkedin.com/in/ilias-moulouade"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{
                  border: "1px solid rgba(108,92,231,0.4)",
                  color: "var(--accent-primary)",
                }}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                LinkedIn
              </a>
            </div>
          </div>
        </section>

        {/* Nos valeurs */}
        <section className="mb-10">
          <h2
            className="text-[13px] font-medium uppercase mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            Nos valeurs
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div
              className="rounded-xl backdrop-blur-sm p-6"
              style={{ background: "rgba(24,24,27,0.8)", border: "1px solid var(--border-default)" }}
            >
              <h3 className="text-white font-semibold mb-2">Transparence</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                On publie notre <Link href="/track-record" className="hover:underline" style={{ color: "var(--accent-primary)" }}>Track Record</Link> pour que tu puisses juger nos analyses.
              </p>
            </div>
            <div
              className="rounded-xl backdrop-blur-sm p-6"
              style={{ background: "rgba(24,24,27,0.8)", border: "1px solid var(--border-default)" }}
            >
              <h3 className="text-white font-semibold mb-2">Pédagogie</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                On explique chaque métrique pour que tu comprennes, pas juste que tu suives.
              </p>
            </div>
            <div
              className="rounded-xl backdrop-blur-sm p-6"
              style={{ background: "rgba(24,24,27,0.8)", border: "1px solid var(--border-default)" }}
            >
              <h3 className="text-white font-semibold mb-2">Indépendance</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Aucun conflit d&apos;intérêt, aucun partenariat rémunéré avec
                les émetteurs analysés.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center mt-12 mb-4">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-colors"
            style={{ background: "var(--accent-primary)", color: "#000" }}
          >
            Lancer ta première analyse →
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
