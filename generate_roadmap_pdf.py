#!/usr/bin/env python3
"""Generate ROADMAP.pdf from ROADMAP.md content."""

from fpdf import FPDF

class RoadmapPDF(FPDF):
    GOLD = (201, 168, 76)
    DARK = (24, 24, 27)
    WHITE = (255, 255, 255)
    GRAY = (161, 161, 170)
    GREEN = (74, 222, 128)
    RED = (248, 113, 113)

    def header(self):
        if self.page_no() > 1:
            self.set_font("DejaVu", "I", 8)
            self.set_text_color(*self.GRAY)
            self.cell(0, 10, "ValuEngine — Audit Complet & Roadmap", align="R")
            self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("DejaVu", "I", 8)
        self.set_text_color(*self.GRAY)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

    def section_title(self, text):
        self.ln(6)
        self.set_font("DejaVu", "B", 14)
        self.set_text_color(*self.GOLD)
        self.cell(0, 10, text)
        self.ln(8)
        # Gold line
        self.set_draw_color(*self.GOLD)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def subsection_title(self, text):
        self.ln(4)
        self.set_font("DejaVu", "B", 11)
        self.set_text_color(*self.WHITE)
        self.cell(0, 8, text)
        self.ln(7)

    def body_text(self, text, bold=False, color=None):
        self.set_font("DejaVu", "B" if bold else "", 9)
        self.set_text_color(*(color or self.WHITE))
        self.multi_cell(0, 5, text)
        self.ln(1)

    def bullet(self, text, done=False):
        self.set_font("DejaVu", "", 9)
        prefix = "  [OK]  " if done else "  •  "
        color = self.GREEN if done else self.WHITE
        self.set_text_color(*color)
        x = self.get_x()
        self.cell(10, 5, prefix)
        self.set_text_color(*self.WHITE)
        self.multi_cell(0, 5, text)
        self.ln(0.5)

    def table_header(self, cols, widths):
        self.set_font("DejaVu", "B", 8)
        self.set_fill_color(39, 39, 42)
        self.set_text_color(*self.GOLD)
        for i, col in enumerate(cols):
            self.cell(widths[i], 7, col, border=1, fill=True, align="C")
        self.ln()

    def table_row(self, cells, widths, highlight=False):
        self.set_font("DejaVu", "", 7.5)
        fill_color = (39, 39, 42) if highlight else (30, 30, 34)
        self.set_fill_color(*fill_color)
        self.set_text_color(*self.WHITE)

        max_lines = 1
        for i, cell in enumerate(cells):
            lines = self.multi_cell(widths[i], 5, cell, dry_run=True, output="LINES")
            max_lines = max(max_lines, len(lines))

        row_h = max(7, max_lines * 5)
        y_start = self.get_y()

        if y_start + row_h > 275:
            self.add_page()
            y_start = self.get_y()

        for i, cell in enumerate(cells):
            x = 10 + sum(widths[:i])
            self.set_xy(x, y_start)
            self.multi_cell(widths[i], 5, cell, border=1, fill=True)

        self.set_y(y_start + row_h)

    def status_badge(self, text, done=False):
        if done:
            return f"[OK] {text}"
        return text

