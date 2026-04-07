import AppLayout from "@/components/AppLayout";

export default function MethodologyPage() {
  return (
    <AppLayout>
      <div className="min-h-screen text-white px-4 sm:px-6 md:px-16 py-8 sm:py-10 max-w-4xl mx-auto">
        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
          Notre méthodologie
        </h1>
        <div className="h-1 w-16 rounded-full mb-10" style={{ background: "var(--accent-primary)" }} />

        {/* Le modele DCF */}
        <section className="mb-10">
          <h2
            className="text-[13px] font-medium uppercase mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            Le modèle DCF que nous utilisons
          </h2>
          <div
            className="rounded-xl backdrop-blur-sm p-6 space-y-3"
            style={{ background: "rgba(24,24,27,0.8)", border: "1px solid var(--border-default)" }}
          >
            <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
              Le <strong className="text-white">DCF (Discounted Cash Flow)</strong> est une méthode
              de valorisation qui estime la valeur intrinsèque d&apos;une entreprise en actualisant
              ses flux de trésorerie futurs. L&apos;idée est simple: un euro
              aujourd&apos;hui vaut plus qu&apos;un euro demain, car il peut être investi et
              générer un rendement.
            </p>
            <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
              Nous projetons les <strong className="text-white">Free Cash Flows</strong> sur plusieurs
              années, puis calculons une <strong className="text-white">valeur terminale</strong> via
              la formule de <strong className="text-white">Gordon-Shapiro</strong>, qui suppose une croissance
              perpétuelle stable au-delà de la période de projection.
            </p>
            <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
              L&apos;ensemble est actualisé au <strong className="text-white">WACC (coût moyen
              pondéré du capital)</strong>, que nous calibrons entre{" "}
              <strong className="text-white">7% et 15%</strong> selon le secteur et le profil
              de risque de l&apos;entreprise.
            </p>
          </div>
        </section>

        {/* Nos sources de donnees */}
        <section className="mb-10">
          <h2
            className="text-[13px] font-medium uppercase mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            Nos sources de données
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div
              className="rounded-xl backdrop-blur-sm p-6"
              style={{ background: "rgba(24,24,27,0.8)", border: "1px solid var(--border-default)" }}
            >
              <h3 className="text-white font-semibold mb-2">Financial Modeling Prep</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Données fondamentales: comptes de résultat, bilans, flux de
                trésorerie et ratios financiers.
              </p>
            </div>
            <div
              className="rounded-xl backdrop-blur-sm p-6"
              style={{ background: "rgba(24,24,27,0.8)", border: "1px solid var(--border-default)" }}
            >
              <h3 className="text-white font-semibold mb-2">yfinance</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Prix en temps réel et données de marché (cours, indices, volumes).
              </p>
            </div>
            <div
              className="rounded-xl backdrop-blur-sm p-6"
              style={{ background: "rgba(24,24,27,0.8)", border: "1px solid var(--border-default)" }}
            >
              <h3 className="text-white font-semibold mb-2">Claude (Anthropic)</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Analyses qualitatives générées par intelligence artificielle pour
                contextualiser les chiffres.
              </p>
            </div>
          </div>
        </section>

        {/* Comment interpreter le verdict */}
        <section className="mb-10">
          <h2
            className="text-[13px] font-medium uppercase mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            Comment interpréter le verdict
          </h2>
          <div
            className="rounded-xl backdrop-blur-sm p-6"
            style={{ background: "rgba(24,24,27,0.8)", border: "1px solid var(--border-default)" }}
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 inline-block w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: "var(--color-success)" }}
                />
                <div>
                  <p className="text-white font-semibold text-sm">Sous-évalué</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    L&apos;upside du DCF est supérieur à <strong className="text-white">+15%</strong>.
                    Le marché semble sous-estimer la valeur de l&apos;entreprise.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-block w-3 h-3 rounded-full flex-shrink-0 bg-yellow-500" />
                <div>
                  <p className="text-white font-semibold text-sm">Juste valeur</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    L&apos;écart se situe entre <strong className="text-white">-15%
                    et +15%</strong>. Le prix de marché reflète approximativement
                    la valeur fondamentale.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 inline-block w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: "var(--color-danger)" }}
                />
                <div>
                  <p className="text-white font-semibold text-sm">Surévalué</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
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
          <h2
            className="text-[13px] font-medium uppercase mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            L&apos;analyse de sensibilité
          </h2>
          <div
            className="rounded-xl backdrop-blur-sm p-6 space-y-3"
            style={{ background: "rgba(24,24,27,0.8)", border: "1px solid var(--border-default)" }}
          >
            <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
              Un DCF ne donne pas <strong className="text-white">une</strong> valeur, mais un <strong className="text-white">spectre de valeurs</strong> selon les hypothèses retenues. C&apos;est pourquoi chaque analyse ValuEngine inclut une <strong className="text-white">matrice de sensibilité</strong> qui croise différents niveaux de WACC et de croissance terminale.
            </p>
            <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
              Cette matrice te permet de visualiser les scénarios optimiste, central et pessimiste en un coup d&apos;œil. Si la majorité des cellules indiquent un upside positif, le signal est robuste.
            </p>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div
                className="rounded-lg p-4 text-center"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border-default)" }}
              >
                <p className="font-bold text-lg" style={{ color: "var(--accent-primary)" }}>WACC</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Coût du capital — ajusté au risque sectoriel</p>
              </div>
              <div
                className="rounded-lg p-4 text-center"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border-default)" }}
              >
                <p className="font-bold text-lg" style={{ color: "var(--accent-primary)" }}>Croissance</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Taux de croissance perpétuel post-projection</p>
              </div>
              <div
                className="rounded-lg p-4 text-center"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border-default)" }}
              >
                <p className="font-bold text-lg" style={{ color: "var(--accent-primary)" }}>Upside</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Potentiel de hausse pour chaque combinaison</p>
              </div>
            </div>
          </div>
        </section>

        {/* L'analyse Bull & Bear IA */}
        <section className="mb-10">
          <h2
            className="text-[13px] font-medium uppercase mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            L&apos;analyse Bull &amp; Bear IA
          </h2>
          <div
            className="rounded-xl backdrop-blur-sm p-6 space-y-3"
            style={{ background: "rgba(24,24,27,0.8)", border: "1px solid var(--border-default)" }}
          >
            <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
              Chaque analyse inclut un <strong className="text-white">scénario optimiste (Bull Case)</strong> et un <strong className="text-white">scénario pessimiste (Bear Case)</strong> générés par IA. Ces analyses qualitatives complètent le modèle quantitatif du DCF.
            </p>
            <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
              L&apos;IA contextualise les chiffres en analysant les <strong className="text-white">catalyseurs de croissance</strong>, les <strong className="text-white">risques structurels</strong>, la <strong className="text-white">position concurrentielle</strong> et les <strong className="text-white">tendances sectorielles</strong>.
            </p>
          </div>
        </section>

        {/* Les limites du modele */}
        <section className="mb-10">
          <h2
            className="text-[13px] font-medium uppercase mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            Les limites du modèle
          </h2>
          <div
            className="rounded-xl backdrop-blur-sm p-6 space-y-3"
            style={{ background: "rgba(24,24,27,0.8)", border: "1px solid var(--border-default)" }}
          >
            <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
              Le DCF est <strong className="text-white">sensible aux hypothèses de croissance</strong>.
              Deux analystes utilisant des taux de croissance différents obtiendront des valorisations
              très différentes pour la même entreprise.
            </p>
            <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
              ValuEngine est un <strong className="text-white">outil d&apos;aide à la
              décision</strong>, pas un oracle. Il fournit un cadre d&apos;analyse rigoureux,
              mais la décision finale d&apos;investissement reste toujours la vôtre.
            </p>
          </div>
        </section>

        {/* Avertissement reglementaire */}
        <section className="mb-10">
          <h2
            className="text-[13px] font-medium uppercase mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            Avertissement réglementaire
          </h2>
          <div
            className="rounded-xl p-6"
            style={{
              border: "2px solid rgba(108,92,231,0.4)",
              background: "rgba(108,92,231,0.05)",
            }}
          >
            <p className="text-sm leading-relaxed" style={{ color: "rgba(108,92,231,0.9)" }}>
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
