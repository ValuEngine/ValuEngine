# Post 1 — Histoire du fondateur

## Infos de publication

- **Subreddit principal** : r/vosfinances
- **Meilleur moment** : Dimanche 20h (heure de Paris) — pic d'activite sur r/vosfinances, les gens preparent leur semaine
- **Subreddits alternatifs** : r/financefrance, r/EuropeFIRE, r/investissement, r/startups_fr
- **Flair suggere** : Investissements

---

## Titre A

"J'etais frustre par le manque d'outils d'analyse boursiere accessibles en France. J'ai passe 6 mois a en construire un."

## Titre B

"Bloomberg coute 2000EUR/mois. Zonebourse ne me suffisait plus. J'ai decide de coder ma propre solution."

---

## Corps du post

Salut a tous,

Je voulais partager mon parcours ici parce que je pense que pas mal d'entre vous se reconnaitront dans ma frustration.

**Le point de depart**

J'ai commence a investir en bourse il y a quelques annees. Comme beaucoup, j'ai demarre avec des ETF, puis j'ai voulu comprendre les entreprises individuellement. Le stock picking, quoi. Et la, je me suis heurte a un mur.

Les outils pro (Bloomberg Terminal, FactSet, Refinitiv) coutent entre 1 500 et 2 000 EUR par mois. Autant dire que c'est reserve aux institutionnels. Les outils grand public... c'est mieux que rien, mais on est vite limite. Zonebourse donne des ratios de base, Boursorama c'est bien pour passer des ordres, mais pour faire une vraie analyse fondamentale ? On finit tous sur Excel a recopier des chiffres a la main depuis les rapports annuels.

J'ai passe des heures a construire des modeles DCF sur des Google Sheets. A chaque nouvelle action que je voulais analyser, il fallait tout recommencer. C'etait long, penible, et je faisais probablement des erreurs sans m'en rendre compte.

**Le declic**

Un soir, en pleine session d'analyse sur Air Liquide (oui, on en est tous la), je me suis dit : "Pourquoi personne n'a construit un outil qui fait ca automatiquement, en francais, et qui soit accessible a un particulier normal ?"

J'ai cherche. Il existe des trucs en anglais (Simply Wall St, Koyfin), mais rien de vraiment adapte au marche francais, avec les normes comptables europeennes, les specificites fiscales, et surtout une approche pedagogique.

**6 mois plus tard**

J'ai un background tech, donc j'ai decide de le faire moi-meme. J'ai passe 6 mois a coder un outil qui fait de l'analyse fondamentale assistee par IA. L'idee c'est simple : tu entres un ticker, l'outil va chercher les donnees financieres, construit un modele DCF, propose des scenarios bull/bear, et te donne un verdict avec les hypotheses detaillees.

Ce que j'ai appris en le construisant :

1. **Les donnees financieres fiables et gratuites, ca n'existe presque pas.** C'est un vrai parcours du combattant pour avoir des bilans propres et a jour. Je comprends mieux pourquoi Bloomberg coute si cher.

2. **L'IA est incroyablement utile pour synthetiser, mais dangereuse si on lui fait confiance aveuglément.** J'ai du mettre beaucoup de garde-fous. L'IA aide a analyser les rapports, a identifier les tendances, mais le modele financier doit rester rigoureux.

3. **Le plus dur, c'est de rendre ca simple sans le rendre simpliste.** Je voulais un outil que ma copine (qui n'y connait rien en finance) puisse utiliser, mais qui soit assez profond pour qu'un analyste financier n'ait pas honte de s'en servir.

4. **La communaute francaise d'investisseurs particuliers est bien plus grande que je ne le pensais.** Et elle merite de meilleurs outils.

**Ou j'en suis**

L'outil est fonctionnel et gratuit pour l'instant. Il couvre les principales actions du CAC 40, du SBF 120, et pas mal de valeurs US. C'est encore un projet en cours — il y a des imperfections, des trucs a ameliorer, et je suis le premier a le reconnaitre.

Je cherche surtout des retours honnetes. Si vous etes du genre a passer du temps a analyser des actions, a construire des modeles sur Excel, ou meme si vous debutez et que vous aimeriez comprendre comment valoriser une entreprise, je serais curieux d'avoir votre avis.

Qu'est-ce qui vous manque le plus dans les outils existants ? C'est quoi le truc qui vous frustre le plus quand vous essayez d'analyser une action ?

---

## Commentaire de suivi (a poster 15-20 min apres le post)

> Pour ceux qui demandent, l'outil s'appelle ValuEngine et c'est dispo ici : valuengine.fr
>
> C'est gratuit, pas besoin de creer de compte. Je precise que c'est un side project, pas un produit fini — donc soyez indulgents sur le design, mais les analyses sont solides. N'hesitez pas a me dire ce que vous en pensez, meme (surtout) si c'est pour critiquer.
