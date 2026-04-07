"""
ValuEngine — Pedagogy Mode
"Explain like I'm 15" — simplifies financial concepts with analogies.
Includes a deterministic glossary + AI enrichment for custom explanations.
"""

import logging
from typing import Optional, Dict

logger = logging.getLogger("valuengine")

# Built-in glossary with simple explanations (no AI needed)
GLOSSARY: Dict[str, dict] = {
    "dcf": {
        "term": "DCF (Discounted Cash Flow)",
        "simple": "C'est comme calculer combien vaut un arbre fruitier en estimant tous les fruits qu'il va produire dans le futur, puis en se disant que les fruits de demain valent un peu moins que ceux d'aujourd'hui.",
        "technical": "Methode de valorisation qui estime la valeur d'une entreprise en actualisant ses flux de tresorerie futurs a un taux d'actualisation.",
        "example": "Si une entreprise genere 100M€ de cash par an et qu'on pense qu'elle le fera pendant 10 ans, on calcule combien ca vaut aujourd'hui.",
        "category": "valorisation",
    },
    "pe_ratio": {
        "term": "PER (Price-to-Earnings Ratio)",
        "simple": "Imagine que tu achetes une poule. Le PER, c'est combien tu paies la poule par rapport aux oeufs qu'elle pond par an. Un PER de 20, ca veut dire que tu paies 20 fois ses oeufs annuels.",
        "technical": "Ratio cours/benefice. Divise le prix de l'action par le benefice par action. Un PER eleve peut indiquer que le marche anticipe une forte croissance.",
        "example": "Apple a un PER de 30 = les investisseurs paient 30€ pour chaque 1€ de benefice annuel.",
        "category": "valorisation",
    },
    "wacc": {
        "term": "WACC (Cout Moyen Pondere du Capital)",
        "simple": "C'est le 'loyer' que l'entreprise paie pour utiliser l'argent des investisseurs et des banques. Plus c'est eleve, plus ca coute cher de financer l'entreprise.",
        "technical": "Moyenne ponderee du cout des capitaux propres et du cout de la dette, utilisee comme taux d'actualisation dans le DCF.",
        "example": "Un WACC de 10% signifie que l'entreprise doit generer au moins 10% de rendement pour satisfaire ses financeurs.",
        "category": "valorisation",
    },
    "free_cash_flow": {
        "term": "Free Cash Flow (FCF)",
        "simple": "C'est l'argent qui reste dans la caisse de l'entreprise apres avoir paye toutes ses factures et investi dans ses machines. C'est le vrai cash disponible.",
        "technical": "Cash flow operationnel moins les depenses d'investissement (CAPEX). Mesure la capacite de l'entreprise a generer du cash libre.",
        "example": "Si une boite gagne 500M€ de cash et investit 200M€ dans ses usines, son FCF est de 300M€.",
        "category": "fondamentaux",
    },
    "dividend": {
        "term": "Dividende",
        "simple": "C'est comme recevoir un loyer pour tes actions. L'entreprise te verse une partie de ses benefices, generalement tous les trimestres.",
        "technical": "Distribution d'une partie des benefices aux actionnaires. Le rendement du dividende = dividende annuel / prix de l'action.",
        "example": "Si tu as 100 actions Total a 50€ et le dividende est 2€/action, tu recois 200€/an.",
        "category": "rendement",
    },
    "market_cap": {
        "term": "Capitalisation boursiere",
        "simple": "C'est le prix total de l'entreprise en Bourse. Comme si tu comptais le prix de TOUTES les parts du gateau.",
        "technical": "Prix de l'action x nombre total d'actions en circulation. Mesure la taille de l'entreprise sur le marche.",
        "example": "Apple a 15 milliards d'actions a ~180$, donc sa market cap est d'environ 2 700 milliards $.",
        "category": "fondamentaux",
    },
    "eps": {
        "term": "BPA (Benefice Par Action / EPS)",
        "simple": "Si l'entreprise etait un gateau, le BPA c'est la taille de ta part. C'est combien de benefice correspond a chaque action.",
        "technical": "Benefice net divise par le nombre d'actions en circulation. Indicateur cle de la rentabilite par action.",
        "example": "Si l'entreprise gagne 1 milliard € et a 100 millions d'actions, le BPA = 10€.",
        "category": "fondamentaux",
    },
    "beta": {
        "term": "Beta",
        "simple": "C'est comme la nervosité d'une action. Un beta de 2, ca veut dire que quand le marche bouge de 1%, ton action bouge de 2%. C'est un roller coaster.",
        "technical": "Mesure de la volatilite d'un titre par rapport au marche. Beta > 1 = plus volatile que le marche, Beta < 1 = moins volatile.",
        "example": "Tesla a un beta eleve (~2) = quand le marche monte de 1%, Tesla monte souvent de 2%.",
        "category": "risque",
    },
    "marge_securite": {
        "term": "Marge de securite",
        "simple": "C'est comme acheter un billet d'avion a 50€ alors qu'il en vaut 100€. Tu te proteges au cas ou il y aurait des turbulences.",
        "technical": "Difference entre la valeur intrinseque estimee et le prix du marche. Concept de Benjamin Graham pour reduire le risque.",
        "example": "Si tu estimes qu'une action vaut 100€ et qu'elle cote 70€, ta marge de securite est de 30%.",
        "category": "valorisation",
    },
    "volatilite": {
        "term": "Volatilite",
        "simple": "C'est a quel point le prix d'une action fait les montagnes russes. Plus c'est volatile, plus ca bouge fort dans les deux sens.",
        "technical": "Mesure statistique de la dispersion des rendements. Calculee comme l'ecart-type des rendements historiques.",
        "example": "Bitcoin = tres volatile (peut faire +/-10% en une journee). Nestle = peu volatile (bouge de 1-2%).",
        "category": "risque",
    },
    "etf": {
        "term": "ETF (Exchange-Traded Fund)",
        "simple": "C'est comme un panier-repas d'actions. Au lieu d'acheter chaque action une par une, tu achetes le panier qui contient plein d'actions d'un coup.",
        "technical": "Fonds indiciel cote en bourse qui replique un indice (S&P 500, CAC 40...). Faibles frais et diversification instantanee.",
        "example": "Un ETF S&P 500 te donne une part des 500 plus grosses entreprises americaines pour ~30€.",
        "category": "instruments",
    },
    "pea": {
        "term": "PEA (Plan Epargne en Actions)",
        "simple": "C'est un compte special en France pour investir en Bourse avec moins d'impots. Comme un coffre-fort fiscal pour tes actions.",
        "technical": "Enveloppe fiscale francaise plafonnee a 150 000€ de versements. Exoneration d'impot sur les plus-values apres 5 ans (hors prelevements sociaux).",
        "example": "Tu mets 10 000€ sur ton PEA, ca monte a 15 000€. Si tu retires apres 5 ans, tu ne paies que 17.2% de taxes au lieu de 30%.",
        "category": "fiscalite",
    },
    "short_selling": {
        "term": "Vente a decouvert (Short Selling)",
        "simple": "C'est comme emprunter le velo d'un copain, le vendre 100€, attendre qu'il baisse a 60€, le racheter et rendre le velo. Tu gardes les 40€ de difference.",
        "technical": "Strategie qui consiste a vendre un titre emprunte en anticipant une baisse, puis a le racheter moins cher pour le rendre.",
        "example": "Tu short Tesla a 200$, elle descend a 150$, tu rachetes = profit de 50$ par action.",
        "category": "strategies",
    },
    "intrinsic_value": {
        "term": "Valeur intrinseque",
        "simple": "C'est le 'vrai' prix d'une action, calcule en regardant ce que l'entreprise gagne vraiment, pas ce que les gens veulent bien payer en Bourse.",
        "technical": "Valeur fondamentale d'un actif basee sur l'analyse de ses flux de tresorerie futurs, independante du prix de marche.",
        "example": "Si le DCF donne 150€ et l'action cote 120€, la valeur intrinseque est 150€ → elle est sous-evaluee.",
        "category": "valorisation",
    },
    "support_resistance": {
        "term": "Support et Resistance",
        "simple": "Le support c'est comme un trampoline — le prix rebondit dessus. La resistance c'est un plafond de verre — le prix a du mal a le percer.",
        "technical": "Niveaux de prix ou l'offre/demande cree des zones de rebond (support) ou de blocage (resistance) techniques.",
        "example": "Si LVMH rebondit toujours autour de 700€, c'est un support. Si elle bloque toujours a 850€, c'est une resistance.",
        "category": "analyse_technique",
    },
}


