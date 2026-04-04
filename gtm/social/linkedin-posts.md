# Posts LinkedIn — ValuEngine

---

## Post 1 : Pourquoi j'ai quitte mon job pour construire le Bloomberg des particuliers

---

Il y a un an, j'etais ingenieur avec un bon salaire, une trajectoire de carriere confortable, et un portefeuille d'actions que je gerais le soir apres le travail.

Aujourd'hui, je construis ValuEngine, un outil d'analyse financiere pour les investisseurs particuliers.

Voici pourquoi j'ai fait ce choix, et ce que j'ai appris en chemin.

**Le moment declencheur**

Tout a commence un samedi apres-midi. Je voulais analyser une action que j'avais repere — une entreprise industrielle francaise qui semblait sous-evaluee.

J'ai ouvert Excel. J'ai passe 3 heures a construire un modele DCF. Recuperer les donnees financieres sur Zone Bourse. Projeter les free cash flows. Calculer le WACC. Estimer la valeur terminale. Construire une matrice de sensibilite.

3 heures pour UNE action.

Et j'avais 15 entreprises dans ma watchlist.

J'ai fait le calcul : a 3 heures par action, c'etait 45 heures. Presque une semaine de travail a temps plein. Juste pour l'analyse initiale. Sans compter les mises a jour trimestrielles.

**La decouverte qui m'a frustre**

J'ai ensuite decouvert comment les professionnels travaillent. Les analystes sell-side, les gerants de fonds, les traders de banques d'investissement. Ils ont Bloomberg Terminal (24 000 euros par an). FactSet. Capital IQ. Koyfin Pro.

Ces outils font en quelques clics ce qui me prenait des heures. Modeles de valorisation automatiques. Matrices de sensibilite instantanees. Analyses comparatives entre pairs. Export PDF professionnel.

Le probleme, c'est que ces outils coutent entre 500 et 2 000 euros par mois. C'est le prix d'un loyer dans beaucoup de villes francaises. Aucun investisseur particulier ne peut justifier ce cout.

Et c'est la que l'asymetrie m'a frappe.

Les professionnels prennent des decisions eclairees avec des outils puissants. Les particuliers prennent des decisions a l'aveugle avec des PER et des graphiques. Les deux jouent sur le meme marche.

C'est comme jouer aux echecs contre un adversaire qui voit 10 coups a l'avance quand vous n'en voyez que 2.

**La decision**

J'aurais pu continuer a construire mes modeles Excel le weekend. Beaucoup de gens le font, et c'est respectable.

Mais je me suis dit : si ce probleme me frustre, il frustre probablement des centaines de milliers d'investisseurs particuliers en France. 4 millions de Francais detiennent des actions en direct. Combien d'entre eux font une analyse DCF avant d'acheter ? Probablement moins de 1%.

Pas parce qu'ils ne veulent pas. Parce que c'est trop long, trop complexe, ou trop cher.

J'ai commence a prototyper en parallele de mon travail. Le soir, les weekends. Puis j'ai pris la decision de m'y consacrer a plein temps.

**Ce que j'ai construit**

ValuEngine fait en 60 secondes ce qui prend 3 heures a un analyste :

Un modele DCF complet avec projection des free cash flows, calcul du WACC, et valeur terminale. Une matrice de sensibilite pour voir comment la valorisation evolue selon les hypotheses. Une analyse IA qui genere les arguments bull et bear. Un SWOT et un PESTLE automatiques. Et un rapport PDF exportable, au format professionnel.

Le tout en francais. Et gratuit pour 3 analyses par jour.

**Ce que j'ai appris**

Construire un produit, c'est tres different de construire un modele Excel. Il faut penser a l'experience utilisateur, a la fiabilite des donnees, a la scalabilite technique, au business model.

Mais surtout, j'ai appris que le plus grand defi n'est pas technique. C'est la confiance. Un investisseur doit faire confiance aux chiffres qu'il voit. Nos modeles sont transparents : chaque hypothese est visible et modifiable. Pas de boite noire.

**La suite**

ValuEngine est lance. Les premiers retours sont encourageants. Des investisseurs qui n'avaient jamais fait de DCF de leur vie decouvrent que leurs actions preferees sont peut-etre sur-evaluees. D'autres trouvent des pepites sous-evaluees que le marche ignore.

Ce n'est que le debut. La roadmap est longue : couverture de plus de marches, analyse sectorielle, outils de suivi de portefeuille avances, alertes de valorisation.

Si vous investissez en actions et que vous n'avez jamais calcule la valeur intrinseque de vos positions, essayez valuengine.fr. Tapez le nom d'une action que vous connaissez bien. Si le DCF vous surprend, c'est peut-etre que le marche sait quelque chose que vous ignorez. Ou l'inverse.

Dans les deux cas, mieux vaut savoir.

---

## Post 2 : Les 5 metriques que regardent les gerants de fonds

---

J'ai passe des mois a etudier comment les gerants de fonds professionnels analysent les entreprises avant d'investir.

Voici les 5 metriques qu'ils regardent en priorite — et que la plupart des investisseurs particuliers ignorent completement.

