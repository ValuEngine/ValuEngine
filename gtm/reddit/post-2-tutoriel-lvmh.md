# Post 2 — Tutoriel LVMH

## Infos de publication

- **Subreddit principal** : r/vosfinances
- **Meilleur moment** : Mardi 12h30 (heure de Paris) — pause dejeuner, bon engagement sur du contenu educatif
- **Subreddits alternatifs** : r/financefrance, r/bourse, r/investissement, r/frugalisme
- **Flair suggere** : Investissements

---

## Titre A

"Comment j'analyse LVMH en 60 secondes avec un DCF — tutoriel pas a pas"

## Titre B

"J'ai construit un DCF sur LVMH en 60 secondes. Voici comment (et ce que ca donne)."

---

## Corps du post

Salut r/vosfinances,

On parle souvent de LVMH ici (et pour cause, c'est la plus grosse capi du CAC 40). Mais entre "LVMH c'est une belle boite" et "LVMH est correctement valorisee a ce prix", il y a un gouffre. Aujourd'hui, je vous montre comment je fais une analyse DCF rapide sur LVMH, et ce que ca donne.

**C'est quoi un DCF en 30 secondes ?**

Le Discounted Cash Flow, c'est LA methode de valorisation des pros. Le principe : une entreprise vaut la somme de tous les flux de tresorerie qu'elle va generer dans le futur, ramenes en euros d'aujourd'hui. C'est ce que Warren Buffett utilise (en version plus sophistiquee, certes).

**Etape 1 : Les donnees de base**

[screenshot: page d'accueil avec la barre de recherche — on tape "LVMH" ou "MC.PA"]

Je commence par entrer le ticker LVMH. L'outil va automatiquement recuperer :
- Le chiffre d'affaires des 5 dernieres annees
- Les marges operationnelles
- Le free cash flow historique
- La structure du bilan (dette, tresorerie)

[screenshot: tableau resumant les fondamentaux de LVMH — CA, EBITDA, FCF, dette nette sur 5 ans]

Premier constat : le CA de LVMH a ralenti en 2024-2025 par rapport a la croissance folle post-Covid. C'est normal, le luxe est cyclique. Mais les marges restent excellentes, autour de 25-27% de marge operationnelle.

**Etape 2 : Les hypotheses du modele**

C'est LA ou ca devient interessant (et ou la plupart des analyses superficielles s'arretent).

[screenshot: panneau des hypotheses DCF — taux de croissance, WACC, marge terminale, avec curseurs ajustables]

Pour un DCF, il faut definir :
- **Taux de croissance du CA** : j'utilise 7-8% par an sur 5 ans (consensus analyste, un peu conservateur vu la Chine)
- **Marge operationnelle cible** : 26% (stable par rapport a l'historique)
- **WACC** (cout moyen pondere du capital) : 8.5% pour LVMH
- **Taux de croissance terminal** : 2.5% (croissance a l'infini, toujours conservateur)

**Etape 3 : Les scenarios**

C'est ce que j'aime le plus. Au lieu d'un seul chiffre magique, on a trois scenarios :

[screenshot: trois scenarios cote a cote — bear, base, bull — avec la valeur intrinseque pour chacun]

- **Scenario bear** (ralentissement Chine + recul du luxe) : croissance 4%, marge 23%. Valeur intrinseque : ~550 EUR
- **Scenario base** (consensus) : croissance 7%, marge 26%. Valeur intrinseque : ~780 EUR
- **Scenario bull** (rebond Asie + pricing power intact) : croissance 10%, marge 28%. Valeur intrinseque : ~950 EUR

**Etape 4 : Le verdict**

[screenshot: verdict final avec un gauge indicateur — cours actuel vs valeur intrinseque, zone de couleur vert/orange/rouge]

Au cours actuel (~720 EUR en ce moment), LVMH est dans la zone "correctement valorisee a legerement sous-evaluee" selon le scenario de base. Le potentiel de hausse existe surtout si le scenario bull se materialise.

**Ce que le DCF ne dit PAS**

Et c'est important de le preciser :
- Le DCF ne capture pas les acquisitions futures (LVMH est un serial acquirer)
- Il ne tient pas compte du sentiment de marche a court terme
- Les hypotheses sont les votres — changez le WACC de 1 point et la valorisation bouge de 15-20%

C'est pour ca que je dis toujours : le DCF n'est pas une boule de cristal. C'est un cadre de reflexion structure. Ca vous force a expliciter vos hypotheses au lieu de dire "je pense que ca va monter".

**Le processus complet m'a pris environ 60 secondes.** Sur Excel, ca m'aurait pris 2-3 heures pour avoir quelque chose de comparable. J'ai construit un outil qui automatise tout ca parce que j'en avais marre de le faire a la main pour chaque action.

Qu'est-ce que vous en pensez ? Vous faites comment, vous, pour analyser une action avant d'investir ? J'aimerais bien comparer les approches.

---

## Commentaire de suivi (a poster 10-15 min apres le post)

> Plusieurs d'entre vous me demandent l'outil en MP, donc je le mets ici : c'est valuengine.fr
>
> C'est gratuit et il n'y a pas besoin de compte. Vous pouvez tester LVMH ou n'importe quelle autre action du CAC 40 / SBF 120 / actions US. Si vous trouvez des bugs ou des trucs a ameliorer, dites-le moi, ca m'aide enormement.
