import AppLayout from "@/components/AppLayout";

export default function LegalPage() {
  return (
    <AppLayout>
      <div className="min-h-screen text-white px-6 py-10 md:px-16 max-w-3xl mx-auto">
        <h1 className="text-3xl font-black tracking-tight mb-2">Mentions légales & CGU</h1>
        <p className="text-[#6b7d91] text-sm mb-10">Dernière mise à jour : janvier 2025</p>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-[#C9A84C] mb-3">1. Nature du service</h2>
          <p className="text-[#a0aec0] leading-relaxed text-sm">
            ValuEngine est un outil d&apos;analyse financière à vocation <strong className="text-white">exclusivement éducative</strong>.
            Les modèles DCF, les ratios de valorisation et les indicateurs présentés sont des outils pédagogiques
            destinés à illustrer des concepts financiers. ValuEngine n&apos;est <strong className="text-white">pas un conseiller en investissement</strong>,
            ne dispose d&apos;aucun agrément AMF ou CIF, et les informations fournies ne constituent en aucun cas
            des recommandations d&apos;achat, de vente ou de conservation de valeurs mobilières.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-[#C9A84C] mb-3">2. Limitation de responsabilité</h2>
          <p className="text-[#a0aec0] leading-relaxed text-sm">
            Les données financières affichées proviennent de sources tierces (Financial Modeling Prep, yfinance)
            et sont fournies à titre <strong className="text-white">indicatif uniquement</strong>. ValuEngine ne garantit
            ni leur exactitude, ni leur exhaustivité, ni leur actualité. Les analyses DCF reposent sur des hypothèses
            de croissance et de taux d&apos;actualisation qui peuvent s&apos;avérer inexactes. Les performances passées
            ne préjugent pas des performances futures. L&apos;utilisateur est seul responsable de ses décisions
            financières. ValuEngine décline toute responsabilité en cas de perte ou de préjudice résultant
            de l&apos;utilisation de la plateforme.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-[#C9A84C] mb-3">3. Données personnelles</h2>
          <p className="text-[#a0aec0] leading-relaxed text-sm">
            L&apos;authentification est assurée par <strong className="text-white">Clerk</strong> (clerk.com), qui gère de manière
            sécurisée les identifiants et sessions utilisateurs. Les données d&apos;utilisation (portefeuille, analyses,
            alertes) sont stockées dans <strong className="text-white">Supabase</strong> (supabase.com), une plateforme
            hébergée en Europe. Aucune donnée personnelle n&apos;est revendue à des tiers. L&apos;utilisateur
            peut demander la suppression de ses données à tout moment en contactant{" "}
            <a href="mailto:financeia.official@gmail.com" className="text-[#C9A84C] underline hover:opacity-80">
              financeia.official@gmail.com
            </a>.
            Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification et d&apos;effacement
            de vos données.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-[#C9A84C] mb-3">4. Propriété intellectuelle</h2>
          <p className="text-[#a0aec0] leading-relaxed text-sm">
            L&apos;ensemble des éléments de la plateforme ValuEngine (interface, algorithmes, textes, visuels)
            est protégé par le droit de la propriété intellectuelle. Toute reproduction, distribution ou
            utilisation commerciale sans autorisation préalable écrite est interdite.
            © 2025 ValuEngine — Tous droits réservés.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-[#C9A84C] mb-3">5. Contact</h2>
          <p className="text-[#a0aec0] leading-relaxed text-sm">
            Pour toute question relative aux présentes mentions légales, à vos données personnelles
            ou à l&apos;utilisation du service :{" "}
            <a href="mailto:financeia.official@gmail.com" className="text-[#C9A84C] underline hover:opacity-80">
              financeia.official@gmail.com
            </a>
          </p>
        </section>

        <div className="mt-10 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 text-xs text-yellow-400 leading-relaxed">
          <strong>Rappel important :</strong> Les verdicts &quot;Sous-évalué&quot;, &quot;Surévalué&quot; et
          &quot;Juste valeur&quot; affichés sur ValuEngine sont des estimations mathématiques basées sur
          un modèle DCF. Ils ne constituent pas des conseils en investissement au sens de la
          directive MIF II. Consultez toujours un professionnel financier agréé avant toute
          décision d&apos;investissement.
        </div>
      </div>
    </AppLayout>
  );
}