Ce ne sont pas des metriques "secretes". Elles sont dans tous les rapports annuels. Mais personne ne les enseigne aux particuliers.

**Metrique 1 : Le Free Cash Flow (FCF), pas le benefice net**

La plupart des investisseurs particuliers regardent le benefice net. Les pros regardent le Free Cash Flow.

Pourquoi ? Parce que le benefice net est une mesure comptable. Il peut etre manipule par des choix d'amortissement, des provisions, des elements exceptionnels.

Le FCF, c'est l'argent reel. Celui qui entre dans la caisse apres que l'entreprise a paye toutes ses charges et fait tous ses investissements. C'est le cash qu'elle pourrait distribuer a ses actionnaires demain si elle le voulait.

Un FCF en croissance reguliere est le signe d'une entreprise saine. Un benefice net en hausse avec un FCF en baisse est un signal d'alarme.

Comment le calculer : Cash flow operationnel moins les depenses d'investissement (CAPEX). Vous le trouvez dans le tableau des flux de tresorerie du rapport annuel.

**Metrique 2 : Le ROIC (Return on Invested Capital)**

Le ROE (Return on Equity) est la metrique que tout le monde connait. Mais les gerants professionnels preferent le ROIC.

Le ROIC mesure le rendement sur TOUT le capital investi dans l'entreprise : fonds propres ET dette. C'est une mesure plus honnete de la capacite de l'entreprise a creer de la valeur.

Pourquoi c'est important ? Une entreprise peut avoir un ROE eleve simplement parce qu'elle utilise beaucoup de dette (effet de levier). Le ROIC neutralise cet effet.

La regle des pros : un ROIC superieur au WACC (cout du capital) signifie que l'entreprise cree de la valeur. Un ROIC inferieur au WACC signifie qu'elle en detruit, meme si elle affiche des benefices.

C'est aussi le concept central du "moat" (avantage concurrentiel durable) de Warren Buffett : une entreprise avec un ROIC durablement superieur a son WACC possede probablement un moat.

**Metrique 3 : Le taux de conversion du cash**

C'est le ratio entre le Free Cash Flow et le benefice net (FCF / Benefice Net).

Un ratio superieur a 80-90% est excellent. Ca signifie que l'entreprise convertit efficacement ses profits en cash reel.

Un ratio faible (50% ou moins) est un signal d'alerte. Ca peut signifier que l'entreprise investit massivement (pas necessairement mauvais) ou que ses benefices sont gonfles par des elements comptables (mauvais).

Les pros utilisent cette metrique pour valider la qualite des benefices annonces. Si le benefice monte mais que le taux de conversion baisse, il y a un probleme sous-jacent.

**Metrique 4 : Le rapport dette nette / EBITDA**

L'endettement est souvent mesure par le ratio dette/capitaux propres. Mais les gerants de fonds preferent le ratio dette nette / EBITDA.

Pourquoi ? Parce qu'il repond a une question concrete : combien d'annees faudrait-il a l'entreprise pour rembourser toute sa dette avec ses profits operationnels ?

Les seuils habituels chez les gerants :

Moins de 1x : excellente sante financiere, peu de risque.
1x a 3x : situation normale pour la plupart des secteurs.
Plus de 3x : attention, l'entreprise est significativement endetee.
Plus de 5x : zone de danger, sauf pour les secteurs a forte visibilite (utilities, telecom).

C'est une metrique particulierement utile en periode de hausse des taux, car la charge de la dette augmente.

**Metrique 5 : La croissance organique du chiffre d'affaires**

Les pros font une distinction nette entre croissance organique et croissance par acquisition.

La croissance organique — celle qui vient de la hausse des volumes ou des prix sur les activites existantes — est un signe de dynamisme reel.

La croissance par acquisition peut masquer une stagnation du coeur de metier. Elle dilue souvent les actionnaires et genere du goodwill au bilan (qui peut etre devalorise plus tard).

Quand un gerant voit une entreprise dont 80% de la croissance vient d'acquisitions, c'est un signal d'alerte. Il preferera une entreprise qui croit de 6% organiquement a une qui croit de 12% par acquisitions.

**Comment utiliser ces 5 metriques**

Ne regardez pas chaque metrique isolement. Elles se combinent :

Un FCF eleve et en croissance + un ROIC superieur au WACC + un taux de conversion du cash excellent + un endettement maitrise + une croissance organique solide = le profil d'une excellente entreprise.

Si l'une de ces metriques est faible, il faut comprendre pourquoi avant d'investir.

J'ai construit ValuEngine (valuengine.fr) pour rendre exactement cette analyse accessible a tous les investisseurs. Le DCF, la matrice de sensibilite, l'analyse qualitative — tout ce qu'un gerant de fonds utilise, en 60 secondes et en francais.

Mais meme sans outil, integrez ces 5 metriques dans votre processus d'analyse. Vous prendrez de meilleures decisions que 95% des investisseurs particuliers.

---

## Post 3 : Comment l'IA change l'analyse financiere

---

L'intelligence artificielle est en train de transformer profondement l'analyse financiere. Et pour la premiere fois dans l'histoire des marches, cette transformation pourrait beneficier davantage aux investisseurs particuliers qu'aux institutions.

