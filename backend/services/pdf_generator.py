"""
ValuEngine — PDF Report Generator
Generates branded analysis reports using ReportLab.
"""

import io
import html
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import Color, HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
)


def _esc(val) -> str:
    """Escape HTML/XML special characters for safe ReportLab Paragraph rendering."""
    if val is None:
        return "N/A"
    return html.escape(str(val))


# ── Color Palette ────────────────────────────────────────────────────────────
GOLD       = Color(201/255, 168/255, 76/255)     # RGB(201,168,76)
DARK_BG    = HexColor("#09090b")
TEXT_MAIN   = HexColor("#111111")
TEXT_GRAY   = HexColor("#666666")
BULL_GREEN = Color(22/255, 101/255, 52/255)       # RGB(22,101,52)
BEAR_RED   = Color(153/255, 27/255, 27/255)       # RGB(153,27,27)
LIGHT_GRAY = HexColor("#f5f5f5")
WHITE      = white
BLACK      = black

W, H = A4  # 595.27 x 841.89 points


def _fmt_b(value) -> str:
    """Format number to B/M/K."""
    try:
        v = float(value)
    except (TypeError, ValueError):
        return "N/A"
    if abs(v) >= 1e12:
        return f"${v/1e12:.2f}T"
    if abs(v) >= 1e9:
        return f"${v/1e9:.1f}B"
    if abs(v) >= 1e6:
        return f"${v/1e6:.0f}M"
    return f"${v:,.0f}"


def _safe(val, fmt_str=".2f", prefix="", suffix=""):
    """Safe format a value."""
    if val is None:
        return "N/A"
    try:
        return f"{prefix}{float(val):{fmt_str}}{suffix}"
    except (TypeError, ValueError):
        return "N/A"


def _pct(val):
    """Format as percentage."""
    if val is None:
        return "N/A"
    try:
        v = float(val)
        sign = "+" if v > 0 else ""
        return f"{sign}{v:.1f}%"
    except (TypeError, ValueError):
        return "N/A"


# ── Custom Styles ────���───────────────────────────────────────────────────────

def _build_styles():
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name="Title_VE",
        fontName="Helvetica-Bold",
        fontSize=28,
        leading=34,
        textColor=GOLD,
        alignment=TA_LEFT,
    ))
    styles.add(ParagraphStyle(
        name="Subtitle_VE",
        fontName="Helvetica",
        fontSize=14,
        leading=18,
        textColor=TEXT_GRAY,
        alignment=TA_LEFT,
    ))
    styles.add(ParagraphStyle(
        name="H1",
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=26,
        textColor=TEXT_MAIN,
        spaceBefore=12,
        spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="H2",
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=TEXT_MAIN,
        spaceBefore=10,
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="Body_VE",
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=TEXT_MAIN,
        alignment=TA_JUSTIFY,
    ))
    styles.add(ParagraphStyle(
        name="Small_VE",
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=TEXT_GRAY,
    ))
    styles.add(ParagraphStyle(
        name="Bull_VE",
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=BULL_GREEN,
    ))
    styles.add(ParagraphStyle(
        name="Bear_VE",
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=BEAR_RED,
    ))
    styles.add(ParagraphStyle(
        name="Footer_VE",
        fontName="Helvetica",
        fontSize=7,
        leading=9,
        textColor=TEXT_GRAY,
        alignment=TA_CENTER,
    ))

    return styles


# ── Page Footer & Header ────────────────────────────────────────────────────

