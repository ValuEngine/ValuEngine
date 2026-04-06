"""
ValuEngine — Email service via Resend
"""
import os
import resend


def send_alert_email(
    to: str,
    ticker: str,
    ticker_name: str,
    target_price: float,
    current_price: float,
    direction: str,
) -> bool:
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        print("[Email] RESEND_API_KEY manquant — email non envoyé")
        return False

    resend.api_key = api_key

    direction_label = "au-dessus de" if direction == "above" else "en-dessous de"
    change_pct = round((current_price - target_price) / target_price * 100, 2) if target_price else 0
    sign = "+" if change_pct >= 0 else ""
    perf_color = "#3fb950" if change_pct >= 0 else "#f85149"
    app_url = os.environ.get("FRONTEND_URL", "https://valuengine.fr")

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">

    <div style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:32px;">
      <div style="margin-bottom:24px;">
        <span style="background:#C9A84C;color:#09090b;font-weight:800;padding:4px 14px;border-radius:999px;font-size:11px;letter-spacing:2px;text-transform:uppercase;">ValuEngine</span>
      </div>

      <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 6px 0;">🔔 Alerte déclenchée</h1>
      <p style="color:#71717a;font-size:14px;margin:0 0 28px 0;">Votre seuil prix a été franchi</p>

      <div style="background:#27272a;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="color:#C9A84C;font-weight:800;font-size:20px;margin:0 0 2px 0;">{ticker}</p>
        <p style="color:#a1a1aa;font-size:13px;margin:0 0 20px 0;">{ticker_name}</p>
        <div style="display:flex;gap:24px;flex-wrap:wrap;">
          <div>
            <p style="color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 4px 0;">Prix actuel</p>
            <p style="color:#ffffff;font-size:22px;font-weight:800;margin:0;">${current_price:.2f}</p>
          </div>
          <div>
            <p style="color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 4px 0;">Votre seuil</p>
            <p style="color:#C9A84C;font-size:22px;font-weight:800;margin:0;">${target_price:.2f}</p>
          </div>
          <div>
            <p style="color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 4px 0;">Écart</p>
            <p style="color:{perf_color};font-size:22px;font-weight:800;margin:0;">{sign}{change_pct}%</p>
          </div>
        </div>
      </div>

      <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
        <strong style="color:#ffffff;">{ticker_name}</strong> est passé
        <strong style="color:#C9A84C;"> {direction_label} votre seuil de ${target_price:.2f}</strong>.
      </p>

      <a href="{app_url}/analyze?ticker={ticker}"
         style="display:inline-block;background:#C9A84C;color:#09090b;font-weight:800;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;">
        Voir l'analyse complète →
      </a>
    </div>

    <p style="color:#3f3f46;font-size:11px;text-align:center;margin-top:20px;line-height:1.7;padding:0 8px;">
      ValuEngine est un outil d'analyse financière à vocation éducative.
      Les alertes ne constituent pas des conseils en investissement au sens de la directive MIF II.<br>
      Pour ne plus recevoir ces alertes, supprimez-les depuis l'application.
    </p>
  </div>
</body>
</html>"""

    try:
        resend.Emails.send({
            "from": "ValuEngine Alertes <alertes@valuengine.io>",
            "to": [to],
            "subject": f"🔔 Alerte ValuEngine — {ticker} a franchi ${target_price:.2f}",
            "html": html,
        })
        print(f"[Email] Alerte envoyée à {to} pour {ticker}")
        return True
    except Exception as e:
        print(f"[Email] Erreur: {e}")
        return False


def send_welcome_email(to: str, first_name: str) -> bool:
    """Envoie un email de bienvenue après inscription."""
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        print("[Email] RESEND_API_KEY manquant — email non envoyé")
        return False

    resend.api_key = api_key

    app_url = os.environ.get("FRONTEND_URL", "https://valuengine.fr")

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">

    <div style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:32px;">
      <div style="margin-bottom:24px;">
        <span style="background:#C9A84C;color:#09090b;font-weight:800;padding:4px 14px;border-radius:999px;font-size:11px;letter-spacing:2px;text-transform:uppercase;">ValuEngine</span>
      </div>

      <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 6px 0;">Bienvenue {first_name} !</h1>
      <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
        Ton compte ValuEngine est prêt. Tu peux maintenant analyser n'importe quelle action
        cotée en bourse grâce à notre modèle DCF augmenté par IA.
      </p>

      <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
        Pour commencer, lance ta première analyse en un clic :
      </p>

      <a href="{app_url}/analyze?ticker=MC.PA"
         style="display:inline-block;background:#C9A84C;color:#09090b;font-weight:800;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:14px;">
        Analyser LVMH maintenant →
      </a>

      <p style="color:#71717a;font-size:13px;line-height:1.6;margin:24px 0 0 0;">
        Tu recevras aussi des alertes prix personnalisées et des analyses comparatives
        pour prendre des décisions éclairées.
      </p>
    </div>

    <p style="color:#3f3f46;font-size:11px;text-align:center;margin-top:20px;line-height:1.7;padding:0 8px;">
      ValuEngine est un outil d'analyse financière à vocation éducative.
      Les informations fournies ne constituent pas des conseils en investissement
      au sens de la directive MIF II ni du règlement général de l'AMF.<br>
      Pour ne plus recevoir ces emails, gérez vos préférences depuis votre compte.
    </p>
  </div>
</body>
</html>"""

    try:
        resend.Emails.send({
            "from": "ValuEngine <contact@valuengine.fr>",
            "to": [to],
            "subject": f"Bienvenue sur ValuEngine, {first_name} \u2014 Lance ta premi\u00e8re analyse",
            "html": html,
        })
        print(f"[Email] Welcome envoyé à {to}")
        return True
    except Exception as e:
        print(f"[Email] Erreur welcome: {e}")
        return False


