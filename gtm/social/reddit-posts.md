# Posts Reddit — ValuEngine

---

## Post 1 : Soft Launch (r/vosfinances)

### Titre
J'ai passe 6 mois a construire un outil gratuit d'analyse fondamentale pour les investisseurs FR — retour d'experience

### Corps du post

Salut a tous,

Je suis ingenieur et investisseur particulier depuis quelques annees. Comme beaucoup ici, j'ai commence par acheter des ETF World (merci ce sub), puis j'ai voulu m'essayer au stock picking sur une petite poche de mon portefeuille.

Et la, j'ai decouvert un truc qui m'a frustre : les vrais outils d'analyse fondamentale sont soit hors de prix (Bloomberg a 24 000 EUR/an, tu m'etonnes), soit en anglais et incomplets.

Ce que je voulais, c'etait simple : taper le nom d'une action et obtenir rapidement une valorisation DCF propre, comme le ferait un analyste. Pas un PER sorti de nulle part. Un vrai modele avec des projections de cash flows, un WACC calcule, une valeur intrinseque.

Comme ca n'existait pas en francais et gratuit, je l'ai construit.

**Ce que fait l'outil :**
- Valorisation DCF complete (10 ans de projection, valeur terminale, WACC)
- Analyse Bull/Bear generee par IA (les arguments pour et contre)
- SWOT et PESTLE automatiques
- Matrice de sensibilite (comment la valo bouge si vos hypotheses changent)
- Export PDF du rapport complet
- Un screener IA ou vous decrivez ce que vous cherchez en francais

**Ce que ca ne fait PAS :**
- Ce n'est PAS un conseil en investissement
- Ca ne remplace PAS votre propre jugement
- Les projections sont des estimations, pas des certitudes
- Ca ne fait pas de trading algorithmique

**Le modele :** 3 analyses gratuites par jour, sans inscription. Il y a un plan Pro a 9,99 EUR/mois pour ceux qui veulent plus, mais honnement les 3 analyses quotidiennes suffisent pour la plupart des gens.

J'aimerais beaucoup avoir vos retours. Testez sur une action que vous connaissez bien — si la valo DCF vous semble aberrante, dites-le moi, c'est comme ca que je peux ameliorer le modele.

Le site : valuengine.fr

Et avant qu'on me le demande : oui, les donnees financieres viennent de sources fiables, et non, je ne vends pas vos donnees. Le business model c'est le freemium, point.

### Commentaire de suivi (a poster 1h apres)

Pour ceux qui veulent un exemple concret, j'ai lance une analyse sur TotalEnergies. Le DCF donne une valeur intrinseque de [X] EUR contre un cours actuel de [Y] EUR, soit une [decote/surcote] de [Z]%.

Le modele prend en compte la baisse progressive des revenus petroliers et la montee des renouvelables dans le mix energetique. L'analyse IA bull case met en avant le rendement du dividende et la diversification, le bear case pointe le risque reglementaire et la transition energetique.

Est-ce que ca correspond a votre propre analyse ? Curieux d'avoir l'avis des specialistes energie du sub.

---

## Post 2 : Tutorial value-add (r/vosfinances)

### Titre
Comment j'analyse une action en 60 secondes avec le DCF et l'IA — tutoriel detaille sur LVMH

### Corps du post

Beaucoup de posts ici demandent "est-ce que LVMH est un bon investissement a ce prix ?". La reponse depend entierement de la valorisation. Voici comment je fais ma propre analyse en quelques minutes.

**Etape 1 : Comprendre le DCF en 30 secondes**

Le DCF (Discounted Cash Flow) repond a une question simple : combien vaut cette entreprise si je fais la somme de tout l'argent qu'elle va generer dans le futur, ramene en euros d'aujourd'hui ?

C'est la methode utilisee par Warren Buffett, par les analystes de toutes les banques d'investissement, et par tous les fonds serieux. Ce n'est pas parfait — aucun modele ne l'est — mais c'est le standard de l'industrie.

**Etape 2 : Les inputs cles**

Pour LVMH, voici ce qu'il faut regarder :

1. **Free Cash Flow actuel** : c'est l'argent que l'entreprise genere reellement apres toutes ses depenses et investissements. Pour LVMH, on parle d'environ 10-12 milliards EUR.

2. **Taux de croissance** : a quel rythme ce cash flow va croitre ? LVMH a historiquement cru de 10-15% par an. Mais peut-on extrapoler ca ? Le ralentissement chinois, la normalisation post-Covid... il faut etre realiste.

