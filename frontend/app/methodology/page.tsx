import AppLayout from "@/components/AppLayout";

export default function MethodologyPage() {
  return (
    <AppLayout>
      <div className="min-h-screen text-white px-6 py-10 md:px-16 max-w-4xl mx-auto">
        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
          Notre m&eacute;thodologie
        </h1>
        <div className="h-1 w-16 bg-[#C9A84C] rounded-full mb-10" />

        {/* Le modele DCF */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] mb-4">
            Le mod&egrave;le DCF que nous utilisons
          </h2>
          <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6 space-y-3">
            <p className="text-zinc-400 leading-relaxed text-sm">
              Le <strong className="text-white">DCF (Discounted Cash Flow)</strong> est une m&eacute;thode
              de valorisation qui estime la valeur intrins&egrave;que d&apos;une entreprise en actualisant
              ses flux de tr&eacute;sorerie futurs. L&apos;id&eacute;e est simple&nbsp;: un euro
              aujourd&apos;hui vaut plus qu&apos;un euro demain, car il peut &ecirc;tre investi et
              g&eacute;n&eacute;rer un rendement.
            </p>
            <p className="text-zinc-400 leading-relaxed text-sm">
              Nous projetons les <strong className="text-white">Free Cash Flows</strong> sur plusieurs
              ann&eacute;es, puis calculons une <strong className="text-white">valeur terminale</strong> via
              la formule de <strong className="text-white">Gordon-Shapiro</strong>, qui suppose une croissance
              perp&eacute;tuelle stable au-del&agrave; de la p&eacute;riode de projection.
            </p>
            <p className="text-zinc-400 leading-relaxed text-sm">
              L&apos;ensemble est actualis&eacute; au <strong className="text-white">WACC (co&ucirc;t moyen
              pond&eacute;r&eacute; du capital)</strong>, que nous calibrons entre{" "}
              <strong className="text-white">7&nbsp;% et 10&nbsp;%</strong> selon le secteur et le profil
              de risque de l&apos;entreprise.
            </p>
          </div>
        </section>

        {/* Nos sources de donnees */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] mb-4">
            Nos sources de donn&eacute;es
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6">
              <h3 className="text-white font-semibold mb-2">Financial Modeling Prep</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Donn&eacute;es fondamentales&nbsp;: comptes de r&eacute;sultat, bilans, flux de
                tr&eacute;sorerie et ratios financiers.
              </p>
            </div>
            <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6">
              <h3 className="text-white font-semibold mb-2">yfinance</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Prix en temps r&eacute;el et donn&eacute;es de march&eacute; (cours, indices, volumes).
              </p>
            </div>
            <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6">
              <h3 className="text-white font-semibold mb-2">Claude (Anthropic)</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Analyses qualitatives g&eacute;n&eacute;r&eacute;es par intelligence artificielle pour
                contextualiser les chiffres.
              </p>
            </div>
          </div>
        </section>

        {/* Comment interpreter le verdict */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] mb-4">
            Comment interpr&eacute;ter le verdict
          </h2>
          <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-block w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                <div>
                  <p className="text-white font-semibold text-sm">Sous-&eacute;valu&eacute;</p>
                  <p className="text-zinc-400 text-sm">
                    L&apos;upside du DCF est sup&eacute;rieur &agrave; <strong className="text-white">+15&nbsp;%</strong>.
                    Le march&eacute; semble sous-estimer la valeur de l&apos;entreprise.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-block w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />
                <div>
                  <p className="text-white font-semibold text-sm">Juste valeur</p>
                  <p className="text-zinc-400 text-sm">
                    L&apos;&eacute;cart se situe entre <strong className="text-white">-15&nbsp;%
                    et +15&nbsp;%</strong>. Le prix de march&eacute; refl&egrave;te approximativement
                    la valeur fondamentale.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-block w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                <div>
                  <p className="text-white font-semibold text-sm">Sur&eacute;valu&eacute;</p>
                  <p className="text-zinc-400 text-sm">
                    Le downside est sup&eacute;rieur &agrave; <strong className="text-white">-15&nbsp;%</strong>.
                    Le march&eacute; semble surestimer la valeur de l&apos;entreprise.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Les limites du modele */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] mb-4">
            Les limites du mod&egrave;le
          </h2>
          <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6 space-y-3">
            <p className="text-zinc-400 leading-relaxed text-sm">
              Le DCF est <strong className="text-white">sensible aux hypoth&egrave;ses de croissance</strong>.
              Deux analystes utilisant des taux de croissance diff&eacute;rents obtiendront des valorisations
              tr&egrave;s diff&eacute;rentes pour la m&ecirc;me entreprise.
            </p>
            <p className="text-zinc-400 leading-relaxed text-sm">
              ValuEngine est un <strong className="text-white">outil d&apos;aide &agrave; la
              d&eacute;cision</strong>, pas un oracle. Il fournit un cadre d&apos;analyse rigoureux,
              mais la d&eacute;cision finale d&apos;investissement reste toujours la t&ocirc;tre.
            </p>
          </div>
        </section>

        {/* Avertissement reglementaire */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] mb-4">
            Avertissement r&eacute;glementaire
          </h2>
          <div className="rounded-xl border-2 border-[#C9A84C]/40 bg-[#C9A84C]/5 p-6">
            <p className="text-[#C9A84C]/90 text-sm leading-relaxed">
              ValuEngine n&apos;est pas un conseiller en investissement au sens de la directive MIF&nbsp;II.
              Les analyses fournies sont des estimations math&eacute;matiques bas&eacute;es sur des
              donn&eacute;es publiques et des mod&egrave;les statistiques. Elles ne constituent en aucun
              cas une recommandation d&apos;achat, de vente ou de d&eacute;tention de titres financiers.
              Tout investissement comporte des risques, y compris la perte partielle ou totale du capital
              investi. Consultez un conseiller financier agr&eacute;&eacute; avant toute d&eacute;cision
              d&apos;investissement.
            </p>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
