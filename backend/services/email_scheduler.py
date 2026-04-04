"""
ValuEngine — Email sequence scheduler.
Checks which users are at D+3, D+7, D+30 and sends appropriate onboarding emails.
Called daily via GitHub Actions cron.
"""
import os
import logging
from datetime import datetime, timedelta, timezone
import resend

logger = logging.getLogger("valuengine")

FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://valuengine.fr")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def _sb_get(table: str, query: str) -> list:
    """Minimal Supabase REST GET."""
    import httpx
    if not SUPABASE_URL or not SUPABASE_KEY:
        return []
    url = f"{SUPABASE_URL}/rest/v1/{table}?{query}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    try:
        r = httpx.get(url, headers=headers, timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.error(f"[EmailScheduler] Supabase GET error: {e}")
        return []


def _sb_patch(table: str, query: str, body: dict) -> bool:
    """Minimal Supabase REST PATCH."""
    import httpx
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False
    url = f"{SUPABASE_URL}/rest/v1/{table}?{query}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    try:
        r = httpx.patch(url, headers=headers, json=body, timeout=15)
        r.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"[EmailScheduler] Supabase PATCH error: {e}")
        return False


def _send_email(to: str, subject: str, html: str) -> bool:
    """Send email via Resend."""
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        logger.warning("[EmailScheduler] RESEND_API_KEY missing")
        return False
    resend.api_key = api_key
    try:
        resend.Emails.send({
            "from": "ValuEngine <contact@valuengine.fr>",
            "to": [to],
            "subject": subject,
            "html": html,
        })
        logger.info(f"[EmailScheduler] Sent '{subject}' to {to}")
        return True
    except Exception as e:
        logger.error(f"[EmailScheduler] Send error: {e}")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# EMAIL TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════════

def _email_wrapper(content: str) -> str:
    """Wraps content in the standard ValuEngine email layout."""
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:system-ui,-apple-system,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
<div style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:32px;">
<div style="margin-bottom:24px;">
<span style="background:#C9A84C;color:#09090b;font-weight:800;padding:4px 14px;border-radius:999px;font-size:11px;letter-spacing:2px;text-transform:uppercase;">ValuEngine</span>
</div>
{content}
</div>
<p style="color:#3f3f46;font-size:11px;text-align:center;margin-top:20px;line-height:1.7;padding:0 8px;">
ValuEngine est un outil d'analyse financi&egrave;re &agrave; vocation &eacute;ducative.
Les informations ne constituent pas des conseils en investissement au sens de la directive MIF II.<br>
<a href="{FRONTEND_URL}" style="color:#52525b;">valuengine.fr</a>
</p>
</div>
</body></html>"""


def _day3_html(first_name: str) -> str:
    return _email_wrapper(f"""
<h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0 0 12px 0;">Avez-vous test&eacute; l'analyse IA ? &#128064;</h1>
<p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 20px 0;">
Bonjour {first_name},<br><br>
Vous avez cr&eacute;&eacute; votre compte il y a 3 jours mais n'avez pas encore lanc&eacute; d'analyse.
Voici un aper&ccedil;u de ce que notre IA g&eacute;n&egrave;re en 60 secondes :
</p>
<div style="background:#27272a;border-radius:12px;padding:16px;margin-bottom:20px;">
<p style="color:#C9A84C;font-weight:800;font-size:16px;margin:0 0 8px 0;">Apple (AAPL) &mdash; Exemple d'analyse</p>
<p style="color:#3fb950;font-size:13px;margin:0 0 4px 0;">&#9650; Bull Case : Croissance Services &agrave; +15%, monetisation IA</p>
<p style="color:#f85149;font-size:13px;margin:0 0 4px 0;">&#9660; Bear Case : Exposition Chine, saturation iPhone</p>
<p style="color:#a1a1aa;font-size:12px;margin:8px 0 0 0;">+ DCF interactif, SWOT, PESTLE, matrice de sensibilit&eacute;</p>
</div>
<a href="{FRONTEND_URL}/analyze?ticker=AAPL" style="display:inline-block;background:#C9A84C;color:#09090b;font-weight:800;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;">
Voir l'analyse compl&egrave;te &rarr;
</a>
<p style="color:#71717a;font-size:12px;margin:16px 0 0 0;">Vous avez encore 3 analyses gratuites aujourd'hui.</p>
""")


def _day7_html(first_name: str) -> str:
    return _email_wrapper(f"""
