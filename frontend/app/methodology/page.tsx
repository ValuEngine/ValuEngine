import AppLayout from "@/components/AppLayout";

export default function MethodologyPage() {
  return (
    <AppLayout>
      <div className="min-h-screen text-white px-6 py-10 md:px-16 max-w-4xl mx-auto">
        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
          Notre méthodologie
        </h1>
        <div className="h-1 w-16 bg-[#C9A84C] rounded-full mb-10" />

        {/* Le modele DCF */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] mb-4">
            Le modèle DCF que nous utilisons
          </h2>
          <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6 space-y-3">
            <p className="text-zinc-400 leading-relaxed text-sm">
              Le <strong className="text-white">DCF (Discounted Cash Flow)</strong> est une méthode
              de valorisation qui estime la valeur intrinsèque d&apos;une entreprise en actualisant
              ses flux de trésorerie futurs. L&apos;idée est simple: un euro
              aujourd&apos;hui vaut plus qu&apos;un euro demain, car il peut être investi et
              générer un rendement.
            </p>
            <p className="text-zinc-400 leading-relaxed text-sm">
              Nous projetons les <strong className="text-white">Free Cash Flows</strong> sur plusieurs
              années, puis calculons une <strong className="text-white">valeur terminale</strong> via
              la formule de <strong className="text-white">Gordon-Shapiro</strong>, qui suppose une croissance
              perpétuelle stable au-delà de la période de projection.
            </p>
            <p className="text-zinc-400 leading-relaxed text-sm">
              L&apos;ensemble est actualisé au <strong className="text-white">WACC (coût moyen
              pondéré du capital)</strong>, que nous calibrons entre{" "}
              <strong className="text-white">7% et 15%</strong> selon le secteur et le profil
              de risque de l&apos;entreprise.
            </p>
          </div>
        </section>

        {/* Nos sources de donnees */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] mb-4">
            Nos sources de données
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6">
              <h3 className="text-white font-semibold mb-2">Financial Modeling Prep</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Données fondamentales: comptes de résultat, bilans, flux de
                trésorerie et ratios financiers.
              </p>
            </div>
            <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6">
              <h3 className="text-white font-semibold mb-2">yfinance</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Prix en temps réel et données de marché (cours, indices, volumes).
              </p>
            </div>
            <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6">
              <h3 className="text-white font-semibold mb-2">Claude (Anthropic)</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Analyses qualitatives générées par intelligence artificielle pour
                contextualiser les chiffres.
              </p>
            </div>
          </div>
        </section>

        {/* Comment interpreter le verdict */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] mb-4">
            Comment interpréter le verdict
          </h2>
          <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-block w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                <div>
                  <p className="text-white font-semibold text-sm">Sous-évalué</p>
                  <p className="text-zinc-400 text-sm">
                    L&apos;upside du DCF est supérieur à <strong className="text-white">+15%</strong>.
                    Le marché semble sous-estimer la valeur de l&apos;entreprise.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-block w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />
                <div>
                  <p className="text-white font-semibold text-sm">Juste valeur</p>
                  <p className="text-zinc-400 text-sm">
                    L&apos;écart se situe entre <strong className="text-white">-15%
                    et +15%</strong>. Le prix de marché reflète approximativement
                    la valeur fondamentale.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-block w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                <div>
                  <p className="text-white font-semibold text-sm">Surévalué</p>
                  <p className="text-zinc-400 text-sm">
                    Le downside est supérieur à <strong className="text-white">-15%</strong>.
                    Le marché semble surestimer la valeur de l&apos;entreprise.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* L'analyse de sensibilité */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] mb-4">
            L&apos;analyse de sensibilité
          </h2>
          <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6 space-y-3">
            <p className="text-zinc-400 leading-relaxed text-sm">
              Un DCF ne donne pas <strong className="text-white">une</strong> valeur, mais un <strong className="text-white">spectre de valeurs</strong> selon les hypothèses retenues. C&apos;est pourquoi chaque analyse ValuEngine inclut une <strong className="text-white">matrice de sensibilité</strong> qui croise différents niveaux de WACC et de croissance terminale.
            </p>
            <p className="text-zinc-400 leading-relaxed text-sm">
              Cette matrice te permet de visualiser les scénarios optimiste, central et pessimiste en un coup d&apos;œil. Si la majorité des cellules indiquent un upside positif, le signal est robuste.
            </p>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="rounded-lg bg-[#09090b] border border-[#27272a] p-4 text-center">
                <p className="text-[#C9A84C] font-bold text-lg">WACC</p>
                <p className="text-zinc-500 text-xs mt-1">Coût du capital — ajusté au risque sectoriel</p>
              </div>
              <div className="rounded-lg bg-[#09090b] border border-[#27272a] p-4 text-center">
                <p className="text-[#C9A84C] font-bold text-lg">Croissance</p>
                <p className="text-zinc-500 text-xs mt-1">Taux de croissance perpétuel post-projection</p>
              </div>
              <div className="rounded-lg bg-[#09090b] border border-[#27272a] p-4 text-center">
                <p className="text-[#C9A84C] font-bold text-lg">Upside</p>
                <p className="text-zinc-500 text-xs mt-1">Potentiel de hausse pour chaque combinaison</p>
              </div>
            </div>
          </div>
        </section>

        {/* L'analyse Bull & Bear IA */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] mb-4">
            L&apos;analyse Bull &amp; Bear IA
          </h2>
          <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6 space-y-3">
            <p className="text-zinc-400 leading-relaxed text-sm">
              Chaque analyse inclut un <strong className="text-white">scénario optimiste (Bull Case)</strong> et un <strong className="text-white">scénario pessimiste (Bear Case)</strong> générés par IA. Ces analyses qualitatives complètent le modèle quantitatif du DCF.
            </p>
            <p className="text-zinc-400 leading-relaxed text-sm">
              L&apos;IA contextualise les chiffres en analysant les <strong className="text-white">catalyseurs de croissance</strong>, les <strong className="text-white">risques structurels</strong>, la <strong className="text-white">position concurrentielle</strong> et les <strong className="text-white">tendances sectorielles</strong>.
            </p>
          </div>
        </section>

        {/* Les limites du modele */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] mb-4">
            Les limites du modèle
          </h2>
          <div className="rounded-xl bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] p-6 space-y-3">
            <p className="text-zinc-400 leading-relaxed text-sm">
              Le DCF est <strong className="text-white">sensible aux hypothèses de croissance</strong>.
              Deux analystes utilisant des taux de croissance différents obtiendront des valorisations
              très différentes pour la même entreprise.
            </p>
            <p className="text-zinc-400 leading-relaxed text-sm">
              ValuEngine est un <strong className="text-white">outil d&apos;aide à la
              décision</strong>, pas un oracle. Il fournit un cadre d&apos;analyse rigoureux,
              mais la décision finale d&apos;investissement reste toujours la vôtre.
            </p>
          </div>
        </section>

        {/* Avertissement reglementaire */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] mb-4">
            Avertissement réglementaire
          </h2>
          <div className="rounded-xl border-2 border-[#C9A84C]/40 bg-[#C9A84C]/5 p-6">
            <p className="text-[#C9A84C]/90 text-sm leading-relaxed">
              ValuEngine n&apos;est pas un conseiller en investissement au sens de la directive MIF II.
              Les analyses fournies sont des estimations mathématiques basées sur des
              données publiques et des modèles statistiques. Elles ne constituent en aucun
              cas une recommandation d&apos;achat, de vente ou de détention de titres financiers.
              Tout investissement comporte des risques, y compris la perte partielle ou totale du capital
              investi. Consulte un conseiller financier agréé avant toute décision
              d&apos;investissement.
            </p>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
