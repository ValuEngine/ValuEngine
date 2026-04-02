import AppLayout from "../../../components/AppLayout";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

const CONTENT: Record<string, { title: string; date: string; readTime: string; category: string; body: string }> = {
  "investir-actions-europeennes-2026": {
    title: "Investir dans les actions européennes en 2026 : ce qu'il faut savoir",
    date: "2 Avril 2026",
    readTime: "5 min",
    category: "Stratégie",
    body: `## Le contexte européen en 2026

Les marchés européens traversent une période intéressante. Avec des valorisations moyennes inférieures de 30% aux marchés américains, le **CAC 40** et le **DAX** attirent l'attention des investisseurs value.

## Pourquoi l'Europe est sous-évaluée

**1. L'écart de valorisation historique**
Le P/E moyen du S&P 500 tourne autour de 22x contre 14x pour le STOXX 600. Cet écart n'a jamais été aussi large depuis 20 ans.

**2. Des entreprises mondiales à prix réduit**
LVMH, ASML, SAP, TotalEnergies — ces champions mondiaux se traitent à des multiples bien inférieurs à leurs équivalents américains.

**3. Le rendement des dividendes**
Le rendement moyen des dividendes en Europe est de 3,2% contre 1,4% aux US. Pour un investisseur orienté revenus, c'est un argument de poids.

## Les risques à surveiller

- **Croissance économique modérée** : l'Europe croît moins vite que les US
- **Risque géopolitique** : la proximité avec les zones de tension reste un facteur
- **Innovation tech** : l'Europe a raté le virage IA, les géants tech sont américains

## Comment analyser une action européenne

Sur ValuEngine, les tickers européens se terminent par un suffixe : **.PA** (Paris), **.DE** (Francfort), **.AS** (Amsterdam). Le modèle DCF s'applique exactement de la même manière.

> L'investissement en actions européennes nécessite la même rigueur d'analyse que pour les actions américaines. Le DCF reste votre meilleur allié.`,
  },
  "marge-de-securite-graham": {
    title: "La marge de sécurité : le concept le plus important en investissement",
    date: "25 Mars 2026",
    readTime: "7 min",
    category: "Éducation",
    body: `## L'origine du concept

Benjamin Graham, le père de l'investissement value, a introduit la **marge de sécurité** dans son livre *The Intelligent Investor* (1949). L'idée est élégante dans sa simplicité : n'achetez jamais une action à sa juste valeur, achetez-la toujours **en dessous**.

## La définition simple

La marge de sécurité = **(Valeur intrinsèque − Prix de marché) / Valeur intrinsèque**

Si une action vaut 100€ selon votre DCF et qu'elle se trade à 70€, votre marge de sécurité est de 30%.

## Pourquoi c'est essentiel

**1. Vos estimations sont toujours fausses**
Un DCF repose sur des hypothèses. La croissance future, le WACC, le terminal growth — tout est une estimation. La marge de sécurité absorbe ces erreurs.

**2. Le marché peut rester irrationnel longtemps**
Même si vous avez raison sur les fondamentaux, le cours peut baisser avant de remonter. La marge de sécurité vous donne un coussin psychologique et financier.

**3. Le risque asymétrique**
Avec une marge de sécurité de 30%, le pire scénario est un rendement nul. Le meilleur scénario est un rendement de 50%+.

## Comment l'utiliser dans ValuEngine

L'**upside %** affiché dans chaque analyse est exactement la marge de sécurité. Un upside de +35% signifie que le prix de marché est 35% en dessous de la valeur intrinsèque calculée.

**Règle d'or** : ne considérez un achat que si l'upside est d'au moins **+20%** pour une large cap, ou **+40%** pour une small cap plus risquée.`,
  },
  "fcf-yield-indicateur": {
    title: "Le FCF Yield : l'indicateur que les pros regardent en premier",
    date: "18 Mars 2026",
    readTime: "6 min",
    category: "Finance",
    body: `## Oubliez le P/E ratio

Le ratio cours/bénéfice (P/E) est l'indicateur le plus populaire, mais il est facilement manipulable. Les bénéfices nets incluent des éléments comptables non-cash (amortissements, provisions, charges exceptionnelles) qui n'ont rien à voir avec la capacité réelle de l'entreprise à générer du cash.

## Le FCF Yield : la vraie mesure

Le **FCF Yield** (rendement du flux de trésorerie libre) = **FCF / Market Cap × 100**

C'est le pourcentage du cash réellement généré par l'entreprise par rapport à sa valorisation boursière.

## Pourquoi c'est supérieur au P/E

**1. Le cash ne ment pas**
Les bénéfices peuvent être manipulés comptablement. Le Free Cash Flow, c'est l'argent réel qui entre dans les caisses.

**2. Comparable entre secteurs**
Le P/E varie énormément entre secteurs (tech à 30x vs utilities à 15x). Le FCF Yield normalise cette comparaison.

**3. C'est ce que Buffett regarde**
"Owner earnings" — ce que Buffett appelle les vrais bénéfices d'un propriétaire — correspondent au FCF.

## Les seuils à retenir

- **FCF Yield > 8%** : potentiellement sous-évalué
- **FCF Yield 4-8%** : correctement valorisé
- **FCF Yield < 4%** : cher, surtout pour une entreprise mature
- **FCF Yield négatif** : l'entreprise brûle du cash — prudence

## Où trouver le FCF Yield

Dans chaque analyse ValuEngine, le **FCF** est affiché dans les KPI financiers. Divisez-le par la Market Cap pour obtenir le FCF Yield. C'est aussi un des critères utilisés dans notre modèle DCF.`,
  },
  "comment-lire-un-dcf": {
    title: "Comment lire une analyse DCF en 5 minutes",
    date: "1 Mars 2026",
    readTime: "5 min",
    category: "Éducation",
    body: `## Qu'est-ce que le DCF ?

Le **Discounted Cash Flow** (flux de trésorerie actualisé) est une méthode de valorisation qui estime la valeur d'une entreprise en fonction des flux de trésorerie qu'elle générera dans le futur, ramenés à leur valeur actuelle.

## Les 3 paramètres clés

**1. Le taux de croissance du FCF**
C'est la vitesse à laquelle l'entreprise va augmenter ses flux de trésorerie libres. Pour une entreprise mature comme Apple, on utilise 6-8%. Pour une hypercroissance comme Nvidia, on peut aller jusqu'à 15-20%.

**2. Le WACC (taux d'actualisation)**
C'est le coût moyen pondéré du capital. Il reflète le risque de l'investissement. Plus le WACC est élevé, plus vous exigez de rendement. Typiquement entre 8% et 12%.

**3. Le taux de croissance terminal**
C'est la croissance perpétuelle après la période de projection (généralement 5 ans). On l'aligne sur la croissance économique long terme : 2-3%.

## Comment interpréter le résultat

Si la **valeur intrinsèque** calculée est supérieure au cours actuel → l'action est potentiellement sous-évaluée (opportunité d'achat).

Si elle est inférieure → l'action se paye à prime (risque de surévaluation).

**L'upside %** dans ValuEngine = (valeur intrinsèque - prix actuel) / prix actuel × 100.

> ⚠️ Un DCF n'est jamais une certitude. C'est un outil d'aide à la décision, pas une boule de cristal.`,
  },
  "bull-vs-bear-case": {
    title: "Bull Case vs Bear Case : comment trancher ?",
    date: "20 Février 2026",
    readTime: "4 min",
    category: "Stratégie",
    body: `## Le dilemme de l'investisseur

Face à une action, il existe toujours deux narratifs. Les optimistes voient une opportunité, les pessimistes voient un piège. Qui croire ?

## Le Bull Case

Le scénario optimiste se base sur :
- Les **catalyseurs de croissance** (nouveau marché, innovation, expansion géographique)
- Les **avantages compétitifs durables** (marques, brevets, effets réseau)
- Les **marges en expansion** et la génération de FCF

## Le Bear Case

Le scénario pessimiste se base sur :
- Les **risques structurels** (disruption, régulation, concurrence)
- Les **signaux financiers négatifs** (dette élevée, marges compressées, FCF négatif)
- Les **valorisations excessives** par rapport aux fondamentaux

## Comment trancher ?

**Méthode 1 : Le prix de conviction**
Déterminez à quel prix le bear case devient attractif. Si même dans le pire scénario l'action vaut plus que son cours actuel, c'est un signal fort.

**Méthode 2 : La probabilité pondérée**
Assignez une probabilité à chaque scénario. Valeur = (Bull × P_bull) + (Base × P_base) + (Bear × P_bear).

**Méthode 3 : La marge de sécurité**
N'achetez que si la valeur intrinsèque est au moins 30% supérieure au cours. Ça vous protège contre vos propres erreurs d'estimation.`,
  },
  "wacc-explique": {
    title: "Le WACC expliqué simplement",
    date: "10 Février 2026",
    readTime: "6 min",
    category: "Finance",
    body: `## Pourquoi le WACC est-il si important ?

Une variation de 1% sur le WACC peut changer la valeur intrinsèque d'une action de 15 à 25%. C'est le paramètre le plus sensible du modèle DCF. Le choisir correctement est crucial.

## La formule

WACC = (E/V × Re) + (D/V × Rd × (1 - T))

Où :
- **E** = valeur des fonds propres
- **D** = valeur de la dette
- **V** = E + D (valeur totale)
- **Re** = coût des fonds propres (CAPM)
- **Rd** = coût de la dette
- **T** = taux d'imposition

## Comment choisir votre WACC

**Entreprise large cap stable** (Apple, Microsoft, Coca-Cola) : 8-9%

**Entreprise growth tech** (SaaS, semiconducteurs) : 10-12%

**Entreprise cyclique ou endettée** : 12-15%

**Start-up ou entreprise en perte** : 15-20%+

## Le bêta : mesure du risque systématique

Le bêta mesure la sensibilité d'une action au marché. Un bêta de 1,2 signifie que l'action bouge 20% de plus que le marché.

**Bêta < 1** : action défensive (utilities, consumer staples)
**Bêta ≈ 1** : action suit le marché
**Bêta > 1,5** : action très volatile (tech growth, biotech)

ValuEngine intègre automatiquement le bêta réel de chaque action dans ses calculs.`,
  },
};