def send_weekly_digest(
    to: str,
    first_name: str,
    top_tickers: list,
    user_analyses_count: int,
) -> bool:
    """Envoie le digest hebdomadaire avec les tickers tendance et stats utilisateur."""
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        print("[Email] RESEND_API_KEY manquant — email non envoyé")
        return False

    resend.api_key = api_key
    app_url = os.environ.get("FRONTEND_URL", "https://valuengine.fr")

    # Build top tickers HTML rows
    tickers_rows = ""
    for t in top_tickers[:5]:
        ticker = t.get("ticker", "")
        name = t.get("name", ticker)
        verdict = t.get("verdict", "HOLD")
        count = t.get("count", 0)
        verdict_color = "#3fb950" if verdict == "BUY" else ("#f85149" if verdict == "SELL" else "#C9A84C")
        verdict_label = "Sous-evalue" if verdict == "BUY" else ("Surevalue" if verdict == "SELL" else "Juste valeur")
        tickers_rows += f"""<tr style="border-bottom:1px solid #27272a;">
<td style="padding:10px 0;color:#C9A84C;font-weight:700;font-size:13px;">{ticker}</td>
<td style="padding:10px 0;color:#a1a1aa;font-size:13px;">{name}</td>
<td style="padding:10px 0;color:{verdict_color};font-size:12px;font-weight:700;text-align:right;">{verdict_label}</td>
</tr>"""

    if not tickers_rows:
        tickers_rows = '<tr><td style="padding:10px 0;color:#71717a;font-size:13px;" colspan="3">Aucune analyse cette semaine</td></tr>'

    greeting = first_name if first_name else "investisseur"

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:system-ui,-apple-system,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
<div style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:32px;">

<div style="margin-bottom:24px;">
<span style="background:#C9A84C;color:#09090b;font-weight:800;padding:4px 14px;border-radius:999px;font-size:11px;letter-spacing:2px;text-transform:uppercase;">ValuEngine Weekly</span>
</div>

<h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0 0 12px 0;">Votre digest hebdomadaire</h1>
<p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 20px 0;">
Bonjour {greeting}, voici le resume de la semaine sur ValuEngine.
</p>

<div style="background:#27272a;border-radius:12px;padding:16px;margin-bottom:20px;">
<p style="color:#C9A84C;font-weight:700;font-size:13px;margin:0 0 12px 0;">Actions les plus analysees cette semaine</p>
<table style="width:100%;border-collapse:collapse;">
{tickers_rows}
</table>
</div>

<div style="background:#27272a;border-radius:12px;padding:16px;margin-bottom:20px;">
<p style="color:#C9A84C;font-weight:700;font-size:13px;margin:0 0 8px 0;">Votre activite</p>
<p style="color:#e4e4e7;font-size:13px;margin:0;">
{user_analyses_count} analyse{"s" if user_analyses_count != 1 else ""} cette semaine
</p>
</div>

<a href="{app_url}/dashboard"
   style="display:inline-block;background:#C9A84C;color:#09090b;font-weight:800;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;">
Voir mon dashboard &rarr;
</a>
</div>

<p style="color:#3f3f46;font-size:11px;text-align:center;margin-top:20px;line-height:1.7;padding:0 8px;">
ValuEngine est un outil d'analyse financiere a vocation educative.
Les informations ne constituent pas des conseils en investissement au sens de la directive MIF II.<br>
<a href="{app_url}" style="color:#52525b;">valuengine.fr</a>
</p>
</div>
</body></html>"""

    try:
        resend.Emails.send({
            "from": "ValuEngine <contact@valuengine.fr>",
            "to": [to],
            "subject": "Votre digest hebdomadaire ValuEngine",
            "html": html,
        })
        print(f"[Email] Weekly digest envoyé à {to}")
        return True
    except Exception as e:
        print(f"[Email] Erreur weekly digest: {e}")
        return False