3. **WACC (cout moyen pondere du capital)** : c'est le taux d'actualisation. Plus le risque est eleve, plus le WACC est eleve, et plus la valorisation baisse. Pour LVMH, c'est autour de 8-9%.

4. **Valeur terminale** : que vaut l'entreprise apres la periode de projection ? On utilise generalement un taux de croissance perpetuelle de 2-3%.

**Etape 3 : La matrice de sensibilite**

C'est la partie la plus importante et la plus negligee. Votre DCF donne UN chiffre, mais ce chiffre depend de vos hypotheses. La matrice montre comment la valorisation change si :
- La croissance est de 8% au lieu de 12%
- Le WACC est de 10% au lieu de 8.5%

Ca vous donne une fourchette de prix, ce qui est bien plus utile qu'un seul chiffre.

**Etape 4 : L'analyse qualitative**

Les chiffres ne suffisent pas. Il faut comprendre :
- **Forces** : marques iconiques, pricing power, diversification geographique
- **Faiblesses** : dependance au marche chinois, valorisation deja elevee
- **Opportunites** : croissance en Inde, digital, nouveaux segments
- **Menaces** : ralentissement economique mondial, changement des habitudes de consommation

**Etape 5 : La decision**

Si votre fourchette DCF est 650-850 EUR et que l'action cote 720 EUR, vous savez que :
- Ce n'est probablement pas une bonne affaire exceptionnelle
- Mais ce n'est pas sur-evalue non plus
- Le risque/rendement depend de vos hypotheses de croissance

**L'outil que j'utilise**

J'ai construit un outil qui fait tout ca automatiquement : valuengine.fr. Vous tapez "LVMH", et en 60 secondes vous avez le DCF, la matrice de sensibilite, l'analyse SWOT, et une analyse IA bull/bear. Gratuit, 3 analyses par jour.

Mais meme sans outil, la methodologie ci-dessus est ce que font les pros. Le plus important c'est de comprendre la logique, pas de faire confiance aveuglement a un chiffre.

Des questions sur la methodo ? Je suis dispo dans les commentaires.

### Commentaire de suivi

Pour ceux qui veulent aller plus loin sur le DCF, je recommande :
- Le chapitre sur la valorisation dans "The Intelligent Investor" de Graham
- Les cours gratuits de Damodaran sur YouTube (en anglais mais excellent)
- La section "valorisation" de l'AMF pour comprendre les bases

Et si vous voulez comparer votre propre analyse LVMH avec celle de l'outil, allez sur valuengine.fr et lancez l'analyse. C'est interessant de voir ou les hypotheses divergent.

---

## Post 3 : Discussion (r/vosfinances ou r/investisseurs)

### Titre
Quels outils utilisez-vous pour analyser vos actions ? (comparatif honnete)

### Corps du post

Je suis curieux de savoir quels outils vous utilisez pour votre analyse fondamentale. Je vais partager les miens, avec les pour et les contre de chacun.

**Ce que j'ai teste :**

**Zone Bourse (gratuit)**
- Pour : donnees financieres completes, interface claire, en francais
- Contre : pas de valorisation DCF automatique, pas d'analyse qualitative

**Simply Wall St (~15 EUR/mois)**
- Pour : belles infographies, snowflake score intuitif
- Contre : le DCF est simplifie a l'extreme, pas de matrice de sensibilite, pas en francais

**Koyfin (freemium, ~30 USD/mois pour le complet)**
- Pour : tres puissant pour les screeners et les donnees financieres
- Contre : courbe d'apprentissage raide, pas de DCF automatique, en anglais uniquement

**Morningstar (~200 EUR/an)**
- Pour : Fair value fiable, analyse qualitative excellente (moat, etc.)
- Contre : cher pour un particulier, les valorisations ne sont pas personnalisables

**TradingView (freemium)**
- Pour : meilleurs graphiques du marche, communaute active
- Contre : oriente analyse technique, pas de DCF

**ValuEngine (gratuit, Pro a 9,99 EUR/mois)**
- Pour : DCF complet avec matrice de sensibilite, analyse IA, SWOT/PESTLE, en francais, export PDF
- Contre : je suis biaise parce que c'est moi qui l'ai construit

Oui, full disclosure : j'ai cree ValuEngine parce qu'aucun de ces outils ne faisait exactement ce que je cherchais. Mais cette question est sincere — j'aimerais savoir ce que vous utilisez et ce qui vous manque.

En particulier :
1. Est-ce que vous faites des DCF manuellement (sur Excel) ou vous utilisez un outil ?
2. L'analyse qualitative (SWOT, moat, risques), vous la faites comment ?
3. Le fait que ce soit en francais, c'est important pour vous ou pas ?