def build_pdf():
    pdf = RoadmapPDF(orientation="P", unit="mm", format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.set_fill_color(*RoadmapPDF.DARK)

    # Add Unicode fonts
    pdf.add_font("DejaVu", "", "/System/Library/Fonts/Supplemental/Arial.ttf", uni=True)
    pdf.add_font("DejaVu", "B", "/System/Library/Fonts/Supplemental/Arial Bold.ttf", uni=True)
    pdf.add_font("DejaVu", "I", "/System/Library/Fonts/Supplemental/Arial Narrow Italic.ttf", uni=True)
    pdf.add_font("DejaVu", "BI", "/System/Library/Fonts/Supplemental/Arial Bold Italic.ttf", uni=True)

    # Cover page
    pdf.add_page()
    pdf.rect(0, 0, 210, 297, style="F")

    pdf.ln(60)
    pdf.set_font("DejaVu", "B", 32)
    pdf.set_text_color(*RoadmapPDF.GOLD)
    pdf.cell(0, 15, "ValuEngine", align="C")
    pdf.ln(18)
    pdf.set_font("DejaVu", "", 16)
    pdf.set_text_color(*RoadmapPDF.WHITE)
    pdf.cell(0, 10, "Audit Complet & Roadmap", align="C")
    pdf.ln(20)

    pdf.set_draw_color(*RoadmapPDF.GOLD)
    pdf.set_line_width(0.8)
    pdf.line(60, pdf.get_y(), 150, pdf.get_y())
    pdf.ln(15)

    pdf.set_font("DejaVu", "I", 10)
    pdf.set_text_color(*RoadmapPDF.GRAY)
    pdf.cell(0, 7, "Audit realise le 6 avril 2026 sur l'integralite du codebase.", align="C")
    pdf.ln(7)
    pdf.cell(0, 7, "Mis a jour apres execution des 3 corrections critiques.", align="C")
    pdf.ln(7)
    pdf.cell(0, 7, "100% honnete — pas de bullshit, pas de vanity metrics.", align="C")
    pdf.ln(25)

    # Progress summary on cover
    pdf.set_font("DejaVu", "B", 11)
    pdf.set_text_color(*RoadmapPDF.GOLD)
    pdf.cell(0, 8, "Progression Critique", align="C")
    pdf.ln(10)

    items = [
        ("C1 — Bug comparison IA", True),
        ("C2 — Webhook Stripe securise", True),
        ("C3 — Email sequences D+3/D+7", False),
        ("C4 — First-run experience", True),
        ("C5 — Screenshots Product Hunt", False),
    ]
    for label, done in items:
        pdf.set_font("DejaVu", "", 10)
        color = RoadmapPDF.GREEN if done else RoadmapPDF.RED
        status = "[v] FAIT" if done else "○ A FAIRE"
        pdf.set_text_color(*color)
        pdf.cell(95, 7, f"    {status}", align="R")
        pdf.set_text_color(*RoadmapPDF.WHITE)
        pdf.cell(95, 7, f"   {label}")
        pdf.ln(7)

    pdf.ln(10)
    pdf.set_font("DejaVu", "", 9)
    pdf.set_text_color(*RoadmapPDF.GRAY)
    pdf.cell(0, 7, "47 tests | 30+ endpoints | 14 features live | 8 semaines roadmap", align="C")

    # =========================================
    # PARTIE 1
    # =========================================
    pdf.add_page()
    pdf.rect(0, 0, 210, 297, style="F")
    pdf.section_title("PARTIE 1 — ETAT DES LIEUX COMPLET")

    pdf.subsection_title("Backend")
    cols = ["Fichier", "Role", "Etat"]
    w = [45, 65, 80]
    pdf.table_header(cols, w)

    backend_rows = [
        ["main.py (~1400 l.)", "API FastAPI — 30+ endpoints", "Stable mais monolithique. Auth Clerk, rate limiting, cache TTL."],
        ["ai_analyst.py (~830 l.)", "7 fonctions IA (bull/bear, SWOT, PESTLE, deep, anomalies, DCF, comparison)", "Stable. Bug comparison corrige (avril 2026). Fallbacks gracieux."],
        ["fmp_data.py (~500 l.)", "Donnees financieres FMP + fallback yfinance", "Stable. Cache multi-niveau (5min/6h/24h). Deep financials 5 ans."],
        ["pdf_generator.py (~570 l.)", "PDF ReportLab branded 4 pages", "Stable. Gestion robuste valeurs nulles."],
        ["email_service.py (~160 l.)", "Emails Resend (alertes + welcome)", "Stable. Templates HTML, disclaimer MIF II."],
        ["email_scheduler.py (~240 l.)", "Sequences D+3/D+7/D+30 cron", "FRAGILE. Supabase REST direct. Jamais teste en prod."],
        ["test_critical.py (~500 l.)", "47 tests : securite, DCF, webhook, comparison", "Solide. Manque tests integration."],
        ["requirements.txt", "17 dependances", "Stable. Versions pinees."],
    ]
    for i, row in enumerate(backend_rows):
        pdf.table_row(row, w, highlight=(i % 2 == 0))

    pdf.ln(5)
    pdf.subsection_title("Frontend")
    cols = ["Fichier", "Role", "Etat"]

    frontend_rows = [
        ["page.tsx (~600 l.)", "Landing marketing", "Stable. Audit brief termine (Schema.org, MIF II)."],
        ["analyze/page.tsx (~900 l.)", "Analyse DCF + charts + AI", "Stable mais monolithique. Feature-complete."],
        ["dashboard/page.tsx (~500 l.)", "Hub user + FirstRunHero", "Stable. FirstRunHero pour dashboards vides."],
        ["compare/page.tsx (~315 l.)", "Comparaison 2 actions + AI", "Stable. Paires populaires, blur gate."],
        ["screener/page.tsx (~305 l.)", "Screener IA langage naturel", "Stable. Pro only."],
        ["portfolio/page.tsx (~250 l.)", "Suivi portefeuille + AI", "Stable. CRUD, prix live."],
        ["track-record (~380 l.)", "Historique verdicts", "Fragile. Depend de donnees BDD."],
        ["Sidebar.tsx (~265 l.)", "Navigation principale", "Stable. 3 sections, route active."],
    ]
    pdf.table_header(cols, w)
    for i, row in enumerate(frontend_rows):
        pdf.table_row(row, w, highlight=(i % 2 == 0))

    # =========================================
    # PARTIE 2
    # =========================================
    pdf.add_page()
    pdf.rect(0, 0, 210, 297, style="F")
    pdf.section_title("PARTIE 2 — AUDIT HONNETE")

    pdf.subsection_title("Features 100% fonctionnelles (14)")
    features = [
        "Analyse DCF complete (calcul, sensibilite, verdict BUY/HOLD/SELL)",
        "Bull/Bear AI (Haiku) — rapide, fiable",
        "SWOT + PESTLE AI",
        "Deep Analysis avec donnees 5 ans (FMP ou yfinance fallback)",
        "Detection anomalies (pure Python, deterministe)",
        "DCF 3 scenarios avec narratif IA",
        "Export PDF (Pro)",
        "Alertes prix email (Resend)",
        "Comparaison 2 actions + AI (Pro) — bug corrige",
        "Screener IA langage naturel (Pro)",
        "Portfolio AI insight (Pro)",
        "Stripe checkout (monthly/yearly) — webhook securise",
        "Auth Clerk + freemium 3 analyses/jour + Share analysis",
        "FirstRunHero — CTA fort pour les nouveaux users",
    ]
    for f in features:
        pdf.bullet(f, done=True)

    pdf.ln(3)
    pdf.subsection_title("Features partiellement implementees")
    partial = [
        "Track Record : code OK, donnees BDD insuffisantes. Section masquee (bon reflexe).",
        "Email sequences D+3/D+7/D+30 : code ecrit, cron pas verifie en prod.",
        "Referral system : endpoints existent, tracking pas connecte au flow inscription.",
    ]
    for p in partial:
        pdf.bullet(p)

    pdf.ln(3)
    pdf.subsection_title("Tunnel Landing > Inscription > Dashboard > Analyse > Pro > Paiement")
    pdf.body_text("Le tunnel est COMPLET. Chaque etape fonctionne. Le maillon le plus faible : la conversion Free>Pro. L'utilisateur n'a pas encore l'occasion de gouter une feature Pro gratuitement (I2 a venir).")

    pdf.ln(3)
    pdf.subsection_title("Tests : 47 couvrent")
    tests = [
        "Auth : 17 endpoints rejettent sans token",
        "DCF : edge cases (zero shares, negative net debt)",
        "Validation : injection, bornes WACC/growth (Pydantic)",
        "Cache : TTL + LRU",
        "PDF : 3 scenarios de generation",
        "Webhook Stripe : sans signature > 400, signature invalide > 400",
        "Comparison : dict plat accepte, donnees reelles presentes",
    ]
    for t in tests:
        pdf.bullet(t, done=True)

    pdf.body_text("\nManquent : tests integration (donnees reelles), tests frontend (0), tests email scheduler.", color=RoadmapPDF.RED)

    pdf.ln(3)
    pdf.subsection_title("Dette technique")
    dettes = [
        "main.py a 1400 lignes — devrait etre decoupe en routers FastAPI",
        "Cache duplique : TTLCache dans main.py ET _FmpCache dans fmp_data.py",
        "analyze/page.tsx a 900 lignes — composant monolithique React",
        "_compare_cache utilise un simple dict au lieu du TTLCache existant",
    ]
    for d in dettes:
        pdf.bullet(d)

    # =========================================
    # PARTIE 3
    # =========================================
    pdf.add_page()
    pdf.rect(0, 0, 210, 297, style="F")
    pdf.section_title("PARTIE 3 — FORCES ET FAIBLESSES")

    cols3 = ["Dimension", "Force", "Faiblesse", "Prio"]
    w3 = [28, 62, 62, 18]
    pdf.table_header(cols3, w3)

    strengths = [
        ["Securite", "Clerk JWT, sanitization, rate limiting, Stripe webhook construct_event", "Pas de CSRF explicite", "IMPORTANT"],
        ["Donnees", "FMP + yfinance fallback, cache multi-niveau, deep financials 5 ans", "yfinance instable, small caps EU", "IMPORTANT"],
        ["Analyse IA", "7 modules, fallbacks, anomaly detect deterministe, comparison corrige", "Pas de streaming, cout non monitore", "IMPORTANT"],
        ["UX", "Dashboard, onboarding modal, FirstRunHero, warmup backend", "Pas de tour guide, notif bell placeholder", "IMPORTANT"],
        ["Conversion", "Gate partout, CTA sidebar, Stripe, pricing clair", "Pas de trial, pas d'analyse Pro offerte", "CRITIQUE"],
        ["Retention", "Alertes, portfolio, emails D+3/7/30, watchlist", "Emails non verifies prod, pas de weekly digest", "IMPORTANT"],
        ["Tests", "47 tests : securite + webhook + DCF + PDF + comparison", "0 frontend, 0 integration, 0 email", "IMPORTANT"],
        ["GTM", "Plan 90j, 6 articles, og-image + photo fondateur", "Aucune execution, PH dans 6 semaines", "CRITIQUE"],
    ]
    for i, row in enumerate(strengths):
        pdf.table_row(row, w3, highlight=(i % 2 == 0))

    # =========================================
    # PARTIE 4
    # =========================================
    pdf.add_page()
    pdf.rect(0, 0, 210, 297, style="F")
    pdf.section_title("PARTIE 4 — ROADMAP STRUCTUREE (8 semaines)")

    pdf.subsection_title("CRITIQUE — Avant tout lancement public")
    cols4 = ["#", "Tache", "Effort", "Impact", "Statut"]
    w4 = [8, 95, 18, 35, 24]
    pdf.table_header(cols4, w4)

    critiques = [
        ["C1", "Fix bug get_comparison_analysis — _summarize reecrit pour dict plat", "S (1h)", "Retention", "FAIT [v]"],
        ["C2", "Webhook Stripe — construct_event deja implemente, 2 tests ajoutes", "S (1h)", "Securite", "FAIT [v]"],
        ["C3", "Tester email sequences — cron GitHub Actions + Supabase + Resend", "M (3h)", "Retention", "A FAIRE"],
        ["C4", "First-run experience — FirstRunHero avec 6 tickers populaires", "M (3h)", "Conversion", "FAIT [v]"],
        ["C5", "5 screenshots HD Product Hunt — format 1270x760", "M (2-3h)", "Acquisition", "A FAIRE"],
    ]
    for i, row in enumerate(critiques):
        pdf.table_row(row, w4, highlight=(i % 2 == 0))

    pdf.ln(5)
    pdf.subsection_title("IMPORTANT — Semaines 1-4")
    cols4b = ["#", "Tache", "Effort", "Impact", "Dep."]
    pdf.table_header(cols4b, w4)

    importants = [
        ["I1", "Decoupe main.py en FastAPI routers", "L (1-2j)", "Maintenabilite", "Aucune"],
        ["I2", "Analyse gratuite Pro au 1er ticker (onboarding)", "M (3-4h)", "Conversion +20-30%", "C4 [v]"],
        ["I3", "Weekly digest email (top verdicts + blog)", "M (4-5h)", "Retention", "C3"],
        ["I4", "Tests integration backend (analyze, compare, screener)", "M (4h)", "Stabilite", "Aucune"],
        ["I5", "Referral end-to-end (?ref=USER_ID + compteur)", "M (4h)", "Acquisition", "Aucune"],
        ["I6", "3 Twitter threads pre-lancement (DCF, Graham, LVMH)", "M (3h)", "Acquisition", "Aucune"],
    ]
    for i, row in enumerate(importants):
        pdf.table_row(row, w4, highlight=(i % 2 == 0))

    pdf.ln(5)
    pdf.subsection_title("NICE TO HAVE — Semaines 5-8")
    pdf.table_header(cols4b, w4)

    nice = [
        ["N1", "Streaming IA (SSE temps reel)", "L (1-2j)", "UX vitesse", "I1"],
        ["N2", "Notifications in-app (remplacer cloche placeholder)", "L (1-2j)", "Retention", "Backend"],
        ["N3", "Historique DCF interactif (slider hypotheses)", "L (1-2j)", "Engagement Pro", "Aucune"],
        ["N4", "Comparaison multi-actions (3-5 au lieu de 2)", "M (4-5h)", "Differenciation", "Aucune"],
        ["N5", "Dark/light mode toggle", "M (3-4h)", "UX", "Aucune"],
        ["N6", "Monitoring cout IA (Anthropic par user/endpoint)", "M (3h)", "Cout", "Aucune"],
        ["N7", "API publique documentee (rate limited, API key)", "L (2j)", "Revenue", "I1"],
    ]
    for i, row in enumerate(nice):
        pdf.table_row(row, w4, highlight=(i % 2 == 0))

    # =========================================
    # PARTIE 5
    # =========================================
    pdf.add_page()
    pdf.rect(0, 0, 210, 297, style="F")
    pdf.section_title("PARTIE 5 — FICHE DE ROUTE HEBDOMADAIRE")

    weeks = [
        ("Semaine 1 (7-13 avril) — Fondations",
         ["[OK] Fixer bug comparison_analysis (C1)", "[OK] Verifier Stripe webhook (C2)", "Tester email sequences (C3)"],
         ["Creer compte Twitter @ValuEngine_", "1 tweet intro + epingler", "Karma Reddit (3-5 commentaires r/vosfinances)"],
         "0 bug critique [OK], emails D+3, compte Twitter"),
        ("Semaine 2 (14-20 avril) — Onboarding & Conversion",
         ["[OK] First-run experience (C4)", "Analyse gratuite Pro 1er ticker (I2)", "Screenshots Product Hunt (C5)"],
         ["1er thread Twitter educatif (DCF)", "1er post Reddit", "Karma Reddit (5/jour)"],
         "Activation J1 > 60%"),
        ("Semaine 3 (21-27 avril) — Stabilite",
         ["Tests integration backend (I4)", "Debut decoupe main.py (I1)", "Fix breadcrumb AppLayout"],
         ["2e thread Twitter (Graham)", "1er article LinkedIn", "2e post Reddit"],
         "47+ tests CI, 50 followers Twitter"),
        ("Semaine 4 (28 avr - 4 mai) — Referral & Retention",
         ["Referral end-to-end (I5)", "Finir decoupe main.py (I1)", "Weekly digest email (I3)"],
         ["3e thread Twitter (LVMH vs Hermes)", "Activer referral dashboard", "Email 10 beta-testers"],
         "20 inscrits, 1er referral"),
        ("Semaine 5 (5-11 mai) — Pre-lancement PH",
         ["Page Product Hunt optimisee", "Streaming IA debut (N1)", "Buffer 3 threads"],
         ["Soumettre PH (schedule J46)", "Contacter 20 hunters", "Discord finance FR"],
         "Page PH prete, 50 notifs"),
        ("Semaine 6 (12-18 mai) — Prep finale PH",
         ["Finir streaming IA (N1)", "Load testing (k6/wrk)", "Fix bugs beta-testers"],
         ["Thread teasing PH", "DM 30 personnes", "Maker comment PH"],
         "0 crash en charge, 100 notifs PH"),
        ("Semaine 7 (19-25 mai) — LAUNCH WEEK",
         ["Monitoring temps reel (Sentry)", "Fix bugs critiques live", "Bandeau 'Featured on PH'"],
         ["Jour J : 00:01 PST multi-canal", "Repondre TOUS commentaires PH", "Email toute la base"],
         "Top 5 PH, 100+ signups/24h"),
        ("Semaine 8 (26 mai - 1 juin) — Capitaliser",
         ["Notifications in-app (N2)", "A/B test CTA conversion", "Monitoring cout IA (N6)"],
         ["Thread retour PH (story)", "Contacter journalistes/blogueurs", "Article Substack"],
         "150+ inscrits, 10+ Pro, 90+ EUR MRR"),
    ]

    for title, dev, gtm, objectif in weeks:
        if pdf.get_y() > 230:
            pdf.add_page()
            pdf.rect(0, 0, 210, 297, style="F")

        pdf.set_font("DejaVu", "B", 10)
        pdf.set_text_color(*RoadmapPDF.GOLD)
        pdf.cell(0, 7, title)
        pdf.ln(7)

        pdf.set_font("DejaVu", "B", 8)
        pdf.set_text_color(*RoadmapPDF.WHITE)
        pdf.cell(95, 5, "Dev :")
        pdf.cell(95, 5, "GTM :")
        pdf.ln(5)

        pdf.set_font("DejaVu", "", 8)
        max_items = max(len(dev), len(gtm))
        for i in range(max_items):
            d = dev[i] if i < len(dev) else ""
            g = gtm[i] if i < len(gtm) else ""

            if d.startswith("[OK]"):
                pdf.set_text_color(*RoadmapPDF.GREEN)
            else:
                pdf.set_text_color(*RoadmapPDF.WHITE)
            pdf.cell(95, 4.5, f"  {d}")
            pdf.set_text_color(*RoadmapPDF.WHITE)
            pdf.cell(95, 4.5, f"  {g}")
            pdf.ln(4.5)

        pdf.set_font("DejaVu", "I", 7.5)
        pdf.set_text_color(*RoadmapPDF.GRAY)
        pdf.cell(0, 5, f"Objectif : {objectif}")
        pdf.ln(8)

    # =========================================
    # PARTIE 6
    # =========================================
    pdf.add_page()
    pdf.rect(0, 0, 210, 297, style="F")
    pdf.section_title("PARTIE 6 — LES 3 PROCHAINES ACTIONS (48h)")

    actions = [
        ("1. Tester et activer les email sequences (C3)",
         "PARCE QUE C'EST LE LEVIER RETENTION #1 — 3h",
         "Le code existe dans email_scheduler.py mais n'a jamais ete teste en prod. "
         "Verifier : (1) le cron GitHub Actions est configure et tourne, (2) Supabase a les colonnes "
         "email_sequence_sent et created_at dans la table users, (3) Resend delivre reellement les "
         "emails D+3 et D+7. Tester avec un vrai user inscrit. Sans ca, les free users qui ne "
         "reviennent pas J+3 sont perdus a jamais."),
        ("2. Analyse gratuite Pro au premier ticker (I2)",
         "PARCE QUE C'EST LE MOMENT 'AHA' PRO — 3h",
         "Le FirstRunHero est en place (C4 fait), mais le user qui lance sa premiere analyse ne voit "
         "que la version free. Offrir une deep analysis complete (SWOT, PESTLE, DCF scenarios, "
         "anomalies) sans gate au premier ticker analyse. Ca montre immediatement la valeur Pro "
         "et devrait augmenter la conversion de 20-30%. Dependance : C4 est fait, on peut y aller."),
        ("3. Preparer 5 screenshots HD pour Product Hunt (C5)",
         "PARCE QUE PH = 500+ SIGNUPS POTENTIELS — 2h",
         "Product Hunt est prevu semaine 7 (~19 mai). Il faut des screenshots reels, pas des "
         "maquettes : (1) verdict AAPL avec prix + valeur intrinseque, (2) DCF sensibilite interactif, "
         "(3) analyse Bull/Bear IA, (4) screener IA, (5) comparaison 2 actions. Format 1270x760. "
         "L'og-image.png et la photo fondateur sont deja prets."),
    ]

    for title, subtitle, body in actions:
        pdf.set_font("DejaVu", "B", 12)
        pdf.set_text_color(*RoadmapPDF.WHITE)
        pdf.cell(0, 8, title)
        pdf.ln(8)

        pdf.set_font("DejaVu", "B", 9)
        pdf.set_text_color(*RoadmapPDF.GOLD)
        pdf.cell(0, 6, subtitle)
        pdf.ln(8)

        pdf.set_font("DejaVu", "", 9)
        pdf.set_text_color(*RoadmapPDF.WHITE)
        pdf.multi_cell(0, 5, body)
        pdf.ln(8)

    # Footer note
    pdf.ln(10)
    pdf.set_draw_color(*RoadmapPDF.GOLD)
    pdf.set_line_width(0.3)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(5)
    pdf.set_font("DejaVu", "I", 8)
    pdf.set_text_color(*RoadmapPDF.GRAY)
    pdf.cell(0, 5, "Genere le 6 avril 2026. Mis a jour apres corrections C1, C2, C4.", align="C")
    pdf.ln(5)
    pdf.cell(0, 5, "Document de planification — ne pas deployer.", align="C")

    output_path = "/Users/iliasmoulouade/Documents/ValuEngine/ROADMAP.pdf"
    pdf.output(output_path)
    return output_path

if __name__ == "__main__":
    path = build_pdf()
    print(f"PDF genere : {path}")
