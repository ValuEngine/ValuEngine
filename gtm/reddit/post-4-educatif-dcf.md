# Post 4 — Le DCF explique avec une boulangerie

## Infos de publication

- **Subreddit principal** : r/vosfinances
- **Meilleur moment** : Samedi 10h (heure de Paris) — week-end, les gens prennent le temps de lire du contenu educatif
- **Subreddits alternatifs** : r/financefrance, r/investissement, r/frugalisme, r/EuropeFIRE, r/france (si angle "culture financiere")
- **Flair suggere** : Education financiere

---

## Titre A

"Le DCF explique a ma grand-mere — la methode de valorisation de Buffett accessible a tous"

## Titre B

"Vous voulez savoir si une action est chere ou pas chere ? Voici la methode que les pros utilisent, expliquee simplement."

---

## Corps du post

Salut a tous,

Je vois regulierement des posts ici du type "LVMH est-elle trop chere ?" ou "Est-ce le bon moment pour acheter TotalEnergies ?". Et les reponses sont souvent des avis bases sur le feeling, le PER ("c'est pas cher a 15x les benefices") ou le consensus ("les analystes disent que...").

Aujourd'hui j'aimerais vous presenter LA methode de valorisation qu'utilisent les professionnels de la finance depuis des decennies : le DCF (Discounted Cash Flow). Et pour que ce soit comprehensible, on va parler boulangerie.

**La boulangerie de Mamie Jeannine**

Imaginez que votre grand-mere possede une boulangerie. Elle veut prendre sa retraite et vous propose de la racheter. La question : combien ca vaut ?

**Option naive : regarder le prix des murs.** La boutique est estimee a 150 000 EUR par un agent immobilier. Mais est-ce que ca reflete la vraie valeur du business ? Pas forcement. Un local vide ne vaut pas la meme chose qu'une boulangerie qui fait la queue dehors chaque matin.

**Option un peu mieux : regarder les benefices.** La boulangerie fait 30 000 EUR de benefice net par an. A ce rythme, en 5 ans vous avez rembourse 150 000 EUR. Pas mal. Mais c'est simpliste : est-ce que les benefices vont augmenter ? Rester stables ? Baisser si un Ange Boulanger ouvre en face ?

**Option DCF : regarder dans le futur.**

Voici le raisonnement DCF, etape par etape :

**1. Estimer les flux de tresorerie futurs**

Chaque annee, la boulangerie genere du cash apres avoir paye les charges, les impots, les investissements (un nouveau four, la renovation de la vitrine...). C'est le "free cash flow".

Disons :
- Annee 1 : 30 000 EUR
- Annee 2 : 31 500 EUR (+5%, la boulangerie grandit un peu)
- Annee 3 : 33 000 EUR
- Annee 4 : 34 600 EUR
- Annee 5 : 36 300 EUR

**2. Ramener le futur en euros d'aujourd'hui**

Et c'est la l'idee cle du DCF : 30 000 EUR dans 5 ans, ca ne vaut pas 30 000 EUR aujourd'hui. Pourquoi ? Parce que si vous aviez 30 000 EUR maintenant, vous pourriez les placer et gagner des interets. C'est le concept de la "valeur temporelle de l'argent".

On utilise un taux d'actualisation (disons 8%) pour "ramener" chaque flux futur a sa valeur actuelle.

- 30 000 EUR dans 1 an = 27 778 EUR aujourd'hui
- 31 500 EUR dans 2 ans = 27 006 EUR aujourd'hui
- 33 000 EUR dans 3 ans = 26 190 EUR aujourd'hui
- etc.

**3. La valeur terminale — le business continue apres 5 ans**

Votre boulangerie ne va pas s'arreter dans 5 ans (enfin, on espere). Donc on estime une "valeur terminale" : combien valent TOUS les flux de tresorerie au-dela de l'annee 5, en supposant une croissance modeste a l'infini (disons 2%, comme l'inflation).

Avec notre exemple, ca donne une valeur terminale d'environ 300 000 EUR (ramenee en euros d'aujourd'hui).

**4. On additionne tout**

Somme des flux actualises (annees 1 a 5) + valeur terminale = valeur du business.

Dans notre cas : environ 130 000 EUR + 300 000 EUR = **430 000 EUR**.

Mamie Jeannine vous demande 200 000 EUR ? C'est une affaire. Elle demande 500 000 EUR ? C'est trop cher (sauf si vos hypotheses de croissance sont plus optimistes).

**Pourquoi c'est puissant**

Le DCF vous force a vous poser les bonnes questions :
- A quelle vitesse le business va-t-il croitre ?
- Quelles sont les marges realistes ?
- Quel est le risque (qui determine le taux d'actualisation) ?

Au lieu de dire "c'est cher" ou "c'est pas cher" au doigt mouille, vous avez un cadre structure. Et surtout, vous pouvez tester des scenarios : "Et si la croissance n'est que de 3% au lieu de 5% ? Et si un concurrent ouvre en face ?"

**Les limites (parce qu'il y en a)**

- Le DCF est tres sensible aux hypotheses. Changez le taux de croissance de 2 points et la valorisation peut bouger de 30%.
- Il marche mieux pour les entreprises matures avec des cash flows previsibles (LVMH, Air Liquide) que pour les startups tech.
- Ce n'est pas une boule de cristal. C'est un outil de reflexion.

**En pratique, sur une action**

Le principe est exactement le meme que pour la boulangerie, juste avec des chiffres plus gros et quelques subtilites techniques (WACC, beta, structure de capital...). Mais la logique reste identique : combien de cash cette entreprise va-t-elle generer, et combien ca vaut aujourd'hui ?

Il existe des outils qui automatisent tout le calcul pour vous — personnellement, j'utilise valuengine.fr qui fait ca en quelques secondes avec des scenarios bull/bear, mais l'important c'est de comprendre la logique derriere les chiffres.

J'espere que c'etait clair. N'hesitez pas si vous avez des questions, je me ferai un plaisir de repondre.

---

## Commentaire de suivi (a poster 30-45 min apres le post, uniquement si quelqu'un demande un outil)

> Si quelqu'un veut tester un DCF sans se prendre la tete avec Excel, j'utilise valuengine.fr — c'est gratuit et ca fait le calcul automatiquement avec les scenarios. Mais honnetement, commencez par comprendre la methode avec un tableur, c'est le meilleur moyen d'apprendre.