<h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0 0 12px 0;">Vos 3 analyses gratuites &mdash; et apr&egrave;s ? &#10022;</h1>
<p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 20px 0;">
Bonjour {first_name},<br><br>
Avec le plan gratuit, vous avez acc&egrave;s &agrave; 3 analyses par jour.
Voici ce que les membres Pro d&eacute;bloquent :
</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
<tr style="border-bottom:1px solid #27272a;">
<td style="padding:10px 0;color:#71717a;font-size:13px;">Analyses / jour</td>
<td style="padding:10px 0;color:#a1a1aa;font-size:13px;text-align:center;">3</td>
<td style="padding:10px 0;color:#C9A84C;font-size:13px;text-align:center;font-weight:700;">Illimit&eacute;</td>
</tr>
<tr style="border-bottom:1px solid #27272a;">
<td style="padding:10px 0;color:#71717a;font-size:13px;">Deep Analysis IA</td>
<td style="padding:10px 0;color:#a1a1aa;font-size:13px;text-align:center;">&mdash;</td>
<td style="padding:10px 0;color:#C9A84C;font-size:13px;text-align:center;">&#10003;</td>
</tr>
<tr style="border-bottom:1px solid #27272a;">
<td style="padding:10px 0;color:#71717a;font-size:13px;">Export PDF</td>
<td style="padding:10px 0;color:#a1a1aa;font-size:13px;text-align:center;">&mdash;</td>
<td style="padding:10px 0;color:#C9A84C;font-size:13px;text-align:center;">&#10003;</td>
</tr>
<tr style="border-bottom:1px solid #27272a;">
<td style="padding:10px 0;color:#71717a;font-size:13px;">Screener IA</td>
<td style="padding:10px 0;color:#a1a1aa;font-size:13px;text-align:center;">&mdash;</td>
<td style="padding:10px 0;color:#C9A84C;font-size:13px;text-align:center;">&#10003;</td>
</tr>
<tr>
<td style="padding:10px 0;color:#71717a;font-size:13px;">Portfolio IA</td>
<td style="padding:10px 0;color:#a1a1aa;font-size:13px;text-align:center;">&mdash;</td>
<td style="padding:10px 0;color:#C9A84C;font-size:13px;text-align:center;">&#10003;</td>
</tr>
</table>
<a href="{FRONTEND_URL}/dashboard" style="display:inline-block;background:#C9A84C;color:#09090b;font-weight:800;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:14px;">
Passer Pro &mdash; 99&euro;/an (2 mois offerts) &rarr;
</a>
<p style="color:#71717a;font-size:12px;margin:12px 0 0 0;">Satisfait ou rembours&eacute; 14 jours.</p>
""")


def _day30_html(first_name: str) -> str:
    return _email_wrapper(f"""
<h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0 0 12px 0;">Un mois avec ValuEngine</h1>
<p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 20px 0;">
Bonjour {first_name},<br><br>
Cela fait un mois que vous avez rejoint ValuEngine. Voici ce que nos membres Pro ont analys&eacute; ce mois :
</p>
<div style="background:#27272a;border-radius:12px;padding:16px;margin-bottom:20px;">
<p style="color:#C9A84C;font-weight:700;font-size:13px;margin:0 0 8px 0;">&#128293; Actions les plus analys&eacute;es</p>
<p style="color:#e4e4e7;font-size:13px;margin:0;">AAPL &middot; NVDA &middot; MC.PA &middot; MSFT &middot; TSLA &middot; GOOGL &middot; TTE.PA</p>
</div>
<p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 20px 0;">
Avec le plan Pro, vous d&eacute;bloquez les analyses illimit&eacute;es, le Screener IA,
l'export PDF et bien plus.
</p>
<a href="{FRONTEND_URL}/analyze" style="display:inline-block;background:#C9A84C;color:#09090b;font-weight:800;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;margin-right:8px;">
Reprendre mes analyses &rarr;
</a>
""")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN SCHEDULER
# ═══════════════════════════════════════════════════════════════════════════════

def run_email_sequences() -> dict:
    """
    Check which users are at D+3, D+7, D+30 and send appropriate emails.
    Uses `email_sequence_sent` field in the users table to avoid duplicates.
    Returns a summary of actions taken.
    """
    now = datetime.now(timezone.utc)
    results = {"d3": 0, "d7": 0, "d30": 0, "errors": 0}

    # Query users who signed up in the relevant windows
    for day_offset, email_key, subject_fn, html_fn in [
        (3,  "d3",  lambda n: "Avez-vous teste l'analyse IA ? \U0001f440", _day3_html),
        (7,  "d7",  lambda n: "Vos 3 analyses gratuites \u2014 et apres ? \u2726", _day7_html),
        (30, "d30", lambda n: "Un mois avec ValuEngine \u2014 voici ce que vous avez manque", _day30_html),
    ]:
        target_date = (now - timedelta(days=day_offset)).strftime("%Y-%m-%d")

        # Get users created on target_date who haven't received this email yet
        # and are NOT Pro (no need to onboard Pro users)
        users = _sb_get(
            "users",
            f"created_at=gte.{target_date}T00:00:00Z"
            f"&created_at=lt.{target_date}T23:59:59Z"
            f"&is_pro=eq.false"
            f"&select=id,email,first_name,email_sequence_sent"
        )

        for user in users:
            email = user.get("email", "")
            first_name = user.get("first_name", "")
            sent_flags = user.get("email_sequence_sent") or ""

            if not email or email_key in sent_flags:
                continue  # Already sent or no email

            subject = subject_fn(first_name)
            html = html_fn(first_name or "investisseur")

            if _send_email(email, subject, html):
                # Mark as sent
                new_flags = f"{sent_flags},{email_key}" if sent_flags else email_key
                _sb_patch("users", f"id=eq.{user['id']}", {"email_sequence_sent": new_flags})
                results[email_key] += 1
            else:
                results["errors"] += 1

    logger.info(f"[EmailScheduler] Results: {results}")
    return results