### Commentaire de suivi

Merci pour toutes les reponses. Quelques precisions sur ValuEngine puisque certains ont pose des questions :

- Les donnees viennent de [source]. Elles sont mises a jour quotidiennement.
- Le DCF est entierement transparent : vous voyez toutes les hypotheses et vous pouvez les modifier.
- L'IA utilise Claude d'Anthropic pour l'analyse qualitative.
- On couvre toutes les actions du CAC40, SBF120, et les principales bourses mondiales.

Pour tester : valuengine.fr — 3 analyses gratuites par jour, zero inscription.

---

## Post 4 : Educatif (r/vosfinances)

### Titre
Le DCF explique simplement : comment savoir si une action est chere ou pas

### Corps du post

Je vois regulierement des questions du type "est-ce que [action] est un bon achat ?". La plupart des reponses parlent du PER. Mais le PER, c'est un raccourci qui peut etre tres trompeur. Voici pourquoi, et comment faire mieux.

**Le probleme du PER**

Le PER (Price to Earnings Ratio) divise le prix de l'action par le benefice par action. Amazon a un PER de 60, Total de 8. Est-ce que Total est 7 fois moins cher qu'Amazon ?

Non. Parce que le PER ne prend pas en compte :
- La croissance future (Amazon croit beaucoup plus vite)
- La qualite des benefices (les benefices d'Amazon sont reinvestis, ceux de Total distribues)
- Le risque (les deux entreprises n'ont pas le meme profil de risque)
- La structure de capital (dette vs fonds propres)

**Le DCF : la methode des pros**

Le Discounted Cash Flow repond a la vraie question : combien vaut cette entreprise ?

L'idee est simple. Une entreprise, c'est une machine a generer de l'argent. Si vous pouvez estimer combien d'argent elle va generer dans le futur, et ramener ca en euros d'aujourd'hui, vous avez sa valeur.

**Les 4 etapes :**

**1. Estimer les Free Cash Flows futurs**

Le Free Cash Flow (FCF), c'est l'argent qui reste apres que l'entreprise a paye toutes ses charges et fait ses investissements. C'est l'argent "libre" — celui qui pourrait etre distribue aux actionnaires.

On prend le FCF actuel et on le projette sur 5 a 10 ans en estimant un taux de croissance.

**2. Calculer le taux d'actualisation (WACC)**

Un euro dans 10 ans vaut moins qu'un euro aujourd'hui. Le WACC (Weighted Average Cost of Capital) est le taux qu'on utilise pour "actualiser" les cash flows futurs. Il depend du cout de la dette et du cout des fonds propres de l'entreprise.

Plus l'entreprise est risquee, plus le WACC est eleve, et plus la valorisation baisse.

**3. Estimer la valeur terminale**

On ne peut pas projeter les cash flows a l'infini annee par annee. Apres la periode de projection (10 ans), on calcule une "valeur terminale" qui represente tout ce que l'entreprise vaudra au-dela.

Attention : la valeur terminale represente souvent 60-80% de la valorisation totale. C'est le parametre le plus sensible du modele.

**4. Faire la somme et comparer**

On additionne tous les cash flows actualises + la valeur terminale actualisee = la valeur intrinseque de l'entreprise.

On divise par le nombre d'actions = la valeur par action.

Si cette valeur est superieure au cours actuel : l'action est potentiellement sous-evaluee.
Si elle est inferieure : potentiellement sur-evaluee.

**Les limites du DCF**

Soyons honnetes :
- Le DCF depend de vos hypotheses. Des hypotheses differentes = des valorisations differentes.
- Il fonctionne mieux pour les entreprises matures avec des cash flows previsibles.
- Pour les startups ou les entreprises en forte croissance, c'est plus approximatif.
- C'est un outil parmi d'autres, pas une boule de cristal.

**La solution : la matrice de sensibilite**

Pour compenser l'incertitude, les pros utilisent des matrices de sensibilite. Au lieu d'un seul chiffre, vous obtenez une fourchette en faisant varier vos hypotheses (croissance + WACC).

C'est infiniment plus utile qu'un seul chiffre de valorisation.

**Pour aller plus loin**

Si vous voulez voir un DCF en action sans vous taper 2 heures d'Excel, j'ai construit un outil gratuit qui le fait automatiquement : valuengine.fr. Tapez n'importe quelle action, vous obtenez le DCF complet avec la matrice de sensibilite en 60 secondes.

Mais surtout, l'important c'est de comprendre la methode. Meme si vous utilisez un outil, vous devez comprendre ce qu'il fait pour interpreter les resultats correctement.

Questions bienvenues.

### Commentaire de suivi

Pour ceux qui veulent approfondir, le cours gratuit de Damodaran (NYU) sur YouTube est la reference absolue. Il enseigne exactement cette methode a ses etudiants en MBA. C'est en anglais mais avec les sous-titres auto ca passe bien.

Et pour la pratique, essayez de faire un DCF sur Excel pour une entreprise que vous connaissez bien avant d'utiliser un outil automatique. Ca vous aidera a comprendre la sensibilite de chaque parametre.

---

## Post 5 : Communautaire (r/vosfinances)

### Titre
Retour d'experience apres 3 mois de stock picking serieux — ce que j'ai appris (et mes erreurs)

### Corps du post

Ca fait maintenant 3 mois que j'ai commence a faire du stock picking "serieusement" — c'est-a-dire en faisant une vraie analyse fondamentale avant chaque achat, au lieu de suivre les recommandations de forums et de newsletters.

Voici mon retour d'experience, avec les chiffres et les lecons.

**Le contexte :**
- Portefeuille total : 80% ETF World (je ne touche pas a ca), 20% stock picking
- Poche stock picking : environ 15 000 EUR
- Objectif : battre le MSCI World sur cette poche (ambitieux, je sais)
- Methode : analyse DCF + analyse qualitative avant chaque achat

**Ce que j'ai achete (et pourquoi) :**

**Position 1 : [Entreprise FR large cap]**
- Analyse DCF : decote de ~20% sur la valeur intrinseque
- Catalyseur identifie : resultats du prochain trimestre attendus au-dessus du consensus
- Resultat : +12% en 3 mois. L'analyse etait bonne.

**Position 2 : [Entreprise tech EU]**
- Analyse DCF : decote de ~35%
- Catalyseur identifie : lancement d'un nouveau produit
- Resultat : -8%. Le produit a ete reporte. La lecon : le timing de marche est imprevisible.

**Position 3 : [Entreprise industrielle]**
- Analyse DCF : correctement evaluee (pas de decote significative)
- J'ai achete quand meme parce que "c'est une belle boite"
- Resultat : +2%. Autant avoir un ETF. Lecon : sans marge de securite, ca ne sert a rien.

**Les lecons :**

1. **La marge de securite, c'est non-negociable.** Si votre DCF dit que l'action vaut 100 EUR et qu'elle cote 95 EUR, ce n'est pas suffisant. Il faut au moins 20-30% de decote pour compenser les erreurs d'estimation.

2. **Les hypotheses comptent plus que le modele.** J'ai passe plus de temps a ajuster des formules Excel qu'a reflechir a la croissance future. C'est l'inverse qu'il faut faire.

3. **L'analyse qualitative est aussi importante que les chiffres.** Comprendre le moat, la qualite du management, les risques reglementaires — ca ne se voit pas dans un tableur.

4. **Ne pas tomber amoureux d'une action.** J'ai garde une position trop longtemps parce que "mon analyse etait bonne". Le marche s'en fiche de votre analyse.

5. **L'humilite est essentielle.** Trois mois, c'est rien. Je ne tire pas de conclusions definitives. Mais le processus est bon, et c'est le processus qui compte.

**Les outils que j'utilise :**

- valuengine.fr pour le DCF automatique et l'analyse IA (disclaimer : c'est mon outil, mais je l'utilise reellement pour mon propre portefeuille)
- Zone Bourse pour les donnees financieres brutes
- Les rapports annuels (oui, il faut les lire, au moins le message du CEO et les annexes)
- Un tableur pour mes propres notes et hypotheses

**La suite :**

Je vais continuer ce journal de bord. Si ca interesse des gens, je peux poster un update dans 3 mois avec les resultats reels. L'idee n'est pas de se vanter mais d'etre transparent sur ce qui marche et ce qui ne marche pas quand on fait du stock picking en tant que particulier.

Vos retours et critiques sont les bienvenus.

### Commentaire de suivi

Quelques precisions suite aux questions :

- Non, je ne recommande PAS le stock picking a tout le monde. Si vous n'avez pas le temps ou l'envie de faire des analyses, un ETF World est probablement la meilleure option.
- Mon objectif n'est pas de devenir trader. C'est d'investir dans des entreprises que je comprends, a un prix que je juge raisonnable.
- Pour ceux qui demandent comment je fais mes DCF : j'utilise valuengine.fr (que j'ai construit justement pour ca) comme point de depart, puis j'ajuste les hypotheses manuellement.
