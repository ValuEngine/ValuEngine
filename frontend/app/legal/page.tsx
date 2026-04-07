import AppLayout from "@/components/AppLayout";

export default function LegalPage() {
  return (
    <AppLayout>
      <div className="min-h-screen text-white px-4 sm:px-6 md:px-16 py-8 sm:py-10 max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Mentions légales & CGU</h1>
        <p className="text-sm mb-10" style={{ color: "var(--text-secondary)" }}>Dernière mise à jour : avril 2026</p>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3" style={{ color: "var(--accent-primary)" }}>Éditeur du site</h2>
          <div className="leading-relaxed text-sm space-y-1" style={{ color: "var(--text-secondary)" }}>
            <p><strong className="text-white">ValuEngine</strong> — Micro-entreprise en cours d&apos;immatriculation</p>
            <p>Responsable de la publication : <strong className="text-white">Ilias Moulouade</strong></p>
            <p>Email :{" "}
              <a href="mailto:contact@valuengine.fr" className="underline hover:opacity-80" style={{ color: "var(--accent-primary)" }}>
                contact@valuengine.fr
              </a>
            </p>
            <p>Hébergement : <strong className="text-white">Vercel Inc.</strong> (frontend), <strong className="text-white">Railway Corp.</strong> (backend)</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3" style={{ color: "var(--accent-primary)" }}>1. Nature du service</h2>
          <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
            ValuEngine est un outil d&apos;analyse financière à vocation <strong className="text-white">exclusivement éducative</strong>.
            Les modèles DCF, les ratios de valorisation et les indicateurs présentés sont des outils pédagogiques
            destinés à illustrer des concepts financiers. ValuEngine n&apos;est <strong className="text-white">pas un conseiller en investissement</strong>,
            ne dispose d&apos;aucun agrément AMF ou CIF, et les informations fournies ne constituent en aucun cas
            un conseil en investissement au sens de la directive MIF II, ni des recommandations d&apos;achat, de vente ou de conservation de valeurs mobilières.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3" style={{ color: "var(--accent-primary)" }}>2. Limitation de responsabilité</h2>
          <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
            Les données financières affichées proviennent de sources tierces (Financial Modeling Prep, yfinance)
            et sont fournies à titre <strong className="text-white">indicatif uniquement</strong>. ValuEngine ne garantit
            ni leur exactitude, ni leur exhaustivité, ni leur actualité. Les analyses DCF reposent sur des hypothèses
            de croissance et de taux d&apos;actualisation qui peuvent s&apos;avérer inexactes. Les performances passées
            ne préjugent pas des performances futures. Tu es seul responsable de tes décisions
            financières. ValuEngine décline toute responsabilité en cas de perte ou de préjudice résultant
            de l&apos;utilisation de la plateforme.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3" style={{ color: "var(--accent-primary)" }}>3. Données personnelles</h2>
          <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
            L&apos;authentification est assurée par <strong className="text-white">Clerk</strong> (clerk.com), qui gère de manière
            sécurisée les identifiants et sessions utilisateurs. Les données d&apos;utilisation (portefeuille, analyses,
            alertes) sont stockées dans <strong className="text-white">Supabase</strong> (supabase.com), une plateforme
            hébergée en Europe. Aucune donnée personnelle n&apos;est revendue à des tiers. Tu peux
            demander la suppression de tes données à tout moment en contactant{" "}
            <a href="mailto:contact@valuengine.fr" className="underline hover:opacity-80" style={{ color: "var(--accent-primary)" }}>
              contact@valuengine.fr
            </a>.
            Conformément au RGPD, tu disposes d&apos;un droit d&apos;accès, de rectification, d&apos;effacement
            et de portabilité de tes données.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3" style={{ color: "var(--accent-primary)" }}>4. Propriété intellectuelle</h2>
          <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
            L&apos;ensemble des éléments de la plateforme ValuEngine (interface, algorithmes, textes, visuels)
            est protégé par le droit de la propriété intellectuelle. Toute reproduction, distribution ou
            utilisation commerciale sans autorisation préalable écrite est interdite.
            © 2026 ValuEngine — Tous droits réservés.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3" style={{ color: "var(--accent-primary)" }}>5. Contact</h2>
          <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
            Pour toute question relative aux présentes mentions légales, à tes données personnelles
            ou à l&apos;utilisation du service :{" "}
            <a href="mailto:contact@valuengine.fr" className="underline hover:opacity-80" style={{ color: "var(--accent-primary)" }}>
              contact@valuengine.fr
            </a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3" style={{ color: "var(--accent-primary)" }}>6. Cookies</h2>
          <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
            ValuEngine utilise uniquement des <strong className="text-white">cookies fonctionnels</strong> strictement
            nécessaires au bon fonctionnement du service : authentification via Clerk et gestion des paiements
            via Stripe. Aucun cookie publicitaire ni cookie de suivi marketing n&apos;est déposé sur ton navigateur.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3" style={{ color: "var(--accent-primary)" }}>7. Droit de rétractation</h2>
          <p className="leading-relaxed text-sm" style={{ color: "var(--text-secondary)" }}>
            Conformément à l&apos;article L221-28 du Code de la consommation, le droit de rétractation
            ne s&apos;applique pas aux contenus numériques dont l&apos;exécution a commencé avec l&apos;accord
            préalable exprès du consommateur. En souscrivant à l&apos;abonnement Pro ValuEngine, vous
            reconnaissez expressément que l&apos;accès au service commence immédiatement et renoncez à
            votre droit de rétractation.
          </p>
          <p className="leading-relaxed text-sm mt-3" style={{ color: "var(--text-secondary)" }}>
            En cas d&apos;insatisfaction, contactez{" "}
            <a href="mailto:contact@valuengine.fr" className="underline hover:opacity-80" style={{ color: "var(--accent-primary)" }}>
              contact@valuengine.fr
            </a>{" "}
            dans les 48h suivant la souscription — nous étudierons chaque demande de remboursement au cas par cas.
          </p>
        </section>

        <div
          className="mt-10 p-4 rounded-xl text-xs leading-relaxed"
          style={{ border: "1px solid rgba(234,179,8,0.3)", background: "rgba(234,179,8,0.05)", color: "#eab308" }}
        >
          <strong>Rappel important :</strong> Les verdicts &quot;Sous-évalué&quot;, &quot;Surévalué&quot; et
          &quot;Juste valeur&quot; affichés sur ValuEngine sont des estimations mathématiques basées sur
          un modèle DCF. Ils ne constituent pas un conseil en investissement au sens de la
          directive MIF II. Consulte toujours un professionnel financier agréé avant toute
          décision d&apos;investissement.
        </div>
      </div>
    </AppLayout>
  );
}