export function generateStaticParams() {
  return Object.keys(CONTENT).map(slug => ({ slug }));
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = CONTENT[params.slug];
  if (!article) {
    return (
      <AppLayout>
        <div className="p-6" style={{ color: "var(--text-primary)" }}>Article non trouvé.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <Link href="/blog" className="text-sm mb-6 block transition-colors hover:text-[#C9A84C]" style={{ color: "var(--text-secondary)" }}>
          ← Retour au blog
        </Link>
        <div className="mb-6">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#C9A84C]/20 text-[#C9A84C] mr-3">{article.category}</span>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{article.date} · {article.readTime} de lecture</span>
        </div>
        <h1 className="text-3xl font-black mb-8 leading-tight" style={{ color: "var(--text-primary)" }}>{article.title}</h1>
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            components={{
              h2: ({ children }) => <h2 className="text-xl font-bold mt-8 mb-4" style={{ color: "var(--text-primary)" }}>{children}</h2>,
              h3: ({ children }) => <h3 className="text-lg font-bold mt-6 mb-3" style={{ color: "var(--text-primary)" }}>{children}</h3>,
              p: ({ children }) => <p className="leading-relaxed my-3" style={{ color: "var(--text-secondary)" }}>{children}</p>,
              strong: ({ children }) => <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>{children}</strong>,
              ul: ({ children }) => <ul className="ml-4 my-2 list-disc" style={{ color: "var(--text-secondary)" }}>{children}</ul>,
              li: ({ children }) => <li className="my-1" style={{ color: "var(--text-secondary)" }}>{children}</li>,
              blockquote: ({ children }) => <blockquote className="border-l-4 border-[#C9A84C] pl-4 italic my-4" style={{ color: "var(--text-secondary)" }}>{children}</blockquote>,
            }}
          >
            {article.body}
          </ReactMarkdown>
        </div>
        {/* Article CTA */}
        <div className="mt-12 rounded-xl border border-[rgba(201,168,76,0.2)] bg-[rgba(201,168,76,0.04)] p-6 text-center">
          <p className="text-sm font-semibold text-zinc-200 mb-1">
            Envie de passer à la pratique ?
          </p>
          <p className="text-xs text-zinc-500 mb-4">Analyse n&apos;importe quelle action en 60 secondes avec notre modèle DCF</p>
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold px-6 py-2.5 rounded-lg text-sm transition-all"
          >
            Lancer une analyse →
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