Voici pourquoi — et comment en profiter des maintenant.

**L'analyse financiere avant l'IA**

Pendant des decennies, l'analyse fondamentale d'une entreprise suivait un processus bien defini, appris dans tous les MBA et pratique dans toutes les banques d'investissement.

Un analyste sell-side qui couvre une entreprise va lire le rapport annuel (200 a 500 pages), analyser les comptes financiers sur 5 a 10 ans, construire un modele de valorisation sur Excel, rediger une note de synthese avec une recommandation, et la mettre a jour chaque trimestre.

Ce processus prend des heures par entreprise. Un analyste senior chez JP Morgan ou BNP Paribas couvre typiquement 15 a 20 entreprises. C'est un travail a temps plein, bien paye, et qui demande des annees d'experience.

L'investisseur particulier n'a ni le temps, ni les outils, ni parfois la formation pour reproduire ce processus. Il se contente donc de lire les notes d'analystes (quand elles sont accessibles) ou de suivre des recommandations de seconde main.

**Ce que l'IA change concretement**

L'IA ne remplace pas l'analyste. Mais elle automatise les parties les plus chronophages de son travail, rendant le processus accessible a tous.

Premier changement : la collecte et le traitement des donnees. Un modele DCF necessite de recuperer les donnees financieres, de les nettoyer, de calculer les ratios. Avant, c'etait des heures de travail sur Excel et Bloomberg. Aujourd'hui, une IA peut le faire en quelques secondes, avec une fiabilite comparable.

Deuxieme changement : l'analyse qualitative. C'est peut-etre le plus important. L'IA peut lire les rapports annuels, les transcriptions de conference calls, les articles de presse, et synthetiser les forces, faiblesses, opportunites et menaces d'une entreprise. Ce n'est pas parfait — un analyste experimente avec 20 ans d'experience dans un secteur aura toujours une meilleure intuition. Mais c'est meilleur que ce que 99% des investisseurs particuliers font (c'est-a-dire : rien).

Troisieme changement : la generation de scenarios. L'IA peut construire des cas haussiers et baissiers argumentes, identifier les catalyseurs, quantifier les risques. Elle ne predit pas l'avenir — personne ne le peut. Mais elle structure la reflexion de facon rigoureuse.

**Pourquoi ca profite plus aux particuliers qu'aux institutions**

Les institutions avaient deja des outils puissants. Bloomberg existe depuis 1981. Les modeles quantitatifs existent depuis les annees 90. L'IA ameliore leurs processus a la marge.

Pour les particuliers, c'est un saut quantique. Passer de "je regarde le PER sur Boursorama" a "j'ai un DCF complet avec matrice de sensibilite et analyse qualitative" — c'est une revolution.

L'asymetrie d'information entre professionnels et particuliers, qui existe depuis toujours, commence a se reduire. Pas a disparaitre — les pros auront toujours l'avantage de l'experience et du reseau. Mais l'ecart se reduit significativement.

**Les limites a connaitre**

Soyons clairs sur ce que l'IA ne fait PAS bien en analyse financiere.

Elle ne predit pas l'avenir. Aucun modele, aussi sophistique soit-il, ne peut predire les cours de bourse a court terme. Si quelqu'un vous dit le contraire, c'est faux.

Elle peut halluciner. Les modeles de langage peuvent inventer des chiffres. C'est pourquoi il est crucial que les donnees financieres viennent de sources fiables et verifiees, et que l'IA intervienne uniquement sur l'analyse et l'interpretation.

Elle ne remplace pas le jugement humain. L'IA vous donne les outils pour prendre une decision eclairee. La decision reste la votre. Et elle doit le rester.

Elle a des biais. Les modeles d'IA sont entraines sur des donnees historiques. En periode de rupture (crise financiere, pandemie, revolution technologique), les precedents historiques peuvent etre trompeurs.

**Ce que ca signifie pour vous**

Si vous etes investisseur particulier en 2026, vous n'avez plus d'excuse pour acheter une action sans connaitre sa valeur intrinseque.

Les outils existent. Ils sont accessibles. Certains sont gratuits.

Le processus que je recommande est le suivant. Commencez par le quantitatif : lancez un DCF automatique pour obtenir une fourchette de valorisation. Utilisez la matrice de sensibilite pour comprendre la sensibilite du modele a vos hypotheses. Passez ensuite au qualitatif : lisez l'analyse SWOT et les scenarios bull/bear generes par l'IA. Puis formez votre propre opinion : l'IA vous donne les briques, c'est a vous de construire votre these d'investissement.

C'est exactement ce que fait ValuEngine (valuengine.fr). DCF, matrice de sensibilite, analyse IA, SWOT, PESTLE, export PDF — en 60 secondes, en francais, gratuit pour 3 analyses par jour.

L'IA ne fera pas de vous un meilleur investisseur automatiquement. Mais elle supprime les barrieres qui vous empechaient de faire une analyse serieuse. Le reste — la discipline, la patience, le jugement — ca reste entre vos mains.

Et c'est probablement mieux comme ca.
