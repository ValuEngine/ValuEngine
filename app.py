import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from data.fetcher import get_company_data, get_peers_data
from engine.dcf import calculate_dcf, sensitivity_analysis
from ai.analyzer import get_bull_bear_analysis

# PAGE CONFIG
st.set_page_config(
    page_title="ValuEngine - Le Bloomberg simplifie",
    page_icon="chart_with_upwards_trend",
    layout="wide",
    initial_sidebar_state="expanded"
)

# CSS GLOBAL
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

* { font-family: 'Inter', sans-serif !important; }
#MainMenu, footer, header { visibility: hidden; }
.stDeployButton { display: none; }

.stApp { background-color: #0a1628; }

.block-container {
    padding: 2rem 2.5rem 4rem 2.5rem;
    max-width: 1400px;
}

[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #0d1b2a 0%, #111f33 100%);
    border-right: 1px solid rgba(201,168,76,0.15);
}

.stTextInput input {
    background: rgba(27,45,69,0.9) !important;
    border: 1px solid rgba(201,168,76,0.35) !important;
    border-radius: 8px !important;
    color: #fff !important;
    font-size: 15px !important;
    font-weight: 600 !important;
    padding: 10px 14px !important;
}
.stTextInput input:focus {
    border-color: #C9A84C !important;
    box-shadow: 0 0 0 3px rgba(201,168,76,0.12) !important;
}

.stButton > button {
    background: linear-gradient(135deg, #C9A84C 0%, #e8c55a 100%) !important;
    color: #0a1628 !important;
    border: none !important;
    border-radius: 10px !important;
    font-weight: 700 !important;
    font-size: 14px !important;
    padding: 14px !important;
    letter-spacing: 0.5px !important;
    box-shadow: 0 4px 16px rgba(201,168,76,0.3) !important;
    transition: all 0.2s ease !important;
    width: 100% !important;
}
.stButton > button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 8px 24px rgba(201,168,76,0.45) !important;
}

.stSelectbox [data-baseweb="select"] > div {
    background: rgba(27,45,69,0.9) !important;
    border-color: rgba(201,168,76,0.3) !important;
    border-radius: 8px !important;
    color: white !important;
}

.kpi-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 14px;
    margin: 24px 0 32px 0;
}