def _draw_footer(canvas_obj, doc):
    """Draw footer on every page."""
    canvas_obj.saveState()
    # Gold line
    canvas_obj.setStrokeColor(GOLD)
    canvas_obj.setLineWidth(0.5)
    canvas_obj.line(40, 45, W - 40, 45)
    # Footer text
    canvas_obj.setFont("Helvetica", 7)
    canvas_obj.setFillColor(TEXT_GRAY)
    date_str = datetime.now().strftime("%d/%m/%Y")
    canvas_obj.drawString(40, 32, f"Rapport genere par ValuEngine le {date_str} | valuengine.fr")
    canvas_obj.drawRightString(W - 40, 32,
        "Ce document ne constitue pas un conseil en investissement au sens de la directive MIF II.")
    canvas_obj.drawCentredString(W / 2, 20,
        "ValuEngine est un outil d'aide a la decision. Les performances passees ne prejugent pas des performances futures.")
    # Page number
    canvas_obj.drawRightString(W - 40, 20, f"Page {doc.page}")
    canvas_obj.restoreState()


# ── Build PDF ────────────────────────���───────────────────────────────────────

def generate_analysis_pdf(analysis_data: dict) -> bytes:
    """
    Generate a branded PDF report from analysis data.

    Expected keys in analysis_data:
    - ticker, company_name, verdict, price, intrinsic_price
    - kpis: dict of financial metrics
    - deep_analysis: dict with bull_case, bear_case, synthese
    - dcf_scenarios: dict with bull, base, bear scenarios
    """
    buf = io.BytesIO()
    styles = _build_styles()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=55,
    )

    story = []

    ticker       = _esc(analysis_data.get("ticker", "N/A"))
    company_name = _esc(analysis_data.get("company_name", analysis_data.get("ticker", "N/A")))
    verdict      = _esc(analysis_data.get("verdict", "HOLD"))
    price        = analysis_data.get("price", 0)
    intrinsic    = analysis_data.get("intrinsic_price", 0)
    kpis         = analysis_data.get("kpis", {})
    deep         = analysis_data.get("deep_analysis", None)
    dcf_sc       = analysis_data.get("dcf_scenarios", None)
    date_str     = datetime.now().strftime("%d/%m/%Y")

    try:
        price_f = float(price)
    except (TypeError, ValueError):
        price_f = 0
    try:
        intrinsic_f = float(intrinsic)
    except (TypeError, ValueError):
        intrinsic_f = 0

    upside = ((intrinsic_f - price_f) / price_f * 100) if price_f > 0 else 0

    # ═══════════════════════════════════════════════════════════════════════
    # PAGE 1 — HEADER & VERDICT
    # ═══════════════════════════════════════════════════════════════════════

    # Brand header
    story.append(Paragraph("ValuEngine", styles["Title_VE"]))
    story.append(Paragraph("Rapport d'Analyse Financiere", styles["Subtitle_VE"]))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"Date de generation : {date_str}", styles["Small_VE"]))
    story.append(Spacer(1, 20))

    # Gold separator
    story.append(Table(
        [[""]],
        colWidths=[W - 80],
        rowHeights=[2],
        style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), GOLD)]),
    ))
    story.append(Spacer(1, 20))

    # Company name + ticker
    story.append(Paragraph(f"{company_name}", styles["H1"]))
    story.append(Paragraph(f"Ticker : {ticker}", styles["Subtitle_VE"]))
    story.append(Spacer(1, 16))

    # Verdict box
    verdict_map = {
        "BUY":  ("ACHAT", HexColor("#166534"), HexColor("#dcfce7")),
        "SELL": ("VENTE", HexColor("#991b1b"), HexColor("#fee2e2")),
        "HOLD": ("NEUTRE", HexColor("#4b5563"), HexColor("#f3f4f6")),
    }
    verdict_label, verdict_color, verdict_bg = verdict_map.get(verdict, verdict_map["HOLD"])

    verdict_table = Table(
        [[Paragraph(
            f'<font color="{verdict_color.hexval()}">{verdict_label}</font>',
            ParagraphStyle("verdict_p", fontName="Helvetica-Bold", fontSize=22,
                           alignment=TA_CENTER, textColor=verdict_color)
        )]],
        colWidths=[180],
        rowHeights=[50],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), verdict_bg),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ROUNDEDCORNERS", [8, 8, 8, 8]),
            ("BOX", (0, 0), (-1, -1), 1, verdict_color),
        ]),
    )
    story.append(verdict_table)
    story.append(Spacer(1, 16))

    # Price row
    price_data = [
        [
            Paragraph("Prix actuel", styles["Small_VE"]),
            Paragraph("Prix cible DCF", styles["Small_VE"]),
            Paragraph("Potentiel", styles["Small_VE"]),
        ],
        [
            Paragraph(f"<b>${price_f:.2f}</b>", ParagraphStyle("p", fontName="Helvetica-Bold", fontSize=16, textColor=TEXT_MAIN)),
            Paragraph(f"<b>${intrinsic_f:.2f}</b>", ParagraphStyle("p", fontName="Helvetica-Bold", fontSize=16, textColor=GOLD)),
            Paragraph(
                f"<b>{'+' if upside > 0 else ''}{upside:.1f}%</b>",
                ParagraphStyle("p", fontName="Helvetica-Bold", fontSize=16,
                               textColor=BULL_GREEN if upside > 0 else BEAR_RED)
            ),
        ],
    ]
    price_table = Table(price_data, colWidths=[(W - 80) / 3] * 3)
    price_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, TEXT_GRAY),
    ]))
    story.append(price_table)
    story.append(Spacer(1, 16))

    # Gold separator
    story.append(Table(
        [[""]],
        colWidths=[W - 80],
        rowHeights=[2],
        style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), GOLD)]),
    ))

    # ══════════════════════════════��════════════════════════════════════════
    # PAGE 2 — METRIQUES FINANCIERES
    # ═══════════════════════════════════════════════════════════════════════

    story.append(PageBreak())
    story.append(Paragraph("Metriques Cles", styles["H1"]))
    story.append(Spacer(1, 10))

    # Build metrics table from kpis dict
    metrics = [
        ("Price/Earnings (P/E)",      _safe(kpis.get("pe_ratio"), ".1f", suffix="x")),
        ("Price/Book (P/B)",          _safe(kpis.get("pb_ratio"), ".1f", suffix="x")),
        ("EV/EBITDA",                 _safe(kpis.get("ev_ebitda"), ".1f", suffix="x")),
        ("Marge nette",               _pct(kpis.get("profit_margin"))),
        ("FCF Margin",                _pct(kpis.get("fcf_margin"))),
        ("ROIC / ROE",                _pct(kpis.get("roe"))),
        ("Dette/EBITDA",              _safe(kpis.get("debt_to_ebitda"), ".1f", suffix="x")),
        ("Croissance revenus",        _pct(kpis.get("revenue_growth"))),
        ("Rendement dividende",       _pct(kpis.get("dividend_yield"))),
        ("Beta",                      _safe(kpis.get("beta"), ".2f")),
        ("Market Cap",                _fmt_b(kpis.get("market_cap"))),
        ("Free Cash Flow",            _fmt_b(kpis.get("free_cash_flow"))),
    ]

    label_style = ParagraphStyle("lbl", fontName="Helvetica", fontSize=10,
                                 textColor=TEXT_MAIN, leading=14)
    value_style = ParagraphStyle("val", fontName="Helvetica-Bold", fontSize=10,
                                 textColor=TEXT_MAIN, leading=14, alignment=TA_RIGHT)

    # 2-column layout: 6 rows per column
    half = len(metrics) // 2
    col1 = metrics[:half]
    col2 = metrics[half:]

    rows = []
    for i in range(max(len(col1), len(col2))):
        row = []
        if i < len(col1):
            row.extend([Paragraph(col1[i][0], label_style), Paragraph(col1[i][1], value_style)])
        else:
            row.extend(["", ""])
        if i < len(col2):
            row.extend([Paragraph(col2[i][0], label_style), Paragraph(col2[i][1], value_style)])
        else:
            row.extend(["", ""])
        rows.append(row)

    col_w = (W - 80) / 4
    metrics_table = Table(rows, colWidths=[col_w * 1.3, col_w * 0.7, col_w * 1.3, col_w * 0.7])
    metrics_table.setStyle(TableStyle([
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("ALIGN", (3, 0), (3, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (1, -1), 0.3, HexColor("#e0e0e0")),
        ("LINEBELOW", (2, 0), (3, -1), 0.3, HexColor("#e0e0e0")),
        ("LEFTPADDING", (2, 0), (2, -1), 20),  # spacing between columns
    ]))
    story.append(metrics_table)

    # ═══════════════════════════════════════════════��═══════════════════════
    # PAGE 3 — ANALYSE IA
    # ═════════════��═════════════════════════════════════════════════════════

    if deep and isinstance(deep, dict) and "bull_case" in deep:
        story.append(PageBreak())
        story.append(Paragraph("Analyse IA Approfondie", styles["H1"]))
        story.append(Spacer(1, 10))

        bull = deep.get("bull_case", {})
        bear = deep.get("bear_case", {})
        synthese = _esc(deep.get("synthese", ""))

        # ── Bull Case ─��
        bull_title = _esc(bull.get("titre", "Bull Case")) if isinstance(bull, dict) else "Bull Case"
        bull_conf  = bull.get("score_confiance", "") if isinstance(bull, dict) else ""
        conf_str   = f" — Confiance : {_esc(bull_conf)}%" if bull_conf else ""

        story.append(Paragraph(
            f'<font color="#166534"><b>BULL CASE{conf_str}</b></font>',
            styles["H2"]
        ))
        story.append(Paragraph(f"<i>{bull_title}</i>", styles["Body_VE"]))
        story.append(Spacer(1, 4))

        if isinstance(bull, dict):
            for arg in bull.get("arguments", []):
                if isinstance(arg, dict):
                    titre_arg = _esc(arg.get("titre", ""))
                    detail = _esc(arg.get("detail", ""))
                    chiffre = _esc(arg.get("chiffre_cle", ""))
                    story.append(Paragraph(
                        f'<b>{titre_arg}</b> — {detail}',
                        styles["Bull_VE"]
                    ))
                    if chiffre:
                        story.append(Paragraph(
                            f'<i>Chiffre cle : {chiffre}</i>',
                            styles["Small_VE"]
                        ))
                    story.append(Spacer(1, 4))
        elif isinstance(bull, str):
            story.append(Paragraph(_esc(bull), styles["Bull_VE"]))

        story.append(Spacer(1, 12))

        # ── Bear Case ──
        bear_title = _esc(bear.get("titre", "Bear Case")) if isinstance(bear, dict) else "Bear Case"
        bear_conf  = bear.get("score_confiance", "") if isinstance(bear, dict) else ""
        bconf_str  = f" — Confiance : {_esc(bear_conf)}%" if bear_conf else ""

        story.append(Paragraph(
            f'<font color="#991b1b"><b>BEAR CASE{bconf_str}</b></font>',
            styles["H2"]
        ))
        story.append(Paragraph(f"<i>{bear_title}</i>", styles["Body_VE"]))
        story.append(Spacer(1, 4))

        if isinstance(bear, dict):
            for arg in bear.get("arguments", []):
                if isinstance(arg, dict):
                    titre_arg = _esc(arg.get("titre", ""))
                    detail = _esc(arg.get("detail", ""))
                    chiffre = _esc(arg.get("chiffre_cle", ""))
                    story.append(Paragraph(
                        f'<b>{titre_arg}</b> — {detail}',
                        styles["Bear_VE"]
                    ))
                    if chiffre:
                        story.append(Paragraph(
                            f'<i>Chiffre cle : {chiffre}</i>',
                            styles["Small_VE"]
                        ))
                    story.append(Spacer(1, 4))
        elif isinstance(bear, str):
            story.append(Paragraph(_esc(bear), styles["Bear_VE"]))

        story.append(Spacer(1, 12))

        # ── Synthese ──
        if synthese:
            synth_table = Table(
                [[Paragraph(f"<b>Synthese :</b> {synthese}", styles["Body_VE"])]],
                colWidths=[W - 100],
                style=TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("ROUNDEDCORNERS", [6, 6, 6, 6]),
                ]),
            )
            story.append(synth_table)

    # ═══════════════════════════════════════════════════════��═══════════════
    # PAGE 4 — SCENARIOS DCF
    # ════════════���══════════════════════════════════════════════════════════

    if dcf_sc and isinstance(dcf_sc, dict) and "base" in dcf_sc:
        story.append(PageBreak())
        story.append(Paragraph("Scenarios DCF", styles["H1"]))
        story.append(Spacer(1, 10))

        col_w_sc = (W - 80) / 3

        header_style = ParagraphStyle("sc_h", fontName="Helvetica-Bold", fontSize=11,
                                      alignment=TA_CENTER, textColor=WHITE, leading=14)
        val_center = ParagraphStyle("sc_v", fontName="Helvetica-Bold", fontSize=12,
                                    alignment=TA_CENTER, textColor=TEXT_MAIN, leading=16)
        small_center = ParagraphStyle("sc_s", fontName="Helvetica", fontSize=9,
                                      alignment=TA_CENTER, textColor=TEXT_GRAY, leading=12)
        narratif_style = ParagraphStyle("sc_n", fontName="Helvetica", fontSize=8,
                                        alignment=TA_CENTER, textColor=TEXT_MAIN, leading=11)

        scenarios = []
        for name, color, label in [
            ("bear", BEAR_RED, "BEAR"),
            ("base", GOLD, "BASE"),
            ("bull", BULL_GREEN, "BULL"),
        ]:
            sc = dcf_sc.get(name, {})
            prix = sc.get("prix_cible", 0)
            upside_sc = sc.get("upside_pct", 0)
            prob = sc.get("probabilite", "")
            narratif = _esc(sc.get("narratif", ""))
            # Truncate narrative to ~120 chars
            if len(narratif) > 120:
                narratif = narratif[:117] + "..."
            scenarios.append((label, color, prix, upside_sc, prob, narratif))

        # Header row
        header_data = []
        for label, color, *_ in scenarios:
            header_data.append(Paragraph(f"<b>{label}</b>", header_style))

        # Price row
        price_row = []
        for _, _, prix, *_ in scenarios:
            price_row.append(Paragraph(f"<b>${prix:.2f}</b>", val_center))

        # Upside row
        upside_row = []
        for _, _, _, up, *_ in scenarios:
            color = BULL_GREEN if up > 0 else BEAR_RED
            sign = "+" if up > 0 else ""
            upside_row.append(Paragraph(
                f'<font color="{color.hexval()}">{sign}{up:.1f}%</font>',
                val_center
            ))

        # Probability row
        prob_row = []
        for _, _, _, _, prob, _ in scenarios:
            prob_row.append(Paragraph(f"Probabilite : {prob}%", small_center))

        # Narrative row
        narr_row = []
        for _, _, _, _, _, narr in scenarios:
            narr_row.append(Paragraph(narr, narratif_style))

        sc_table = Table(
            [header_data, price_row, upside_row, prob_row, narr_row],
            colWidths=[col_w_sc] * 3,
            style=TableStyle([
                # Headers colored
                ("BACKGROUND", (0, 0), (0, 0), BEAR_RED),
                ("BACKGROUND", (1, 0), (1, 0), GOLD),
                ("BACKGROUND", (2, 0), (2, 0), BULL_GREEN),
                # Padding
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                # Grid
                ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#e0e0e0")),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]),
        )
        story.append(sc_table)

        # Conclusion
        conclusion = _esc(dcf_sc.get("conclusion", ""))
        if conclusion:
            story.append(Spacer(1, 12))
            story.append(Paragraph(f"<b>Conclusion :</b> {conclusion}", styles["Body_VE"]))

    # ═══════════════════════════════════════════════════════════════════════
    # BUILD
    # ═════════════════════��════════════════════════════���════════════════════

    doc.build(story, onFirstPage=_draw_footer, onLaterPages=_draw_footer)
    return buf.getvalue()
