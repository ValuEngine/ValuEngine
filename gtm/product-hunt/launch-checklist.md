# Checklist de lancement Product Hunt — ValuEngine

## 1. Preparation (J-14 a J-7)

### Produit
- [ ] S'assurer que le site est stable et supporte un pic de trafic (prevoir x10 le trafic normal)
- [ ] Tester le parcours complet : recherche action > analyse > PDF > inscription
- [ ] Preparer une page d'accueil optimisee avec CTA clair ("Analysez votre premiere action gratuitement")
- [ ] Ajouter un badge "As seen on Product Hunt" pret a activer
- [ ] Verifier que l'onboarding fonctionne sans friction (0 inscription pour les 3 analyses gratuites)
- [ ] Preparer un lien de tracking specifique (UTM) : `?utm_source=producthunt&utm_medium=launch`

### Assets visuels
- [ ] Logo haute resolution (240x240 PNG, fond transparent)
- [ ] Thumbnail/Gallery : 5 images (1270x760) montrant les ecrans cles :
  - Ecran de recherche avec resultat DCF
  - Analyse Bull/Bear IA
  - Matrice SWOT
  - Export PDF ouvert
  - AI Screener en action
- [ ] Video demo de 1-2 minutes (optionnel mais fortement recommande)
- [ ] GIF anime montrant une analyse complete en 60 secondes

### Contenu Product Hunt
- [ ] Tagline finale selectionnee (max 60 caracteres)
- [ ] Description complete relue et corrigee
- [ ] Premier commentaire du maker redige et pret
- [ ] Lien vers le site avec UTM

