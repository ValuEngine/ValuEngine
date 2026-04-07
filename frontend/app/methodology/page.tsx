import AppLayout from "@/components/AppLayout";

export default function MethodologyPage() {
  return (
    <AppLayout>
      <div className="min-h-screen text-white px-4 sm:px-6 md:px-16 py-8 sm:py-10 max-w-4xl mx-auto">
        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
          Notre méthodologie
        </h1>
        <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
          Document technique détaillant les modèles, sources et hypothèses utilisés par ValuEngine.
        </p>
        <div className="h-1 w-16 rounded-full mb-10" style={{ background: "var(--accent-primary)" }} />

        {/* ───────── Section 1: Notre modèle DCF ───────── */}
        <section className="mb-12">
          <h2
            className="text-[13px] font-medium uppercase mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            1. Notre modèle DCF
          </h2>
          <div
            className="rounded-xl backdrop-blur-sm p-6 space-y-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
          >
            <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
              Le <strong className="text-white">DCF (Discounted Cash Flow)</strong> est la pierre
              angulaire de notre valorisation. Cette méthode estime la{" "}
              <strong className="text-white">valeur intrinsèque</strong> d&apos;une entreprise en
              actualisant l&apos;ensemble de ses flux de trésorerie disponibles futurs à un taux
              reflétant le risque de l&apos;investissement. L&apos;idée fondamentale : un euro
              aujourd&apos;hui vaut plus qu&apos;un euro demain, car il peut être investi et générer
              un rendement.
            </p>
            <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
              Nous projetons les <strong className="text-white">Free Cash Flows (FCF)</strong> sur
              une période explicite de 5 à 10 ans, puis calculons une{" "}
              <strong className="text-white">valeur terminale (VT)</strong> via la formule de{" "}
              <strong className="text-white">Gordon-Shapiro</strong>, qui suppose une croissance
              perpétuelle stable au-delà de la période de projection. La dette nette est ensuite
              déduite pour obtenir la valeur des fonds propres.
            </p>

            {/* Formula */}
            <div
              className="rounded-lg p-5 text-center my-4"
              style={{ background: "var(--bg-base)", border: "1px solid var(--border-default)" }}
            >
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--text-tertiary)" }}>
                Formule fondamentale
              </p>
              <p className="text-base md:text-lg font-mono font-bold tracking-wide" style={{ color: "var(--accent-primary)" }}>
                Valeur intrinsèque = &Sigma;(FCF<sub>t</sub> / (1+WACC)<sup>t</sup>) + VT / (1+WACC)<sup>n</sup> &minus; Dette nette
              </p>
            </div>

            {/* Variable grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {[
                { name: "FCFt", desc: "Free Cash Flow de l'année t — flux de trésorerie disponible après investissements" },
                { name: "WACC", desc: "Weighted Average Cost of Capital — coût moyen pondéré du capital (taux d'actualisation)" },
                { name: "VT", desc: "Valeur Terminale — valeur de l'entreprise au-delà de la période de projection explicite" },
                { name: "n", desc: "Nombre d'années de la période de projection explicite (5 à 10 ans)" },
                { name: "Dette nette", desc: "Dette financière totale moins trésorerie et équivalents de trésorerie" },
                { name: "t", desc: "Année de projection (de 1 à n)" },
              ].map((v) => (
                <div
                  key={v.name}
                  className="rounded-lg p-4"
                  style={{ background: "var(--bg-base)", border: "1px solid var(--border-default)" }}
                >
                  <p className="font-mono font-bold text-sm mb-1" style={{ color: "var(--accent-primary)" }}>
                    {v.name}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {v.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────── Section 2: Calcul du WACC (CAPM) ───────── */}
        <section className="mb-12">
          <h2
            className="text-[13px] font-medium uppercase mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            2. Calcul du WACC (CAPM)
          </h2>
          <div
            className="rounded-xl backdrop-blur-sm p-6 space-y-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
          >
            <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
              Le <strong className="text-white">WACC</strong> représente le rendement minimum exigé
              par l&apos;ensemble des pourvoyeurs de fonds (actionnaires et créanciers). Il sert de
              taux d&apos;actualisation dans notre modèle DCF. Le coût des fonds propres (Ke) est
              estimé via le <strong className="text-white">CAPM (Capital Asset Pricing Model)</strong>.
            </p>

            {/* WACC formula */}
            <div
              className="rounded-lg p-5 text-center space-y-2"
              style={{ background: "var(--bg-base)", border: "1px solid var(--border-default)" }}
            >
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--text-tertiary)" }}>
                Décomposition du WACC
              </p>
              <p className="font-mono font-bold text-sm md:text-base" style={{ color: "var(--accent-primary)" }}>
                WACC = (E/V) &times; Ke + (D/V) &times; Kd &times; (1 &minus; Tc)
              </p>
              <p className="font-mono font-bold text-sm md:text-base" style={{ color: "var(--accent-primary)" }}>
                Ke = Rf + &beta; &times; (Rm &minus; Rf)
              </p>
            </div>

            {/* Parameters table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                    <th className="text-left py-3 px-4 font-semibold text-white">Paramètre</th>
                    <th className="text-left py-3 px-4 font-semibold text-white">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-white">Source / Valeur</th>
                  </tr>
                </thead>
                <tbody style={{ color: "var(--text-secondary)" }}>
                  {[
                    { param: "Rf", desc: "Taux sans risque", source: "OAT 10 ans (France) / T-Bond 10 ans (US)" },
                    { param: "\u03B2", desc: "Beta de l'action", source: "Régression 2 ans sur données hebdomadaires vs indice de référence" },
                    { param: "Rm \u2212 Rf", desc: "Prime de risque de marché", source: "5.5% (moyenne historique long terme)" },
                    { param: "Kd", desc: "Coût de la dette avant impôt", source: "Charges d'intérêts / dette financière totale" },
                    { param: "Tc", desc: "Taux d'imposition effectif", source: "Impôts payés / résultat avant impôts" },
                    { param: "E/V", desc: "Poids des fonds propres dans la structure du capital", source: "Capitalisation boursière / (Capitalisation + Dette)" },
                    { param: "D/V", desc: "Poids de la dette dans la structure du capital", source: "Dette financière / (Capitalisation + Dette)" },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td className="py-3 px-4 font-mono font-bold" style={{ color: "var(--accent-primary)" }}>
                        {row.param}
                      </td>
                      <td className="py-3 px-4">{row.desc}</td>
                      <td className="py-3 px-4 text-xs">{row.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ───────── Section 3: Sources de données ───────── */}
        <section className="mb-12">
          <h2
            className="text-[13px] font-medium uppercase mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            3. Sources de données
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div
              className="rounded-xl backdrop-blur-sm p-6"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
            >
              <h3 className="text-white font-semibold mb-2">Financial Modeling Prep</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
                Bilans comptables, comptes de résultat, tableaux de flux de trésorerie, ratios
                financiers et données historiques.
              </p>
              <div className="space-y-1">
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  <strong className="text-white">Mise à jour :</strong> Publication des résultats trimestriels / annuels
                </p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  <strong className="text-white">Plan :</strong> Starter (données avec léger délai)
                </p>
              </div>
            </div>
            <div
              className="rounded-xl backdrop-blur-sm p-6"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
            >
              <h3 className="text-white font-semibold mb-2">Yahoo Finance (yfinance)</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
                Prix en temps réel, volumes de transactions, beta, dividendes et données de marché.
              </p>
              <div className="space-y-1">
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  <strong className="text-white">Mise à jour :</strong> Temps réel (léger délai possible)
                </p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  <strong className="text-white">Usage :</strong> Cours actuels, historiques, beta
                </p>
              </div>
            </div>
            <div
              className="rounded-xl backdrop-blur-sm p-6"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
            >
              <h3 className="text-white font-semibold mb-2">Claude (Anthropic)</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
                Analyses qualitatives IA : scénarios Bull/Bear, SWOT, PESTLE, contexte sectoriel et
                catalyseurs de croissance.
              </p>
              <div className="space-y-1">
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  <strong className="text-white">Modèle :</strong> Claude (Anthropic)
                </p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  <strong className="text-white">Usage :</strong> Contextualisation qualitative des données quantitatives
                </p>
              </div>
            </div>
          </div>
          <div
            className="rounded-lg p-4 mt-4 text-xs leading-relaxed"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border-default)", color: "var(--text-tertiary)" }}
          >
            <strong className="text-white">Note :</strong> Les données FMP proviennent du plan Starter,
            ce qui peut impliquer un léger délai par rapport aux données en temps réel. Les cours
            affichés peuvent présenter un décalage de quelques minutes.
          </div>
        </section>

        {/* ───────── Section 4: Interprétation des résultats ───────── */}
        <section className="mb-12">
          <h2
            className="text-[13px] font-medium uppercase mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            4. Interprétation des résultats
          </h2>
          <div
            className="rounded-xl backdrop-blur-sm p-6"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
          >
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 inline-block w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: "var(--color-success)" }}
                />
                <div>
                  <p className="text-white font-semibold text-sm">Sous-évalué (BUY)</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    L&apos;upside du DCF est supérieur à <strong className="text-white">+15%</strong>.
                    Le modèle estime que le marché sous-évalue significativement l&apos;entreprise par
                    rapport à sa valeur intrinsèque calculée.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-block w-3 h-3 rounded-full flex-shrink-0 bg-yellow-500" />
                <div>
                  <p className="text-white font-semibold text-sm">Juste valeur (HOLD)</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    L&apos;écart se situe entre <strong className="text-white">&minus;15% et +15%</strong>.
                    Le prix de marché reflète approximativement la valeur fondamentale estimée par
                    le modèle.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 inline-block w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: "var(--color-danger)" }}
                />
                <div>
                  <p className="text-white font-semibold text-sm">Surévalué (SELL)</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Le downside est supérieur à <strong className="text-white">&minus;15%</strong>.
                    Le modèle estime que le marché surévalue significativement l&apos;entreprise.
                  </p>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div
              className="rounded-lg p-4 mt-5 text-xs leading-relaxed"
              style={{ border: "1px solid rgba(234,179,8,0.3)", background: "rgba(234,179,8,0.05)", color: "#eab308" }}
            >
              <strong>Important :</strong> Ces seuils sont des indicateurs mathématiques issus du
              modèle DCF, pas des recommandations d&apos;achat ou de vente. Ils reflètent un
              écart calculé entre le prix de marché et la valeur intrinsèque estimée, et ne
              tiennent pas compte de votre situation personnelle, de votre profil de risque ni de
              votre horizon d&apos;investissement.
            </div>
          </div>
        </section>

        {/* ───────── Section 5: Matrice de sensibilité ───────── */}
        <section className="mb-12">
          <h2
            className="text-[13px] font-medium uppercase mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            5. Matrice de sensibilité
          </h2>
          <div
            className="rounded-xl backdrop-blur-sm p-6 space-y-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
          >
            <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
              Un DCF ne produit pas <strong className="text-white">une</strong> valeur unique, mais
              un <strong className="text-white">spectre de valeurs</strong> selon les hypothèses
              retenues. C&apos;est pourquoi chaque analyse ValuEngine inclut une{" "}
              <strong className="text-white">matrice de sensibilité 5&times;5</strong> qui croise
              différents niveaux de WACC et de croissance terminale.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                className="rounded-lg p-4"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border-default)" }}
              >
                <p className="font-bold text-sm mb-1" style={{ color: "var(--accent-primary)" }}>Lignes</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Taux de croissance perpétuel (g) : varie autour de l&apos;hypothèse centrale
                </p>
              </div>
              <div
                className="rounded-lg p-4"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border-default)" }}
              >
                <p className="font-bold text-sm mb-1" style={{ color: "var(--accent-primary)" }}>Colonnes</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  WACC : varie autour du coût du capital calculé via le CAPM
                </p>
              </div>
              <div
                className="rounded-lg p-4"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border-default)" }}
              >
                <p className="font-bold text-sm mb-1" style={{ color: "var(--accent-primary)" }}>Cellules</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Upside/Downside (%) pour chaque combinaison croissance &times; WACC
                </p>
              </div>
            </div>

            <div className="space-y-2 mt-2">
              <p className="text-xs font-semibold text-white">Code couleur :</p>
              <div className="flex flex-wrap gap-3">
                <span className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span className="w-3 h-3 rounded-sm" style={{ background: "var(--color-success)" }} />
                  Vert : upside significatif (&gt; +15%)
                </span>
                <span className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span className="w-3 h-3 rounded-sm bg-yellow-500" />
                  Jaune : juste valeur (&minus;15% &agrave; +15%)
                </span>
                <span className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span className="w-3 h-3 rounded-sm" style={{ background: "var(--color-danger)" }} />
                  Rouge : downside significatif (&lt; &minus;15%)
                </span>
              </div>
            </div>

            <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
              <strong className="text-white">Comment lire la matrice :</strong> Si la majorité des
              25 cellules indiquent un upside positif, le signal de sous-évaluation est
              considéré comme robuste. A l&apos;inverse, si seuls les scénarios les plus
              optimistes montrent un upside, la marge de sécurité est faible.
            </p>
          </div>
        </section>

        {/* ───────── Section 6: Limites du modèle ───────── */}
        <section className="mb-12">
          <h2
            className="text-[13px] font-medium uppercase mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            6. Limites du modèle
          </h2>
          <div
            className="rounded-xl backdrop-blur-sm p-6"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
          >
            <ul className="space-y-3">
              {[
                {
                  title: "Sensibilité aux hypothèses de croissance",
                  desc: "Deux analystes utilisant des taux de croissance différents obtiendront des valorisations très différentes pour la même entreprise. Le DCF amplifie les écarts d'hypothèses.",
                },
                {
                  title: "Poids de la valeur terminale",
                  desc: "La valeur terminale représente souvent plus de 70% de la valeur totale calculée. Une légère variation du taux de croissance perpétuel (g) a un impact disproportionné sur le résultat.",
                },
                {
                  title: "Entreprises financières",
                  desc: "Le modèle DCF classique ne fonctionne pas bien pour les banques, assurances et sociétés financières, dont les flux de trésorerie sont structurellement différents (le FCF n'est pas pertinent).",
                },
                {
                  title: "Catalyseurs court-terme ignorés",
                  desc: "Le DCF ne prend pas en compte les catalyseurs court-terme (annonces M&A, changements réglementaires, événements macro-économiques) qui peuvent impacter significativement le cours.",
                },
                {
                  title: "Données historiques",
                  desc: "Les projections sont basées sur des données historiques qui ne garantissent en rien les performances futures. Les ruptures structurelles (disruption technologique, crise) ne sont pas modélisées.",
                },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: "var(--color-danger)" }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs leading-relaxed mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {item.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ───────── Section 7: Références académiques ───────── */}
        <section className="mb-12">
          <h2
            className="text-[13px] font-medium uppercase mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            7. Références académiques
          </h2>
          <div
            className="rounded-xl backdrop-blur-sm p-6"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
          >
            <ul className="space-y-4">
              {[
                {
                  author: "Aswath Damodaran, NYU Stern",
                  work: "Valuation: Measuring and Managing the Value of Companies",
                  note: "Référence mondiale en matière de valorisation d'entreprise et de modèles DCF.",
                },
                {
                  author: "CFA Institute",
                  work: "Standards for DCF Analysis",
                  note: "Normes professionnelles de l'industrie pour l'analyse par actualisation des flux de trésorerie.",
                },
                {
                  author: "Myron J. Gordon & Eli Shapiro (1956)",
                  work: "Gordon Growth Model",
                  note: "Modèle de croissance perpétuelle utilisé pour le calcul de la valeur terminale.",
                },
                {
                  author: "William F. Sharpe (1964), John Lintner (1965)",
                  work: "Capital Asset Pricing Model (CAPM)",
                  note: "Modèle d'évaluation des actifs financiers utilisé pour estimer le coût des fonds propres (Ke).",
                },
              ].map((ref, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: "var(--accent-primary)" }}
                  />
                  <div>
                    <p className="text-sm text-white font-semibold">{ref.author}</p>
                    <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>
                      {ref.work}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {ref.note}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ───────── Section 8: Disclaimer réglementaire ───────── */}
        <section className="mb-10">
          <h2
            className="text-[13px] font-medium uppercase mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            8. Disclaimer réglementaire
          </h2>
          <div
            className="rounded-xl p-6 space-y-4"
            style={{
              border: "2px solid rgba(108,92,231,0.4)",
              background: "rgba(108,92,231,0.05)",
            }}
          >
            <p className="text-sm leading-relaxed" style={{ color: "rgba(108,92,231,0.9)" }}>
              <strong>ValuEngine n&apos;est PAS un conseiller financier agréé.</strong> La plateforme
              ne dispose d&apos;aucun agrément de l&apos;Autorité des Marchés Financiers (AMF) et
              n&apos;est pas enregistrée en tant que Conseiller en Investissements Financiers (CIF)
              au sens de l&apos;article L.541-1 du Code monétaire et financier.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(108,92,231,0.9)" }}>
              Les analyses, modèles DCF, ratios de valorisation et indicateurs présentés sur
              ValuEngine constituent un <strong>outil éducatif uniquement</strong>. Ils ne
              constituent en aucun cas une recommandation d&apos;achat, de vente ou de détention de
              titres financiers au sens de la <strong>directive MIF II (2014/65/UE)</strong> ni du
              règlement MAR.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(108,92,231,0.9)" }}>
              Tout investissement comporte des risques, y compris la perte partielle ou totale du
              capital investi. Les performances passées ne préjugent pas des performances futures.
            </p>
            <p className="text-sm leading-relaxed font-bold" style={{ color: "rgba(108,92,231,1)" }}>
              Consultez un conseiller financier professionnel agréé avant toute décision
              d&apos;investissement.
            </p>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