.kpi-card {
    background: linear-gradient(145deg, #1a2d45 0%, #132032 100%);
    border: 1px solid rgba(201,168,76,0.18);
    border-radius: 14px;
    padding: 20px 22px;
    position: relative;
    overflow: hidden;
}
.kpi-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, #C9A84C 0%, rgba(201,168,76,0.1) 100%);
}
.kpi-label {
    color: #5d7289;
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.6px;
    margin-bottom: 10px;
}
.kpi-value {
    color: #ffffff;
    font-size: 22px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.8px;
}
.kpi-sub {
    font-size: 11px;
    font-weight: 500;
    margin-top: 7px;
}
.pos { color: #00d4aa; }
.neg { color: #ff4d6d; }
.neu { color: #C9A84C; }

.ve-card {
    background: linear-gradient(145deg, #1a2d45 0%, #132032 100%);
    border: 1px solid rgba(201,168,76,0.14);
    border-radius: 16px;
    padding: 28px 30px;
    height: 100%;
}
.ve-card-title {
    color: #ffffff;
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 20px;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(201,168,76,0.12);
}
.m-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 9px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
}
.m-row:last-child { border-bottom: none; }
.m-label { color: #6b7d91; font-size: 12px; }
.m-val { color: #ffffff; font-size: 13px; font-weight: 600; }

.sec-label {
    color: #C9A84C;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin: 28px 0 14px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(201,168,76,0.12);
}

.bb-card { border-radius: 14px; padding: 24px; }
.bull-bg {
    background: linear-gradient(145deg, rgba(0,212,170,0.07), rgba(0,212,170,0.03));
    border: 1px solid rgba(0,212,170,0.22);
}
.bear-bg {
    background: linear-gradient(145deg, rgba(255,77,109,0.07), rgba(255,77,109,0.03));
    border: 1px solid rgba(255,77,109,0.22);
}
.bb-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.8px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
}
.bull-title { color: #00d4aa; }
.bear-title { color: #ff4d6d; }
.bb-body { color: #c8d8e8; font-size: 13px; line-height: 1.75; }

.verdict-wrap {
    border-radius: 16px;
    padding: 30px 36px;
    margin-top: 28px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.vd-buy  {
    background: linear-gradient(135deg, rgba(0,212,170,0.08), rgba(0,212,170,0.03));
    border: 1px solid rgba(0,212,170,0.35);
    border-left: 5px solid #00d4aa;
}
.vd-sell {
    background: linear-gradient(135deg, rgba(255,77,109,0.08), rgba(255,77,109,0.03));
    border: 1px solid rgba(255,77,109,0.35);
    border-left: 5px solid #ff4d6d;
}
.vd-hold {
    background: linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.03));
    border: 1px solid rgba(201,168,76,0.35);
    border-left: 5px solid #C9A84C;
}
.vd-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5px; margin-bottom: 6px; }
.vd-main { font-size: 30px; font-weight: 800; letter-spacing: -1px; }
.vd-action { font-size: 15px; font-weight: 700; color: #fff; margin-top: 4px; }
.vd-text { font-size: 13px; color: #7a8fa3; margin-top: 10px; max-width: 600px; line-height: 1.6; }
.vd-price-box { text-align: right; }
.vd-price-label { color: #5d7289; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
.vd-price-val { font-size: 44px; font-weight: 800; letter-spacing: -2px; line-height: 1; }
.vd-price-sub { color: #5d7289; font-size: 12px; margin-top: 6px; }

.disclaimer {
    color: #3a4a5a;
    font-size: 10px;
    text-align: center;
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid rgba(201,168,76,0.08);
}
</style>
""", unsafe_allow_html=True)


# HELPERS
def fmt(n, prefix="$"):
    if not n:
        return "N/A"
    a = abs(n)
    if a >= 1e12:
        return f"{prefix}{n/1e12:.2f}T"
    if a >= 1e9:
        return f"{prefix}{n/1e9:.1f}B"
    if a >= 1e6:
        return f"{prefix}{n/1e6:.1f}M"
    return f"{prefix}{n:,.0f}"


def kpi(label, value, sub="", cls="neu"):
    sub_html = f'<div class="kpi-sub {cls}">{sub}</div>' if sub else ""
    return f"""
    <div class="kpi-card">
        <div class="kpi-label">{label}</div>
        <div class="kpi-value">{value}</div>
        {sub_html}
    </div>"""


# SIDEBAR
with st.sidebar:
    st.markdown("""
    <div style="padding:8px 0 4px 0;">
        <div style="font-size:22px;font-weight:800;color:#C9A84C;letter-spacing:-0.5px;">ValuEngine</div>
        <div style="color:#4a6070;font-size:11px;margin-top:3px;margin-bottom:20px;">Le Bloomberg simplifi&#233;</div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("---")

    ticker_raw = st.text_input("", placeholder="  AAPL, TSLA, NVDA...", label_visibility="collapsed")
    ticker = ticker_raw.upper().strip() if ticker_raw else ""

    st.markdown('<div style="color:#4a6070;font-size:11px;margin:2px 0 16px 2px;">Entrez un ticker boursier am&#233;ricain</div>', unsafe_allow_html=True)
    st.markdown("---")

    st.markdown('<div style="color:#C9A84C;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:14px;">Hypoth&#232;ses DCF</div>', unsafe_allow_html=True)
    growth   = st.slider("Croissance FCF (%)",       1, 25,  8, 1)
    wacc     = st.slider("WACC (%)",                 1, 25, 10, 1)
    terminal = st.slider("Croissance terminale (%)", 1,  8,  3, 1)
    horizon  = st.selectbox("Horizon de projection", [3, 5, 7, 10], index=1)

    st.markdown("---")
    st.markdown(f"""
    <div style="background:rgba(201,168,76,0.07);border:1px solid rgba(201,168,76,0.18);border-radius:10px;padding:12px 16px;margin-bottom:16px;">
        <div style="color:#4a6070;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:5px;">Param&#232;tres actifs</div>
        <div style="color:#C9A84C;font-size:12px;font-weight:700;">FCF {growth}% &nbsp;&#183;&nbsp; WACC {wacc}% &nbsp;&#183;&nbsp; Term. {terminal}%</div>
    </div>
    """, unsafe_allow_html=True)

    run = st.button("Lancer l'analyse", use_container_width=True)


# HEADER
st.markdown("""
<div style="display:flex;align-items:center;gap:16px;margin-bottom:8px;">
    <div style="font-size:44px;">&#128202;</div>
    <div>
        <div style="font-size:34px;font-weight:800;color:#ffffff;letter-spacing:-1.5px;line-height:1;">ValuEngine</div>
        <div style="font-size:13px;color:#C9A84C;font-weight:500;letter-spacing:0.8px;margin-top:3px;">Le Bloomberg simplifi&#233; &#8212; Financial Intelligence</div>
    </div>
</div>
""", unsafe_allow_html=True)


# WELCOME SCREEN
if not ticker or not run:
    st.markdown("""
    <div style="background:linear-gradient(145deg,#1a2d45,#132032);border:1px solid rgba(201,168,76,0.18);border-radius:20px;padding:48px 52px;margin:28px 0;">
        <div style="color:#C9A84C;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;margin-bottom:14px;">Analyse Fondamentale Instantan&#233;e</div>
        <div style="color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;margin-bottom:6px;">Valorisez n'importe quelle action en quelques secondes,<br>aliment&#233; par l'intelligence artificielle.</div>
        <div style="color:#6b7d91;font-size:14px;margin-bottom:40px;">Entrez un ticker dans la barre lat&#233;rale gauche et cliquez sur Lancer l'analyse.</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:16px;">
            <div style="text-align:center;padding:24px 12px;background:rgba(201,168,76,0.05);border:1px solid rgba(201,168,76,0.12);border-radius:14px;">
                <div style="font-size:32px;margin-bottom:10px;">&#128176;</div>
                <div style="color:#fff;font-size:13px;font-weight:700;">DCF Complet</div>
                <div style="color:#5d7289;font-size:11px;margin-top:5px;">Projections 3-10 ans</div>
            </div>
            <div style="text-align:center;padding:24px 12px;background:rgba(201,168,76,0.05);border:1px solid rgba(201,168,76,0.12);border-radius:14px;">
                <div style="font-size:32px;margin-bottom:10px;">&#128290;</div>
                <div style="color:#fff;font-size:13px;font-weight:700;">Sensibilit&#233;</div>
                <div style="color:#5d7289;font-size:11px;margin-top:5px;">Matrice WACC / FCF</div>
            </div>
            <div style="text-align:center;padding:24px 12px;background:rgba(201,168,76,0.05);border:1px solid rgba(201,168,76,0.12);border-radius:14px;">
                <div style="font-size:32px;margin-bottom:10px;">&#127974;</div>
                <div style="color:#fff;font-size:13px;font-weight:700;">Trading Comps</div>
                <div style="color:#5d7289;font-size:11px;margin-top:5px;">Pairs sectoriels</div>
            </div>
            <div style="text-align:center;padding:24px 12px;background:rgba(201,168,76,0.05);border:1px solid rgba(201,168,76,0.12);border-radius:14px;">
                <div style="font-size:32px;margin-bottom:10px;">&#129504;</div>
                <div style="color:#fff;font-size:13px;font-weight:700;">IA Bull &amp; Bear</div>
                <div style="color:#5d7289;font-size:11px;margin-top:5px;">Analyse par Claude AI</div>
            </div>
            <div style="text-align:center;padding:24px 12px;background:rgba(201,168,76,0.05);border:1px solid rgba(201,168,76,0.12);border-radius:14px;">
                <div style="font-size:32px;margin-bottom:10px;">&#127919;</div>
                <div style="color:#fff;font-size:13px;font-weight:700;">Verdict Final</div>
                <div style="color:#5d7289;font-size:11px;margin-top:5px;">D&#233;cision actionnable</div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)
    st.stop()


# FETCH DATA
with st.spinner(f"Chargement des donnees pour {ticker}..."):
    data = get_company_data(ticker)

if not data:
    st.error(f"Impossible de recuperer les donnees pour **{ticker}**. Verifiez le ticker et reessayez.")
    st.stop()


# CALCULS
fcf           = data.get("freeCashFlow", 0) or 0
shares        = data.get("sharesOutstanding", 1) or 1
net_debt      = (data.get("totalDebt", 0) or 0) - (data.get("cashAndEquivalents", 0) or 0)
current_price = data.get("price", 0) or 0
name          = data.get("name", ticker)
sector        = data.get("sector", "-")

dcf_result = calculate_dcf(
    fcf=fcf,
    growth_rate=growth / 100,
    wacc=wacc / 100,
    terminal_growth=terminal / 100,
    years=horizon,
    shares_outstanding=shares,
    net_debt=net_debt
)

intrinsic = dcf_result.get("intrinsic_value_per_share", 0) or 0
upside    = (intrinsic - current_price) / current_price if current_price else 0

sens = sensitivity_analysis(
    fcf=fcf,
    base_growth=growth / 100,
    base_wacc=wacc / 100,
    terminal_growth=terminal / 100,
    years=horizon,
    shares_outstanding=shares,
    net_debt=net_debt
)


# COMPANY HEADER
pe        = data.get("peRatio", 0) or 0
ev_ebitda = data.get("evToEbitda", 0) or 0
mkt_cap   = data.get("mktCap", 0) or 0
roe       = data.get("roe", 0) or 0

st.markdown(f"""
<div style="display:flex;align-items:center;gap:14px;margin:20px 0 6px 0;">
    <span style="color:#fff;font-size:30px;font-weight:800;">{name}</span>
    <span style="color:#6b7d91;font-size:18px;font-weight:400;">&#183; {ticker}</span>
    <span style="background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.28);color:#C9A84C;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;padding:4px 12px;border-radius:20px;">{sector}</span>
</div>
""", unsafe_allow_html=True)


# KPI CARDS
up_cls  = "pos" if upside > 0 else "neg"
up_icon = "+" if upside > 0 else ""
pe_note = "Eleve" if pe > 30 else ("Modere" if pe > 15 else "Faible")

cards = (
    kpi("Prix Actuel",        f"${current_price:,.2f}", fmt(mkt_cap) + " cap",           "neu") +
    kpi("Valeur Intrinseque", f"${intrinsic:,.2f}",     "DCF base case",                 "neu") +
    kpi("Decote / Prime",     f"{upside*100:.1f}%",     f"{up_icon} vs valeur DCF",      up_cls) +
    kpi("P/E Ratio",          f"{pe:.1f}x" if pe else "N/A", pe_note,                   "neu") +
    kpi("EV/EBITDA",          f"{ev_ebitda:.1f}x" if ev_ebitda else "N/A", "Multiples", "neu") +
    kpi("Free Cash Flow",     fmt(fcf), "Tresorerie libre",                              "pos" if fcf > 0 else "neg")
)
st.markdown(f'<div class="kpi-grid">{cards}</div>', unsafe_allow_html=True)


# DCF + FONDAMENTAUX
st.markdown('<div class="sec-label">RESULTATS DCF &amp; FONDAMENTAUX</div>', unsafe_allow_html=True)

col1, col2 = st.columns(2, gap="medium")

with col1:
    ev     = dcf_result.get("enterprise_value", 0) or 0
    equity = dcf_result.get("equity_value", 0) or 0
    tv     = dcf_result.get("terminal_value_pv", 0) or 0

    rows_dcf = [
        ("Valeur d'entreprise (EV)",    fmt(ev),               ""),
        ("Valeur des fonds propres",    fmt(equity),           ""),
        ("Valeur terminale actualisee", fmt(tv),               ""),
        ("Valeur intrinseque / action", f"${intrinsic:,.2f}",  ""),
        ("Prix de marche actuel",       f"${current_price:,.2f}", ""),
        ("Potentiel",                   f"{upside*100:+.1f}%", "pos" if upside > 0 else "neg"),
    ]
    rows_html = "".join([
        '<div class="m-row"><span class="m-label">{}</span><span class="m-val" style="color:{};">{}</span></div>'.format(
            l, "#00d4aa" if c == "pos" else "#ff4d6d" if c == "neg" else "#fff", v
        )
        for l, v, c in rows_dcf
    ])
    st.markdown(f'<div class="ve-card"><div class="ve-card-title">Resultats DCF</div>{rows_html}</div>', unsafe_allow_html=True)

with col2:
    revenue    = data.get("revenue", 0) or 0
    net_income = data.get("netIncome", 0) or 0
    ebitda     = data.get("ebitda", 0) or 0
    debt       = data.get("totalDebt", 0) or 0
    cash       = data.get("cashAndEquivalents", 0) or 0
    rev_growth = data.get("revenueGrowth", 0) or 0

    rows_fund = [
        ("Chiffre d'affaires",  fmt(revenue),           ""),
        ("Croissance CA (YoY)", f"{rev_growth*100:+.1f}%", "pos" if rev_growth > 0 else "neg"),
        ("EBITDA",              fmt(ebitda),            ""),
        ("Resultat net",        fmt(net_income),        "pos" if net_income > 0 else "neg"),
        ("Dette nette",         fmt(debt - cash),       ""),
        ("ROE",                 f"{roe*100:.1f}%" if roe else "N/A", ""),
    ]
    rows_html2 = "".join([
        '<div class="m-row"><span class="m-label">{}</span><span class="m-val" style="color:{};">{}</span></div>'.format(
            l, "#00d4aa" if c == "pos" else "#ff4d6d" if c == "neg" else "#fff", v
        )
        for l, v, c in rows_fund
    ])
    st.markdown(f'<div class="ve-card"><div class="ve-card-title">Fondamentaux cles</div>{rows_html2}</div>', unsafe_allow_html=True)


# FCF CHART
st.markdown('<div class="sec-label">FREE CASH FLOW - Historique &amp; Projections</div>', unsafe_allow_html=True)

fcf_history = data.get("fcf_history", [])
if fcf_history:
    hist_y = [str(item["date"])[:4] for item in reversed(fcf_history)]
    hist_v = [item["fcf"] / 1e9 for item in reversed(fcf_history)]
    proj_y = [f"An {i+1}" for i in range(horizon)]
    proj_v = [fcf * ((1 + growth / 100) ** (i + 1)) / 1e9 for i in range(horizon)]

    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=hist_y, y=hist_v, name="Historique",
        marker=dict(color=["#1e4d7a" if v >= 0 else "#7b1d1d" for v in hist_v], line=dict(width=0))
    ))
    fig.add_trace(go.Bar(
        x=proj_y, y=proj_v, name="Projection",
        marker=dict(color="#C9A84C", opacity=0.75, line=dict(width=0))
    ))
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family="Inter", color="#6b7d91", size=11),
        margin=dict(l=0, r=0, t=8, b=0), height=230,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1,
                    bgcolor="rgba(0,0,0,0)", font=dict(size=11)),
        xaxis=dict(showgrid=False, showline=False, tickfont=dict(size=11, color="#6b7d91")),
        yaxis=dict(showgrid=True, gridcolor="rgba(255,255,255,0.04)", showline=False,
                   tickformat=".1f", ticksuffix="B$", tickfont=dict(size=11, color="#6b7d91")),
        bargap=0.25, bargroupgap=0.08,
    )
    st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})


# SENSITIVITY MATRIX
if sens is not None and not sens.empty:
    st.markdown('<div class="sec-label">ANALYSE DE SENSIBILITE - Prix Intrinseque ($)</div>', unsafe_allow_html=True)
    st.markdown('<div style="color:#5d7289;font-size:12px;margin:-6px 0 14px 0;">Croissance FCF (lignes) vs WACC (colonnes) - rouge = surevalue, vert = sous-evalue</div>', unsafe_allow_html=True)

    z = sens.values.astype(float)
    text = [[f"${v:.0f}" for v in row] for row in z]

    fig2 = go.Figure(go.Heatmap(
        z=z,
        x=[str(c) for c in sens.columns],
        y=[str(i) for i in sens.index],
        text=text, texttemplate="%{text}",
        textfont=dict(size=12, family="Inter", color="white"),
        colorscale=[[0, "#7b1d1d"], [0.45, "#8b2e2e"],
                    [0.5, "#1a2d45"],
                    [0.55, "#1a4f6e"], [1, "#0a6655"]],
        zmid=current_price, showscale=False,
    ))
    fig2.update_layout(
        paper_bgcolor="rgba(26,45,69,0.6)", plot_bgcolor="rgba(26,45,69,0.6)",
        font=dict(family="Inter", color="#6b7d91", size=11),
        margin=dict(l=60, r=20, t=16, b=50), height=210,
        xaxis=dict(title="WACC (%)", title_font=dict(color="#C9A84C", size=11),
                   tickfont=dict(size=11, color="#8899aa")),
        yaxis=dict(title="Croissance FCF (%)", title_font=dict(color="#C9A84C", size=11),
                   tickfont=dict(size=11, color="#8899aa")),
    )
    st.plotly_chart(fig2, use_container_width=True, config={"displayModeBar": False})


# TRADING COMPS
st.markdown('<div class="sec-label">COMPARAISON SECTORIELLE - Trading Comps</div>', unsafe_allow_html=True)

with st.spinner("Chargement des pairs sectoriels..."):
    peers_df = get_peers_data(ticker, sector)

if not peers_df.empty:
    st.dataframe(peers_df, use_container_width=True, hide_index=True)
else:
    st.info("Donnees des pairs non disponibles.")


# BULL & BEAR
st.markdown('<div class="sec-label">ANALYSE IA - Bull &amp; Bear Case</div>', unsafe_allow_html=True)

with st.spinner("Generation de l'analyse par Claude AI..."):
    try:
        analysis = get_bull_bear_analysis(data, dcf_result)
    except Exception as e:
        analysis = None
        st.error(f"Erreur lors de l'analyse IA : {e}")

if analysis:
    col_bull, col_bear = st.columns(2, gap="medium")
    with col_bull:
        bull_text = analysis.get("bull_case", "").replace("\n", "<br>")
        st.markdown(f"""
        <div class="bb-card bull-bg">
            <div class="bb-title bull-title">BULL CASE - Scenario Haussier</div>
            <div class="bb-body">{bull_text}</div>
        </div>""", unsafe_allow_html=True)
    with col_bear:
        bear_text = analysis.get("bear_case", "").replace("\n", "<br>")
        st.markdown(f"""
        <div class="bb-card bear-bg">
            <div class="bb-title bear-title">BEAR CASE - Scenario Baissier</div>
            <div class="bb-body">{bear_text}</div>
        </div>""", unsafe_allow_html=True)


# VERDICT
if upside > 0.15:
    vd_class  = "vd-buy"
    vd_color  = "#00d4aa"
    vd_title  = "SOUS-EVALUE"
    vd_action = "ACHETER / ACCUMULER"
    vd_text   = f"{name} se negocie avec une decote de {abs(upside)*100:.1f}% par rapport a sa valeur intrinseque DCF."
elif upside < -0.15:
    vd_class  = "vd-sell"
    vd_color  = "#ff4d6d"
    vd_title  = "SUREVALUE"
    vd_action = "VENDRE / REDUIRE"
    vd_text   = f"{name} se negocie avec une prime de {abs(upside)*100:.1f}% au-dessus de sa valeur intrinseque DCF."
else:
    vd_class  = "vd-hold"
    vd_color  = "#C9A84C"
    vd_title  = "JUSTE VALEUR"
    vd_action = "CONSERVER / SURVEILLER"
    vd_text   = f"{name} se negocie proche de sa valeur intrinseque (ecart {upside*100:+.1f}%)."

st.markdown(f"""
<div class="verdict-wrap {vd_class}">
    <div>
        <div class="vd-tag" style="color:{vd_color};">VERDICT VALUENGINE</div>
        <div class="vd-main" style="color:{vd_color};">{vd_title}</div>
        <div class="vd-action">{vd_action}</div>
        <div class="vd-text">{vd_text}</div>
    </div>
    <div class="vd-price-box">
        <div class="vd-price-label">Valeur cible DCF</div>
        <div class="vd-price-val" style="color:{vd_color};">${intrinsic:,.2f}</div>
        <div class="vd-price-sub">vs ${current_price:,.2f} aujourd'hui</div>
    </div>
</div>
""", unsafe_allow_html=True)


# DISCLAIMER
st.markdown("""
<div class="disclaimer">
    ValuEngine est un outil d'aide a la decision uniquement. Les analyses ne constituent pas des conseils en investissement.
    Tout investissement comporte des risques de perte en capital. ValuEngine 2025
</div>
""", unsafe_allow_html=True)
