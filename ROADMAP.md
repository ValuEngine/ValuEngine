# ValuEngine — Audit Complet & Roadmap

> Audit realise le 6 avril 2026 sur l'integralite du codebase.
> Mis a jour le 6 avril 2026 apres execution des 3 corrections critiques.
> Ce document est 100% honnete — pas de bullshit, pas de vanity metrics.

---

## PARTIE 1 — ETAT DES LIEUX COMPLET

### Backend

| Fichier | Role | Etat | Derniere modif majeure |
|---------|------|------|----------------------|
| `backend/main.py` (~1400 lignes) | API FastAPI — 30+ endpoints (analyze, compare, alerts, stripe, screener, portfolio, admin, onboarding) | **Stable mais monolithique** — tout dans un seul fichier. Auth Clerk solide, rate limiting, input sanitization, freemium enforcement. Cache TTL thread-safe. | Avril 2026 |
| `backend/services/ai_analyst.py` (~830 lignes) | 7 fonctions IA (bull/bear, SWOT, PESTLE, deep analysis, anomalies, DCF scenarios, screener, comparison) | **Stable** — toutes les fonctions ont des fallbacks gracieux. Anomaly detection = pure Python (pas d'IA, bon choix). get_comparison_analysis utilise Sonnet, le reste Haiku. **Bug comparison corrige** (avril 2026). | Avril 2026 |
| `backend/services/fmp_data.py` (~500 lignes) | Source de donnees financieres FMP /stable/ avec fallback yfinance | **Stable** — cache multi-niveau (5min quotes, 6h profil, 24h statements). Fallback yfinance automatique. Deep financials 5 ans + analyst targets + revenue segments. | Avril 2026 |
| `backend/services/pdf_generator.py` (~570 lignes) | Generation PDF ReportLab (rapport branded 4 pages) | **Stable** — verdict, metriques, analyse IA, scenarios DCF. Gestion robuste des valeurs nulles. | Mars 2026 |
| `backend/services/email_service.py` (~160 lignes) | Emails transactionnels via Resend (alerte prix + welcome) | **Stable** — templates HTML inline, disclaimer MIF II present. | Mars 2026 |
| `backend/services/email_scheduler.py` (~240 lignes) | Sequences email D+3, D+7, D+30 via cron GitHub Actions | **Fragile** — depend de Supabase REST direct (pas de SDK), queries manuelles. Jamais teste en prod a ma connaissance. | Mars 2026 |
| `backend/tests/test_critical.py` (~500 lignes) | **47 tests** : securite (auth 401/403, webhook Stripe), calculs DCF, validation Pydantic, cache TTL, PDF generation, comparison data structure | **Solide** — bonne couverture securite + webhook + comparison. Manque tests d'integration (endpoints avec donnees reelles). | Avril 2026 |
| `backend/requirements.txt` | 17 dependances | **Stable** — versions pinees. anthropic 0.39.0 pourrait etre mis a jour. | Mars 2026 |

### Frontend

| Fichier | Role | Etat | Derniere modif majeure |
|---------|------|------|----------------------|
| `frontend/app/page.tsx` (~600 lignes) | Landing page marketing — hero, features, FAQ, pricing, community | **Stable** — audit brief termine (testimonials supprimes, Schema.org, MIF II, sous-headline). Composant monolithique. | Avril 2026 |
| `frontend/app/analyze/page.tsx` (~900 lignes) | Page d'analyse principale — DCF, metriques, charts, AI, sensibilite | **Stable mais tres gros** — composant monolithique avec gate Pro, DeepAnalysis, Anomalies, DCFScenarios. Feature-complete. | Avril 2026 |
| `frontend/app/dashboard/page.tsx` (~500 lignes) | Hub utilisateur — analyses recentes, watchlist, market overview, **FirstRunHero** pour les nouveaux users | **Stable** — warmup backend, onboarding modal, pro welcome. FirstRunHero avec tickers populaires (MC.PA, AAPL, TTE.PA, NVDA, AIR.PA, MSFT) pour les dashboards vides. | Avril 2026 |
| `frontend/app/compare/page.tsx` (~315 lignes) | Comparaison 2 actions — metriques + AI comparative (Pro) | **Stable** — paires populaires, blur gate free, CTA. | Avril 2026 |
| `frontend/app/screener/page.tsx` (~305 lignes) | Screener IA en langage naturel — Pro only | **Stable** — suggestions, score matching, cards resultats. | Avril 2026 |
| `frontend/app/portfolio/page.tsx` (~250+ lignes) | Suivi portefeuille + AI insight (Pro) | **Stable** — positions CRUD, prix live, AI diversification. | Avril 2026 |
| `frontend/app/track-record/page.tsx` (~380 lignes) | Historique performance des verdicts | **Fragile** — depend de donnees en BDD qui peuvent etre vides. Chart cumulative, filtres verdict/perf. | Mars 2026 |
| `components/Sidebar.tsx` (~265 lignes) | Navigation principale — routes, Pro badge, Stripe checkout | **Stable** — 3 sections (Main, Tools, Resources), detection route active. | Avril 2026 |
| `components/AppLayout.tsx` (~92 lignes) | Layout wrapper — sidebar, breadcrumbs, usage badge, footer | **Stable** — user sync Supabase best-effort, breadcrumb mapping. | Mars 2026 |

### GTM

| Fichier | Role | Etat |
|---------|------|------|
| `gtm/calendrier-90-jours.md` (~220 lignes) | Plan jour par jour sur 90 jours (Reddit, Twitter, LinkedIn, PH) | **Coherent mais ambitieux** — 3h/jour, 200 signups + 20 Pro. Bien structure en 3 phases. |
| `gtm/tracker-hebdo.md` (~450 lignes) | Tableau de suivi hebdo avec KPIs cibles | **Template vide** — aucune donnee reelle remplie. |

---

## PARTIE 2 — AUDIT HONNETE

### Produit

**1. Features 100% fonctionnelles et testees :**
- Analyse DCF complete (calcul, sensibilite, verdict BUY/HOLD/SELL)
- Bull/Bear AI (Haiku) — rapide, fiable
- SWOT + PESTLE AI
- Deep Analysis avec donnees 5 ans (FMP ou yfinance fallback)
- Detection anomalies (pure Python, pas d'IA — solide)
- DCF 3 scenarios avec narratif IA
- Export PDF (Pro)
- Alertes prix email (Resend)
- Comparaison 2 actions + AI (Pro) — **bug corrige**, donnees transmises correctement a l'IA
- Screener IA langage naturel (Pro)
- Portfolio AI insight (Pro)
- Stripe checkout (monthly/yearly) — **webhook securise** avec `construct_event` + signature verification
- Auth Clerk + freemium 3 analyses/jour
- Share analysis (public link)
- **FirstRunHero** — experience premier lancement avec CTA fort et tickers populaires

**2. Features partiellement implementees :**
- **Track Record** : le code existe et affiche des stats, mais depend de donnees en BDD qui ne sont pas encore suffisantes pour etre credibles. Section masquee sur la landing (bon reflexe).
- **Email sequences D+3/D+7/D+30** : code ecrit, templates prets, mais le cron GitHub Actions n'est probablement pas configure/verifie en prod.
- **Referral system** : endpoint `/api/referral/{id}` existe, page `/referral` existe, mais le mecanisme de tracking `referred_by` n'est pas clairement connecte au flow d'inscription.

**3. Features codees mais jamais testees en prod :**
- Email scheduler (`email_scheduler.py`) — aucune preuve d'execution
- Referral comptage — endpoint existe mais flow incomplet
- Onboarding step tracking (Supabase `onboarding_step` column) — code present, migration peut-etre pas executee

**4. Incoherences entre pages :**
- **Sidebar** mentionne toutes les pages qui existent reellement (Dashboard, Analyze, Compare, Screener, Portfolio, Track Record, Blog). Pas d'incoherence majeure.
- **Notification bell** dans AppLayout est un placeholder non-fonctionnel (pas de backend).
- **Breadcrumb** mapping dans AppLayout ne couvre pas toutes les routes (manque `/blog`, `/referral`, `/success`).

**5. Tunnel complet Landing → Inscription → Dashboard → Analyse → Pro → Paiement :**
- **Landing** : OK, CTA vers `/sign-up` et `/analyze`
- **Inscription** : Clerk, OK
- **Dashboard** : OK, affiche analyses recentes + watchlist. **FirstRunHero** pour les nouveaux users (dashboard vide).
- **Analyse** : OK, gate freemium apres 3/jour
- **Pro CTA** : Present dans Sidebar + pages Pro-gated
- **Paiement** : Stripe checkout fonctionnel (monthly/yearly)
- **Post-paiement** : Webhook Stripe → `construct_event` signature verification → `_sb_patch` users table → `is_pro=true`
- **Verdict** : Le tunnel est complet. Le maillon le plus faible est la **conversion Free→Pro** — le moment "aha" est la, mais l'utilisateur n'a pas encore l'occasion de gouter une feature Pro gratuitement.

### Technique

**6. Tests existants :**
- **47 tests** dans `test_critical.py`
- Couvrent : auth (17 endpoints rejectent sans token), DCF edge cases (zero shares, negative net debt), validation Pydantic (injection, bornes WACC/growth), cache TTL/LRU, PDF generation (3 scenarios), **webhook Stripe** (sans signature → 400, signature invalide → 400), **comparison data structure** (dict plat accepte, donnees reelles presentes)
- **Manquent** : tests d'integration avec donnees reelles, tests frontend (0), tests email scheduler

**7. Endpoints sans tests :**
- `/api/market-overview` — pas teste
- `/api/quotes` et `/api/quote/{ticker}` — pas testes
- `/api/profile/{ticker}` — pas teste
- `/api/user/onboarding-*` — pas teste
- `/api/user/welcome` — pas teste
- Les endpoints admin FMP sont testes (auth 403)

**8. Dette technique evidente :**
- **`main.py` a 1400 lignes** — devrait etre decoupe en routers FastAPI (`alerts_router`, `stripe_router`, `analyze_router`, etc.)
- **Cache duplique** : `TTLCache` dans main.py ET `_FmpCache` dans fmp_data.py — meme implementation exacte, devrait etre mutualisee
- **`analyze/page.tsx` a 900 lignes** — composant monolithique React. Difficile a maintenir.
- **`page.tsx` (landing) a 600 lignes** — idem
- **`_compare_cache`** utilise un simple dict au lieu du TTLCache existant (incoherence)

### GTM

**9. Coherence calendrier 90 jours vs produit :**
- Le produit est **feature-complete** pour le lancement. Le calendrier peut etre execute tel quel.
- Le planning est **ambitieux** (3h/jour, 200 signups en 90 jours) mais realiste si execute avec discipline.
- Les contenus blog existent deja (6 articles en BDD).

**10. Actions GTM necessitant des features non buildees :**
- **Product Hunt** (J46) : necessite un og-image.png (fait ✓), une page About avec photo (fait ✓), des screenshots de qualite (a preparer).
- **Email sequences** (J15+) : code ecrit mais cron pas verifie → **blocker potentiel**.
- **Referral campaign** (J60+) : mecanisme referral pas connecte end-to-end → feature incomplete.

---

## PARTIE 3 — CARTE DES FORCES ET FAIBLESSES

| Dimension | Force | Faiblesse | Priorite |
|-----------|-------|-----------|----------|
| **Securite** | Auth Clerk + JWT verification, input sanitization regex, rate limiting slowapi, owner checks, Sentry monitoring, **Stripe webhook securise** avec `construct_event` + signature verification | Pas de CSRF protection explicite | IMPORTANT |
| **Donnees financieres** | Double source (FMP + yfinance fallback), cache multi-niveau, deep financials 5 ans, analyst targets, revenue segments | yfinance peut etre instable/lent, donnees parfois manquantes pour small caps EU | IMPORTANT |
| **Analyse IA** | 7 modules IA distincts, fallbacks gracieux, anomaly detection sans IA (deterministe, fiable), DCF scenarios bien structures, **comparison_analysis corrige** et fonctionnel | Pas de streaming (reponses longues = attente), cout Anthropic non monitore | IMPORTANT |
| **UX/Onboarding** | Dashboard clair, onboarding modal, warmup backend, popular tickers, suggestions screener, **FirstRunHero** avec CTA fort pour les nouveaux users | Pas de tour guide, notification bell placeholder, pas d'"analyse Pro offerte" au 1er ticker | IMPORTANT |
| **Conversion Free→Pro** | Gate visible partout (blur + lock), CTA dans sidebar, reassurance paiement Stripe, pricing clair | Pas de trial gratuit, pas de "premiere analyse Pro offerte", ratio valeur percue pas assez demontree avant paywall | CRITIQUE |
| **Retention** | Alertes prix, portfolio tracker, email D+3/D+7/D+30, watchlist, analyses sauvegardees | Emails non verifies en prod, pas de notifications push/in-app, pas de weekly digest, dashboard statique | IMPORTANT |
| **Performance** | Cache TTL partout, yfinance fast_info pour quotes, FMP batch-quote | Certaines pages font 3-5 API calls sequentiels au chargement, pas de SSR/ISR pour le SEO, main.py sync (pas async yfinance) | NICE TO HAVE |
| **Tests** | **47 tests** couvrant securite + webhook Stripe + calculs + cache + PDF + comparison | Zero tests frontend, zero tests d'integration, zero tests email, certains endpoints non couverts | IMPORTANT |
| **GTM** | Plan 90 jours detaille, 6 articles blog, templates email, tracker hebdo, **og-image.png** et **photo fondateur** prets | Aucune execution commencee (tracker vide), Product Hunt dans ~6 semaines, pas de contenu social pre-ecrit | CRITIQUE |

---

## PARTIE 4 — ROADMAP STRUCTUREE (8 semaines)

### CRITIQUE — Avant tout lancement public

| # | Tache | Effort | Impact | Statut |
|---|-------|--------|--------|--------|
| C1 | ~~**Fixer le bug get_comparison_analysis**~~ — `_summarize` reecrit pour accepter un dict plat. L'AI recoit maintenant toutes les donnees correctement. | S (1h) | Retention | **✅ FAIT** |
| C2 | ~~**Verifier Stripe webhook signature**~~ — `construct_event` avec signing secret deja implementé. 2 tests ajoutes (sans signature → 400, signature invalide → 400). | S (1h) | Securite | **✅ FAIT** |
| C3 | **Tester et activer les email sequences** — verifier que le cron GitHub Actions tourne, que Supabase a les colonnes requises (`email_sequence_sent`), et que Resend delivre. Tester avec un vrai user. | M (3h) | Retention (D+3/D+7 sont le moment cle pour activer les free users) | A FAIRE |
| C4 | ~~**First-run experience**~~ — FirstRunHero ajoute au dashboard : CTA "Analyse ta premiere action en 60 secondes" avec input ticker, 6 tickers populaires, et stats visuelles. | M (3h) | Conversion | **✅ FAIT** |
| C5 | **Preparer 5 screenshots HD pour Product Hunt** — screenshots reels de : (1) verdict AAPL, (2) DCF interactif, (3) AI bull/bear, (4) screener, (5) comparaison. Format 1270x760. | M (2-3h) | Acquisition (PH = potentiel 500+ signups en 1 jour) | A FAIRE |

### IMPORTANT — Semaines 1-4

| # | Tache | Effort | Impact | Dependances |
|---|-------|--------|--------|-------------|
| I1 | **Decouple main.py en FastAPI routers** — `analyze_router`, `alerts_router`, `stripe_router`, `screener_router`, `admin_router`. Garder main.py comme orchestrateur. | L (1-2 jours) | Maintenabilite (1400 lignes = dette technique majeure) | Aucune |
| I2 | **Ajouter une "analyse gratuite Pro" a l'onboarding** — offrir une deep analysis complete (sans gate) au premier ticker analyse. Montre la valeur Pro immediatement. | M (3-4h) | Conversion Free→Pro (+20-30% attendu) | C4 ✅ |
| I3 | **Weekly digest email** — un email hebdo aux users actifs avec : top 3 verdicts de la semaine, performance du track record, 1 article blog. | M (4-5h) | Retention (ramene les users inactifs) | C3 (emails fonctionnels) |
| I4 | **Tests d'integration backend** — tester `/api/analyze` avec AAPL (mock yfinance), `/api/compare`, `/api/screener/search`. Objectif : les endpoints critiques ne crashent pas. | M (4h) | Stabilite | Aucune |
| I5 | **Connecter le referral end-to-end** — ajouter `?ref=USER_ID` au lien d'invitation, tracker dans Clerk/Supabase, afficher le compteur dans le dashboard. | M (4h) | Acquisition (chaque user Pro invite potentiellement 2-3 personnes) | Aucune |
| I6 | **Ecrire 3 Twitter threads pre-lancement** — threads educatifs (DCF explique, marge de securite, comparaison LVMH vs Hermes) avec CTA subtil vers ValuEngine. | M (3h) | Acquisition (Twitter = 22.5% du plan) | Aucune |

### NICE TO HAVE — Semaines 5-8

| # | Tache | Effort | Impact | Dependances |
|---|-------|--------|--------|-------------|
| N1 | **Streaming IA** — afficher les reponses AI en temps reel (SSE) au lieu d'attendre 5-10s. | L (1-2 jours) | UX (perception de vitesse) | I1 (main.py clean) |
| N2 | **Notifications in-app** — remplacer la cloche placeholder par de vraies notifs : alerte prix declenchee, nouvelle analyse disponible, expiration trial. | L (1-2 jours) | Retention | Backend notif system |
| N3 | **Historique DCF interactif** — slider pour rejouer les hypotheses et voir l'evolution de la valeur intrinseque. Sauvegarder les scenarios. | L (1-2 jours) | Engagement Pro | Aucune |
| N4 | **Page comparaison multi-actions** — etendre la comparaison a 3-5 actions simultanees au lieu de 2. | M (4-5h) | Feature differenciante | Aucune |
| N5 | **Dark/light mode** — le site est full dark, certains users preferent le light mode (surtout sur mobile en plein jour). | M (3-4h) | UX | Aucune |
| N6 | **Monitoring cout IA** — tracker le cout Anthropic par user/endpoint pour optimiser (Haiku vs Sonnet, max_tokens, cache des prompts identiques). | M (3h) | Cout | Aucune |
| N7 | **API publique** — exposer une API documentee pour les power users (rate limited, API key). Revenue stream complementaire. | L (2 jours) | Revenue | I1 |

---

## PARTIE 5 — FICHE DE ROUTE HEBDOMADAIRE

### Semaine 1 (7-13 avril) — Fondations

**Dev :**
1. ~~Fixer le bug comparison_analysis (C1)~~ ✅
2. ~~Verifier Stripe webhook signature (C2)~~ ✅
3. Tester et activer les email sequences (C3)

**GTM :**
1. Creer le compte Twitter @ValuEngine_ (si pas fait)
2. Poster 1 tweet d'introduction + epingler
3. Commencer le karma Reddit (3-5 commentaires utiles sur r/vosfinances)

**Objectif mesurable :** ~~0 bug critique~~ ✅, emails D+3 fonctionnels, compte Twitter actif

---

### Semaine 2 (14-20 avril) — Onboarding & Conversion

**Dev :**
1. ~~First-run experience dashboard vide (C4)~~ ✅
2. "Analyse gratuite Pro" au 1er ticker (I2) — **nouvelle priorite #1**
3. Preparer screenshots Product Hunt (C5)

**GTM :**
1. Publier 1er thread Twitter educatif (DCF explique simplement)
2. 1er post Reddit : "J'ai cree un outil DCF gratuit en francais"
3. Continuer karma Reddit (5 commentaires/jour)

**Objectif mesurable :** Taux d'activation J1 > 60% (= au moins 1 analyse par nouveau user)

---

### Semaine 3 (21-27 avril) — Stabilite

**Dev :**
1. Tests d'integration backend (I4)
2. Decoupe main.py — 1er router `analyze_router` (debut I1)
3. Fix breadcrumb mapping AppLayout

**GTM :**
1. 2eme thread Twitter (marge de securite Graham)
2. 1er article LinkedIn (repost du thread enrichi)
3. 2eme post Reddit (valeur differente)

**Objectif mesurable :** 47+ tests passent en CI, 50 followers Twitter

---

### Semaine 4 (28 avril - 4 mai) — Referral & Retention

**Dev :**
1. Connecter referral end-to-end (I5)
2. Finir decoupage main.py (I1)
3. Weekly digest email (I3)

**GTM :**
1. 3eme thread Twitter (LVMH vs Hermes comparaison)
2. Activer le referral : chaque user voit son lien dans le dashboard
3. Envoyer email a 10 beta-testers pour feedback

**Objectif mesurable :** 20 inscrits cumules, 1er referral genere

---

### Semaine 5 (5-11 mai) — Pre-lancement PH

**Dev :**
1. Page Product Hunt optimisee (headline, description, screenshots)
2. Streaming IA — debut implementation (N1)
3. Buffer de contenu : preparer 3 threads d'avance

**GTM :**
1. Soumettre ValuEngine sur Product Hunt (schedule J46 = ~19 mai)
2. Contacter 20 "hunters" sur Twitter/PH pour du soutien
3. Poster dans 2-3 communautes Discord finance FR

**Objectif mesurable :** Page PH prete, 50 abonnes newsletter/notif PH

---

### Semaine 6 (12-18 mai) — Preparation finale PH

**Dev :**
1. Finir streaming IA (N1)
2. Load testing leger (k6 ou wrk) — s'assurer que Railway tient 100 req concurrentes
3. Fix tout bug remonte par les beta-testers

**GTM :**
1. Thread Twitter "teasing" PH launch
2. DM 30 personnes qui ont like tes tweets precedents
3. Preparer le "maker comment" pour PH

**Objectif mesurable :** Zero crash en charge, 100 notifs PH pre-launch

---

### Semaine 7 (19-25 mai) — LAUNCH WEEK Product Hunt

**Dev :**
1. Monitoring temps reel jour du lancement (Sentry + logs)
2. Corriger les bugs critiques en temps reel
3. Ajouter un bandeau "Featured on Product Hunt" si top 5

**GTM :**
1. **Jour J** : lancer a 00:01 PST, poster sur Twitter/Reddit/LinkedIn/Discord simultanement
2. Repondre a TOUS les commentaires PH dans l'heure
3. Envoyer email a toute la base : "On est sur Product Hunt !"

**Objectif mesurable :** Top 5 PH du jour, 100+ signups en 24h

---

### Semaine 8 (26 mai - 1er juin) — Capitaliser

**Dev :**
1. Notifications in-app (N2) — exploiter l'afflux de nouveaux users
2. Optimiser les conversions Free→Pro (A/B test CTA text)
3. Monitoring cout IA post-lancement (N6)

**GTM :**
1. Thread Twitter "retour d'experience PH" (story)
2. Contacter les journalistes/blogueurs qui ont like le post PH
3. Publier 1 article Substack "Notre premier mois"

**Objectif mesurable :** 150+ inscrits cumules, 10+ Pro, 90+ EUR MRR

---

## PARTIE 6 — LES 3 PROCHAINES ACTIONS (48h)

### 1. Tester et activer les email sequences (C3) — PARCE QUE C'EST LE LEVIER RETENTION #1 — 3h

Le code existe dans `email_scheduler.py` mais n'a jamais ete teste en prod. Verifier : (1) le cron GitHub Actions est configure et tourne, (2) Supabase a les colonnes `email_sequence_sent`, `created_at` dans la table users, (3) Resend delivre reellement les emails D+3 et D+7. Tester avec un vrai user inscrit. Sans ca, les free users qui ne reviennent pas J+3 sont perdus a jamais.

### 2. "Analyse gratuite Pro" au premier ticker (I2) — PARCE QUE C'EST LE MOMENT "AHA" PRO — 3h

Le FirstRunHero est en place (C4 ✅), mais le user qui lance sa premiere analyse ne voit que la version free. Offrir une deep analysis complete (SWOT, PESTLE, DCF scenarios, anomalies) sans gate au premier ticker analyse. Ca montre immediatement la valeur Pro et devrait augmenter la conversion de 20-30%. Dependance : C4 est fait, on peut y aller.

### 3. Preparer 5 screenshots HD pour Product Hunt (C5) — PARCE QUE PH = 500+ SIGNUPS POTENTIELS — 2h

Product Hunt est prevu semaine 7 (~19 mai). Il faut des screenshots reels, pas des maquettes : (1) verdict AAPL avec prix + valeur intrinseque, (2) DCF sensibilite interactif, (3) analyse Bull/Bear IA, (4) screener IA, (5) comparaison 2 actions. Format 1270x760. L'og-image.png et la photo fondateur sont deja prets.

---

*Fichier genere le 6 avril 2026. Mis a jour apres corrections C1, C2, C4. Ne pas deployer — document de planification uniquement.*