def get_glossary_terms() -> list[dict]:
    """Return all glossary terms grouped by category."""
    terms = []
    for key, val in GLOSSARY.items():
        terms.append({
            "id": key,
            "term": val["term"],
            "simple": val["simple"],
            "category": val["category"],
        })
    return sorted(terms, key=lambda t: t["category"])


def get_term_explanation(term_id: str) -> Optional[dict]:
    """Get full explanation for a specific term."""
    return GLOSSARY.get(term_id.lower().replace(" ", "_").replace("-", "_"))


def build_pedagogy_prompt(concept: str, context: str = "") -> str:
    """Build AI prompt to explain any financial concept simply."""
    return f"""Tu es un professeur de finance qui explique a un lyceen de 15 ans.

Explique ce concept financier de maniere TRES simple avec :
1. Une analogie du quotidien (nourriture, sport, ecole...)
2. Une explication technique en 1-2 phrases
3. Un exemple concret avec des chiffres

Concept a expliquer : "{concept}"
{f"Contexte supplementaire : {context}" if context else ""}

Retourne un JSON :
{{
  "term": "nom du concept",
  "simple": "explication avec analogie (2-3 phrases max)",
  "technical": "definition technique (1-2 phrases)",
  "example": "exemple concret avec des chiffres",
  "category": "valorisation|fondamentaux|risque|rendement|strategies|fiscalite|instruments|analyse_technique"
}}

En francais. Retourne UNIQUEMENT du JSON valide."""
