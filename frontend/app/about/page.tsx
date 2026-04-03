import AppLayout from "@/components/AppLayout";
import Link from "next/link";

export default function AboutPage() {
  return (
    <AppLayout>
      <div className="min-h-screen text-white px-6 py-10 md:px-16 max-w-4xl mx-auto">
        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
          Qui sommes-nous
        </h1>
        <div className="h-1 w-16 bg-[#C9A84C] rounded-full mb-10" />

        {/* Pourquoi ValuEngine existe */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] mb-4">
            Pourquoi ValuEngine existe
          </h2>
          <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6">
            <p className="text-zinc-400 leading-relaxed text-sm">
              Créé par un investisseur particulier frustré par les outils anglais complexes
              et les plateformes françaises sans analyse fondamentale sérieuse. ValuEngine est
              né d&apos;un besoin simple: avoir accès à un DCF professionnel, en
              français, sans passer par Bloomberg.
            </p>
          </div>
        </section>

        {/* Notre mission */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] mb-4">
            Notre mission
          </h2>
          <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6">
            <p className="text-zinc-400 leading-relaxed text-sm">
              Démocratiser l&apos;analyse fondamentale pour les investisseurs particuliers francophones.
            </p>
          </div>
        </section>

        {/* Fondateur */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] mb-4">
            Fondateur
          </h2>
          <div className="max-w-md">
            <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6 min-w-[280px] max-w-md">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-full bg-[#C9A84C]/15 border border-[#C9A84C]/30 flex items-center justify-center text-[#C9A84C] font-bold text-lg">
                  I
                </div>
                <div>
                  <p className="text-white font-semibold">Ilias</p>
                  <p className="text-zinc-500 text-sm">Fondateur</p>
                  <p className="text-[#C9A84C] text-xs">Ingénieur &amp; investisseur particulier</p>
                </div>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                Ingénieur passionné de finance quantitative et d&apos;IA. Après des années à investir avec des outils inadaptés, j&apos;ai créé ValuEngine pour
                démocratiser les outils d&apos;analyse réservés aux professionnels.
              </p>
              <a
                href="https://linkedin.com/in/ilias-moulouade"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#C9A84C]/40 text-[#C9A84C] text-xs font-medium hover:bg-[#C9A84C]/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                LinkedIn
              </a>
            </div>
          </div>
        </section>

        {/* Nos valeurs */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] mb-4">
            Nos valeurs
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6">
              <h3 className="text-white font-semibold mb-2">Transparence</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                On publie notre <Link href="/track-record" className="text-[#C9A84C] hover:underline">Track Record</Link> pour que tu puisses juger nos analyses.
              </p>
            </div>
            <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6">
              <h3 className="text-white font-semibold mb-2">Pédagogie</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                On explique chaque métrique pour que tu comprennes, pas juste que tu suives.
              </p>
            </div>
            <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6">
              <h3 className="text-white font-semibold mb-2">Indépendance</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#C9A84C] hover:bg-[#b8963f] text-black font-semibold text-sm transition-colors"
          >
            Lancer ta première analyse →
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
