import streamlit as st
import pandas as pd
from data.fetcher import get_company_data, get_peers_data
from engine.dcf import calculate_dcf, sensitivity_analysis
from ai.analyzer import generate_analysis

st.set_page_config(
    page_title="ValuEngine",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("# 📊 ValuEngine")
st.caption("*Le Bloomberg simplifié — Financial Intelligence*")
st.divider()

with st.sidebar:
    st.markdown("## ⚙️ Paramètres")
    ticker = st.text_input("Ticker", value="AAPL", placeholder="AAPL, MC.PA, LVMH.PA").upper()
    st.markdown("---")
    st.markdown("**Hypothèses DCF**")
    growth_rate = st.slider("Croissance FCF", min_value=1, max_value=25, value=8, step=1)
    wacc = st.slider("WACC", min_value=5, max_value=20, value=10, step=1)
    terminal_growth = st.slider("Croissance terminale", min_value=1, max_value=5, value=3, step=1)
    years = st.selectbox("Horizon de projection", [3, 5, 7, 10], index=1)
    st.markdown("---")
    st.write(f"Croissance FCF : **{growth_rate}%** | WACC : **{wacc}%** | Terminale : **{terminal_growth}%**")
    run = st.button("🚀 Lancer l'analyse", use_container_width=True)

growth_rate_f = growth_rate / 100
wacc_f = wacc / 100
terminal_growth_f = terminal_growth / 100

if run and ticker:
    with st.spinner(f"Chargement des données de {ticker}..."):
        try:
            data = get_company_data(ticker)
            result = calculate_dcf(data, growth_rate_f, terminal_growth_f, wacc_f, years)

            if "error" in result:
                st.error(result["error"])
            else:
                st.markdown(f"## {data['name']}")
                st.caption(f"Secteur : {data['sector']}")
                st.divider()

                st.markdown("### 📌 Vue d'ensemble")
                k1, k2, k3, k4, k5, k6 = st.columns(6)
                k1.metric("Prix actuel", f"${data['current_price']:.2f}")
                k2.metric("Valeur intrinsèque", f"${result['intrinsic_price']:.2f}")
                k3.metric("Potentiel", f"{result['upside']:.1f}%", delta=f"{result['upside']:.1f}%")
                k4.metric("Market Cap", f"${data['market_cap']/1e9:.1f}B")
                k5.metric("P/E Ratio", f"{data['pe_ratio']:.1f}x" if data['pe_ratio'] else "N/A")
                k6.metric("EV/EBITDA", f"{data['ev_ebitda']:.1f}x" if data['ev_ebitda'] else "N/A")

                st.divider()

                col_left, col_right = st.columns(2)
                with col_left:
                    st.markdown("### 💰 Résultats DCF")
                    st.write(f"**Valeur d'entreprise :** ${result['enterprise_value']}B")
                    st.write(f"**Valeur des fonds propres :** ${result['equity_value']}B")
                    st.write(f"**Valeur terminale actualisée :** ${result['terminal_value']}B")
                    st.markdown("---")
                    st.write(f"WACC : {wacc}% | Croissance FCF : {growth_rate}% | Terminale : {terminal_growth}%")

                with col_right:
                    st.markdown("### 📊 Fondamentaux clés")
                    st.write(f"**Chiffre d'affaires :** ${data['revenue']/1e9:.1f}B")
                    st.write(f"**EBIT :** ${data['ebit']/1e9:.1f}B")
                    st.write(f"**Résultat net :** ${data['net_income']/1e9:.1f}B")
                    st.write(f"**Free Cash Flow :** ${data['free_cashflow']/1e9:.1f}B")
                    st.write(f"**Dette nette :** ${(data['total_debt']-data['cash'])/1e9:.1f}B")
                    st.write(f"**Marge nette :** {data['profit_margins']*100:.1f}%")

                st.divider()

                st.markdown("### 📈 Free Cash Flows Projetés")
                df_fcf = pd.DataFrame({
                    "Année": [f"An {i+1}" for i in range(years)],
                    "FCF Projeté (Md$)": result["projected_fcf"],
                    "FCF Actualisé (Md$)": result["discounted_fcf"]
                })
                st.bar_chart(df_fcf.set_index("Année"))
                st.dataframe(df_fcf, use_container_width=True, hide_index=True)

                st.divider()

                st.markdown("### 🔢 Analyse de Sensibilité — Prix Intrinsèque ($)")
                st.caption("Prix intrinsèque selon différentes hypothèses de croissance FCF (lignes) et WACC (colonnes)")
                df_sensitivity = pd.DataFrame(
                    sensitivity_analysis(data, terminal_growth_f, years)
                ).set_index("Croissance FCF")
                st.dataframe(df_sensitivity, use_container_width=True)

                st.divider()

                st.markdown("### 🏢 Comparaison Sectorielle — Trading Comps")
                st.caption(f"Pairs du secteur {data['sector']}")
                with st.spinner("Chargement des comparables..."):
                    peers = get_peers_data(data['sector'], ticker)
                    if peers:
                        st.dataframe(pd.DataFrame(peers), use_container_width=True, hide_index=True)
                    else:
                        st.info("Pas de comparables disponibles pour ce secteur.")

                st.divider()

                st.markdown("### 🧠 Analyse ValuEngine — Bull & Bear Case")
                with st.spinner("Claude analyse l'entreprise..."):
                    ai_result = generate_analysis(data, result)
                    st.markdown(ai_result["analysis"])

                st.divider()

                st.markdown("### 🎯 Verdict ValuEngine")
                if result['upside'] > 20:
                    st.success(f"✅ **SOUS-ÉVALUÉ** — Potentiel de {result['upside']:.1f}%. Attractif selon ce DCF.")
                elif result['upside'] > 0:
                    st.info(f"⚖️ **LÉGÈREMENT SOUS-ÉVALUÉ** — Potentiel de {result['upside']:.1f}%.")
                elif result['upside'] > -20:
                    st.warning(f"⚠️ **LÉGÈREMENT SURÉVALUÉ** — {abs(result['upside']):.1f}% au-dessus de la valeur intrinsèque.")
                else:
                    st.error(f"🔴 **SURÉVALUÉ** — {abs(result['upside']):.1f}% au-dessus de la valeur intrinsèque.")

                st.caption("⚠️ Outil d'aide à la décision uniquement. Pas un conseil en investissement. ValuEngine.")

        except Exception as e:
            st.error(f"Erreur lors de l'analyse : {e}")
else:
    st.info("👈 Entre un ticker dans la barre latérale et lance l'analyse.")
    st.markdown("""
    **Ce que ValuEngine analyse :**
    - 📊 DCF complet avec projections sur 3 à 10 ans
    - 🔢 Table de sensibilité WACC / Croissance FCF
    - 🏢 Comparaison sectorielle (Trading Comps)
    - 🧠 Bull & Bear case généré par Claude
    - 🎯 Verdict actionnable automatique
    """)