### Reseau de soutien
- [ ] Identifier 50+ personnes qui voteront le jour J (amis, collegues, communaute)
- [ ] Preparer un message personnalise a envoyer (pas de copier-coller generique)
- [ ] Lister les influenceurs fintech/investissement FR a contacter :
  - Matthieu Louvet (S'investir)
  - Mounir Laggoune (Finary)
  - Yoann Lopez (Snowball)
  - Thomas Music (Music Mates)
  - Les Echos Bourse / Capital
- [ ] Contacter un hunter reconnu pour lancer le produit (optionnel mais benefique)

---

## 2. Veille du lancement (J-1)

### Technique
- [ ] Verifier que le site est UP et performant
- [ ] Activer le monitoring renforce (alertes si downtime)
- [ ] Preparer un canal Slack/Discord pour coordonner l'equipe en temps reel
- [ ] S'assurer que les emails transactionnels fonctionnent (confirmation, bienvenue)

### Communication
- [ ] Pre-rediger les messages pour chaque communaute (Reddit, Twitter, LinkedIn)
- [ ] Preparer 10 reponses types pour les questions frequentes :
  - "Comment calculez-vous le DCF ?"
  - "D'ou viennent vos donnees financieres ?"
  - "Quelle est la precision de votre IA ?"
  - "Pourquoi c'est gratuit ?"
  - "En quoi c'est different de Simply Wall St ?"
  - "Vous couvrez quelles bourses ?"
  - "Les donnees sont en temps reel ?"
  - "Comment fonctionne le screener IA ?"
  - "Vous avez une app mobile ?"
  - "C'est securise ? Mes donnees ?"

### Personnel
- [ ] Bloquer toute la journee du lendemain — zero autre engagement
- [ ] Preparer cafe, eau, snacks — la journee sera longue
- [ ] Definir les roles si equipe : qui repond aux commentaires PH, qui gere Reddit, qui gere Twitter

---

## 3. Jour du lancement (J-Jour)

### Matin (00h01 - 08h00 PST / 09h01 - 17h00 Paris)
- [ ] **00h01 PST** : Le produit est live sur Product Hunt
- [ ] Poster immediatement le premier commentaire du maker
- [ ] Envoyer le lien PH au reseau de soutien via messages personnalises
- [ ] **Ne PAS demander explicitement de voter** (contre les regles PH) — dire "On vient de lancer, j'adorerais ton avis"
- [ ] Poster sur Twitter/X avec lien PH
- [ ] Poster sur LinkedIn (post personnel, pas page entreprise)

### Apres-midi (08h00 - 16h00 PST / 17h00 - 01h00 Paris)
- [ ] Repondre a CHAQUE commentaire sur Product Hunt en moins de 30 minutes
- [ ] Poster sur Reddit (r/vosfinances, r/investisseurs) — version value-add, pas promo
- [ ] Partager dans les communautes :
  - Discord Finary
  - Forum Hardware.fr (section finance)
  - Groupe Facebook "Investissement Bourse France"
  - Slack/Discord fintech FR
- [ ] Monitorer les metriques en temps reel (cf. section KPIs)
- [ ] Retweeter/partager les mentions positives
- [ ] Si bug signale : corriger en priorite absolue et repondre publiquement

### Soir (16h00+ PST)
- [ ] Continuer a repondre aux commentaires
- [ ] Poster un tweet de remerciement avec les stats du jour
- [ ] Preparer le contenu du lendemain

---

## 4. Comment repondre aux commentaires Product Hunt

### Principes
1. **Repondre a tout le monde** — sans exception
2. **Etre authentique** — pas de language corporate
3. **Remercier sincerement** — chaque commentaire compte
4. **Etre transparent** — si quelque chose ne marche pas, l'admettre
5. **Montrer la roadmap** — les gens aiment voir ou va le produit

### Exemples de reponses

**Commentaire positif :**
> "Merci beaucoup ! Ca me fait plaisir que le DCF soit clair. Si tu as des suggestions pour ameliorer l'experience, n'hesite vraiment pas — on itere vite."

**Question technique :**
> "Bonne question ! Nos donnees financieres viennent de [source]. Le modele DCF utilise les free cash flows des 5 derniers exercices pour projeter sur 10 ans. Le WACC est calcule automatiquement mais tu peux l'ajuster manuellement. Tu veux que je t'explique un point en particulier ?"

**Critique constructive :**
> "Tu as tout a fait raison, c'est un point qu'on doit ameliorer. On l'ajoute dans notre backlog pour la prochaine iteration. Merci de l'avoir signale — c'est exactement pour ca qu'on lance aujourd'hui, pour avoir ces retours."

**Comparaison avec un concurrent :**
> "Bonne comparaison ! [Concurrent] fait un excellent travail sur [point]. Notre approche est differente sur [point de differenciation]. L'ideal c'est de tester les deux et de voir ce qui correspond le mieux a ton workflow."

---

## 5. Communautes a notifier (par ordre de priorite)

| Communaute | Plateforme | Timing | Type de contenu |
|---|---|---|---|
| r/vosfinances | Reddit | J-Jour, apres-midi | Post tutorial (pas promo) |
| r/investisseurs | Reddit | J+1 | Post discussion |
| Finary Community | Discord | J-Jour, matin | Message authentique |
| Hardware.fr Finance | Forum | J-Jour | Thread detaille |
| Twitter FR Finance | Twitter/X | J-Jour, matin | Thread educatif |
| LinkedIn | LinkedIn | J-Jour, matin | Post personnel |
| Slack La French Tech | Slack | J-Jour | Message court |
| Indie Hackers | Web | J-Jour | Post maker story |
| Hacker News | Web | J+1 (si top 5 PH) | Show HN |
| Facebook Bourse FR | Facebook | J-Jour | Post communautaire |

---

## 6. KPIs a suivre

### Jour du lancement
| Metrique | Objectif minimum | Objectif ambitieux |
|---|---|---|
| Upvotes Product Hunt | 200 | 500+ (Top 5) |
| Visiteurs uniques (site) | 2 000 | 10 000 |
| Analyses lancees | 500 | 2 000 |
| Inscriptions (compte cree) | 100 | 500 |
| Conversions Pro | 5 | 25 |
| Commentaires PH | 30 | 80+ |

### Semaine suivante (J+1 a J+7)
| Metrique | Objectif |
|---|---|
| Retention J+1 | > 20% des inscrits reviennent |
| Retention J+7 | > 10% des inscrits reviennent |
| Taux de conversion free > Pro | > 2% |
| NPS (si sondage envoye) | > 40 |
| Mentions presse/blogs | 2+ articles |

### Outils de suivi
- **Google Analytics 4** : trafic, sources, parcours utilisateur
- **Mixpanel/Amplitude** : evenements produit (analyse lancee, PDF genere, etc.)
- **Product Hunt dashboard** : upvotes, commentaires, rang
- **Twitter/X** : mentions, impressions via TweetDeck ou Typefully
- **Hotjar** : enregistrements de session pour comprendre les frictions

---

## 7. Post-lancement (J+1 a J+7)

- [ ] Envoyer un email de remerciement aux premiers utilisateurs
- [ ] Publier un thread Twitter "Retour sur notre lancement PH — les chiffres"
- [ ] Rediger un post LinkedIn avec les enseignements
- [ ] Contacter les journalistes/blogueurs qui ont montre de l'interet
- [ ] Analyser les retours utilisateurs et prioriser les ameliorations
- [ ] Planifier la V2 en fonction des feedbacks recus
- [ ] Si Top 5 du jour : utiliser le badge "Top 5 Product Hunt" partout
