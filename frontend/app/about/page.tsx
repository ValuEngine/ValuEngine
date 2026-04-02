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
              Cr&eacute;&eacute; par un investisseur particulier frustr&eacute; par les outils anglais complexes
              et les plateformes fran&ccedil;aises sans analyse fondamentale s&eacute;rieuse. ValuEngine est
              n&eacute; d&apos;un besoin simple&nbsp;: avoir acc&egrave;s &agrave; un DCF professionnel, en
              fran&ccedil;ais, sans passer par Bloomberg.
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
              D&eacute;mocratiser l&apos;analyse fondamentale pour les investisseurs particuliers francophones.
            </p>
          </div>
        </section>

        {/* L'equipe */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] mb-4">
            L&apos;&eacute;quipe
          </h2>
          <div className="flex flex-wrap gap-6">
            <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6 flex items-center gap-4 min-w-[240px]">
              <div className="w-12 h-12 rounded-full bg-[#C9A84C]/15 border border-[#C9A84C]/30 flex items-center justify-center text-[#C9A84C] font-bold text-lg">
                I
              </div>
              <div>
                <p className="text-white font-semibold">Ilias</p>
                <p className="text-zinc-500 text-sm">Fondateur</p>
              </div>
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
                On publie notre Track Record pour que tu puisses juger nos analyses.
              </p>
            </div>
            <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6">
              <h3 className="text-white font-semibold mb-2">P&eacute;dagogie</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                On explique chaque m&eacute;trique pour que tu comprennes, pas juste que tu suives.
              </p>
            </div>
            <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6">
              <h3 className="text-white font-semibold mb-2">Ind&eacute;pendance</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Aucun conflit d&apos;int&eacute;r&ecirc;t, aucun partenariat r&eacute;mun&eacute;r&eacute; avec
                les &eacute;metteurs analys&eacute;s.
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
            Lancer ta premi&egrave;re analyse &rarr;
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
