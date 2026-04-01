import AppLayout from "../../../components/AppLayout";
import Link from "next/link";

const CONTENT: Record<string, { title: string; date: string; readTime: string; category: string; body: string }> = {
  "comment-lire-un-dcf": {
    title: "Comment lire une analyse DCF en 5 minutes",
    date: "1 Avril 2025",
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
    date: "28 Mars 2025",
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
    date: "20 Mars 2025",
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

  const paragraphs = article.body.trim().split("\n").filter(l => l.trim());

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
        <div className="prose prose-invert max-w-none">
          {paragraphs.map((line, i) => {
            if (line.startsWith("## ")) {
              return <h2 key={i} className="text-xl font-bold mt-8 mb-4" style={{ color: "var(--text-primary)" }}>{line.slice(3)}</h2>;
            }
            if (line.startsWith("**") && line.endsWith("**")) {
              return <p key={i} className="font-semibold my-2" style={{ color: "var(--text-primary)" }}>{line.slice(2, -2)}</p>;
            }
            if (line.startsWith("> ")) {
              return <blockquote key={i} className="border-l-4 border-[#C9A84C] pl-4 italic my-4" style={{ color: "var(--text-secondary)" }}>{line.slice(2)}</blockquote>;
            }
            if (line.startsWith("- ")) {
              return <li key={i} className="ml-4 my-1 list-disc" style={{ color: "var(--text-secondary)" }}>{line.slice(2)}</li>;
            }
            if (line.trim() === "") return null;
            return <p key={i} className="leading-relaxed my-3" style={{ color: "var(--text-secondary)" }}>{line}</p>;
          })}
        </div>
      </div>
    </AppLayout>
  );
}
