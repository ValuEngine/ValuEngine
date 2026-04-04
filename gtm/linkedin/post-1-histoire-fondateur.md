# Post LinkedIn #1 — Histoire du fondateur

**Type :** Article long / post viral
**Objectif :** Notoriete, engagement, premiers utilisateurs
**Ton :** Vulnerable, authentique, storytelling

---

## J'ai passe 6 mois a construire le Bloomberg des particuliers. Voila ce que j'ai appris.

Il y a 6 mois, j'ai eu une revelation qui m'a mis en colere.

J'etais en train de regarder les comptes de resultats d'une entreprise cotee. Je voulais faire une vraie analyse fondamentale. Pas juste regarder un P/E sur Boursorama et prier.

Et la, je me suis rendu compte d'un truc absurde.

Pour faire une analyse serieuse d'une action — un DCF, une analyse SWOT, un screening sur des criteres financiers precis — il faut soit payer Bloomberg a 24 000 euros par an, soit passer des heures sur Excel a compiler des donnees a la main.

24 000 euros par an.

Autrement dit : si t'es pas un professionnel de la finance, t'as pas le droit d'analyser correctement une entreprise.

Ca m'a rendu fou.

---

### Le probleme que personne ne resout

On vit dans un monde ou n'importe qui peut ouvrir un compte-titres en 5 minutes. Les neo-courtiers ont democratise l'acces aux marches. Mais l'acces a l'analyse ? Il est reste bloque en 1995.

Les particuliers investissent a l'aveugle. Ils suivent des "conseils" sur Twitter, des threads Reddit, des videos YouTube de gens qui ont decouvert la bourse il y a 18 mois.

Et les outils qui existent ? Soit c'est trop cher (Bloomberg, FactSet, Capital IQ), soit c'est trop simpliste (les screeners gratuits qui te donnent un P/E et basta).

Il n'y avait rien au milieu.

Alors j'ai decide de le construire.

---

### Les debuts — et les premiers doutes

J'ai commence par le coeur du reacteur : un modele DCF automatise.

Pour ceux qui ne connaissent pas, un DCF (Discounted Cash Flow) c'est LA methode de valorisation utilisee par les pros. Tu projettes les flux de tresorerie futurs d'une entreprise, tu les actualises, et tu obtiens une valeur intrinseque de l'action.

Le probleme : automatiser ca, c'est un cauchemar.

Chaque entreprise a une structure financiere differente. Les donnees sont dans des formats differents. Les hypotheses de croissance dependent du secteur. Et il faut que le modele soit suffisamment robuste pour marcher sur des milliers d'actions sans intervention humaine.

J'ai passe des semaines a debugger des cas limites. Des entreprises avec des structures de capital bizarres. Des secteurs ou les metriques standards ne marchent pas. Des donnees manquantes qu'il fallait estimer intelligemment.

Il y a eu des moments ou je me suis dit : "Laisse tomber. Bloomberg existe depuis 40 ans, c'est pas toi tout seul qui vas resoudre ca."

Mais a chaque fois que je regardais le prix d'un terminal Bloomberg, la colere revenait.

---

### Le pivot qui a tout change : l'IA

Le premier prototype etait purement quantitatif. Un DCF, des ratios, des graphiques. C'etait utile, mais froid. Il manquait quelque chose.

Ce quelque chose, c'etait le qualitatif.

Un bon analyste ne regarde pas que les chiffres. Il comprend la strategie de l'entreprise. Il identifie les risques. Il voit les opportunites que les ratios ne capturent pas.

J'ai decide d'integrer l'IA. Pas comme un gadget marketing. Comme un vrai outil d'analyse.

J'ai construit un systeme qui genere automatiquement :
- Une analyse bull case / bear case pour chaque action
- Une analyse SWOT complete (forces, faiblesses, opportunites, menaces)
- Un resume des catalyseurs a court et moyen terme

Le resultat m'a bluffee. Pas parce que l'IA est parfaite — elle ne l'est pas. Mais parce qu'elle fait en 30 secondes ce qui prendrait 2 heures a un analyste junior.

Et surtout, elle force l'investisseur a considerer les deux cotes de la medaille. Le bull ET le bear. Les forces ET les faiblesses.

---

### Le screener — la piece manquante

Ensuite, j'ai ajoute un screener. Pas un screener basique avec 3 filtres. Un vrai screener multi-criteres qui te permet de filtrer sur les metriques que les pros utilisent reellement.

ROIC, FCF Yield, EV/EBITDA, Debt/EBITDA, Cash Conversion...

Des metriques que 95% des investisseurs particuliers ne connaissent meme pas, parce que personne ne leur en parle.

L'idee c'etait simple : donner aux particuliers les memes outils de screening que les gerants de fonds utilisent au quotidien. Sans le prix qui va avec.

---

### Le moment du lancement

Apres 6 mois de travail, des centaines de commits, des nuits a debugger, des moments de doute profond... ValuEngine est live.

C'est gratuit. Completement gratuit.

Pourquoi gratuit ? Parce que je veux d'abord prouver que ca a de la valeur. Je veux des retours honnetes. Je veux que des vrais investisseurs testent, cassent, critiquent, suggerent.

Je ne veux pas lancer un produit payant dans le vide et esperer que ca marche.

---

### Ce que j'ai appris en 6 mois

1. **Construire seul, c'est dur.** Pas techniquement — ca, ca se gere. C'est la solitude des decisions qui pese. Pas de co-fondateur pour dire "non, c'est une mauvaise idee" ou "oui, continue".

2. **Le parfait est l'ennemi du lance.** J'aurais pu passer encore 6 mois a peaufiner. A un moment, il faut sortir le truc et laisser les utilisateurs decider.

3. **La finance est un domaine ou l'asymetrie d'information est scandaleuse.** Les pros ont des outils a 24K/an. Les particuliers ont... Boursorama. Ce n'est pas normal.

4. **L'IA est un outil formidable si tu sais ce que tu lui demandes.** Le piege c'est de lui faire aveuglément confiance. L'avantage c'est qu'elle te force a structurer ta reflexion.

5. **Les retours des premiers utilisateurs valent de l'or.** Chaque feedback recoit mon attention complete.

---

### Et maintenant ?

ValuEngine est disponible gratuitement sur **valuengine.fr**.

Tu peux analyser n'importe quelle action. Obtenir un DCF automatique, une analyse IA bull/bear, une SWOT, et screener des milliers d'actions sur les metriques qui comptent vraiment.

Si tu investis en bourse — meme un peu — j'aimerais vraiment ton avis.

Pas un "c'est cool" poli. Un vrai retour. Ce qui marche, ce qui ne marche pas, ce qui manque.

C'est comme ca qu'on construit un bon produit.

Le lien est en commentaire. Merci a ceux qui prendront 5 minutes pour tester.

---

**Instructions de publication :**
- Publier en mode "article" LinkedIn pour depasser la limite de caracteres
- Ajouter une image de hero (screenshot de l'interface ValuEngine)
- Premier commentaire : lien vers valuengine.fr
- Hashtags : #fintech #investissement #bourse #startup #entrepreneuriat #finance #ia
- Meilleur moment : mardi ou mercredi, 8h00-9h00
