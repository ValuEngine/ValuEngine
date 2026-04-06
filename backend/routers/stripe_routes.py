"""
Stripe endpoints — checkout, verify session, webhook.
"""

import os
import logging
import traceback
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

import stripe

from deps import (
    limiter, _sb_get, _sb_patch, _webhook_patch_user,
)
from models import CheckoutRequest

logger = logging.getLogger("valuengine")

router = APIRouter()


@router.post("/api/stripe/create-checkout")
@limiter.limit("3/minute")
async def create_checkout(request: Request):
    try:
        body = await request.json()
        checkout_req = CheckoutRequest(**body)
    except Exception:
        raise HTTPException(status_code=400, detail="Donnees de checkout invalides")
    user_id = checkout_req.userId
    user_email = checkout_req.userEmail
    plan = checkout_req.plan

    if not stripe.api_key or stripe.api_key == "sk_test_REMPLACE":
        raise HTTPException(status_code=503, detail="Stripe non configuré")

    if plan == "yearly":
        price_id = os.environ.get("STRIPE_PRICE_ID_YEARLY", "")
    else:
        price_id = os.environ.get("STRIPE_PRICE_ID", "")

    if not price_id:
        raise HTTPException(status_code=400, detail=f"Price ID non configuré pour le plan '{plan}'")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=os.environ.get("FRONTEND_URL", "http://localhost:3000") + "/success?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=os.environ.get("FRONTEND_URL", "http://localhost:3000") + "/?canceled=true",
            customer_email=user_email,
            metadata={"userId": user_id, "plan": plan},
        )
        return {"url": session.url}
    except Exception as e:
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@router.get("/api/stripe/verify-session")
@limiter.limit("5/minute")
async def verify_stripe_session(request: Request, session_id: str):
    """Vérifie une session Stripe Checkout et active le Pro si valide."""
    logger.info(f"[verify-session] Début — session_id={session_id[:20]}...")

    if not stripe.api_key or stripe.api_key == "sk_test_REMPLACE":
        raise HTTPException(status_code=503, detail="Stripe non configuré")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id requis")

    try:
        session = stripe.checkout.Session.retrieve(session_id)
        logger.info(f"[verify-session] Stripe session retrieved — payment_status={session.payment_status}, metadata={dict(session.metadata)}")
    except Exception as e:
        logger.error(f"[verify-session] Stripe retrieve error: {e}")
        raise HTTPException(status_code=400, detail="Session de paiement invalide")

    if session.payment_status != "paid":
        logger.warning(f"[verify-session] Payment not confirmed: {session.payment_status}")
        raise HTTPException(status_code=402, detail="Paiement non confirmé")

    user_id = session.metadata.get("userId", "")
    plan = session.metadata.get("plan", "monthly")
    subscription_id = session.subscription

    logger.info(f"[verify-session] user_id={user_id}, plan={plan}, subscription_id={subscription_id}")

    if not user_id:
        raise HTTPException(status_code=400, detail="userId manquant dans la session")

    pro_duration = timedelta(days=365) if plan == "yearly" else timedelta(days=31)
    pro_until = (datetime.now(timezone.utc) + pro_duration).isoformat()
    update_body = {
        "is_pro": True,
        "pro_until": pro_until,
        "stripe_subscription_id": subscription_id or "",
    }

    update_minimal = {"is_pro": True, "stripe_subscription_id": subscription_id or ""}
    updated_rows = _webhook_patch_user(user_id, update_body, update_minimal)

    if not updated_rows:
        logger.error(f"[verify-session] AUCUNE ligne mise à jour pour user_id={user_id}")
        return {"is_pro": True, "user_id": user_id, "plan": plan, "db_updated": False}

    logger.info(f"[verify-session] SUCCESS — Pro activé pour user_id={user_id}")
    return {"is_pro": True, "user_id": user_id, "plan": plan, "db_updated": True}


@router.post("/api/stripe/webhook")
async def stripe_webhook(request: Request):
    """
    Webhook Stripe — TOUJOURS retourner 200 pour éviter les retries infinis.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

    logger.info(f"[Webhook] Reçu — sig={'oui' if sig_header else 'NON'}, secret={'oui' if webhook_secret else 'NON CONFIGURÉ'}")

    if not webhook_secret:
        logger.error("[Webhook] STRIPE_WEBHOOK_SECRET non configuré sur Railway")
        return JSONResponse({"error": "Webhook secret missing"}, status_code=400)

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except ValueError as e:
        logger.error(f"[Webhook] Payload invalide: {e}")
        return JSONResponse({"error": "Invalid payload"}, status_code=400)
    except Exception as e:
        logger.error(f"[Webhook] Signature invalide: {e}")
        return JSONResponse({"error": "Invalid signature"}, status_code=400)

    try:
        event_type = event.get("type", "unknown")
        logger.info(f"[Webhook] Event reçu: {event_type}")

        if event_type == "checkout.session.completed":
            session = event["data"]["object"]
            metadata = session.get("metadata") or {}

            logger.info(f"[Webhook] Session metadata: {metadata}")
            logger.info(f"[Webhook] Session subscription: {session.get('subscription')}")
            logger.info(f"[Webhook] Customer email: {session.get('customer_email')}")

            user_id = metadata.get("userId", "")
            plan = metadata.get("plan", "monthly")
            subscription_id = session.get("subscription", "")

            if not user_id:
                logger.error("[Webhook] ERREUR: userId ABSENT dans session.metadata")
                logger.error(f"[Webhook] metadata complète = {metadata}")
                return {"status": "ok"}

            pro_duration = timedelta(days=365) if plan == "yearly" else timedelta(days=31)
            pro_until = (datetime.now(timezone.utc) + pro_duration).isoformat()

            update_full = {
                "is_pro": True,
                "pro_until": pro_until,
                "stripe_subscription_id": str(subscription_id or ""),
            }
            update_minimal = {
                "is_pro": True,
                "stripe_subscription_id": str(subscription_id or ""),
            }

            updated = _webhook_patch_user(user_id, update_full, update_minimal)

            if updated:
                logger.info(f"[Webhook] SUCCESS — Pro activé pour user_id={user_id}, plan={plan}")
            else:
                logger.error(f"[Webhook] ECHEC — 0 rows updated pour user_id={user_id}")
                logger.error(f"[Webhook] Vérifier que l'utilisateur existe dans la table 'users' avec id={user_id}")

        elif event_type == "customer.subscription.deleted":
            sub_id = event["data"]["object"].get("id", "")
            logger.info(f"[Webhook] subscription.deleted — sub_id={sub_id}")

            from deps import _SUPA_URL, _SUPA_KEY
            if sub_id and _SUPA_URL and _SUPA_KEY:
                try:
                    rows = _sb_get("users", f"stripe_subscription_id=eq.{sub_id}&select=id")
                    if rows:
                        uid = rows[0].get("id", "")
                        if uid:
                            _sb_patch("users", f"id=eq.{uid}", {"is_pro": False, "stripe_subscription_id": ""})
                            logger.info(f"[Webhook] Pro révoqué pour sub={sub_id}")
                    else:
                        logger.warning(f"[Webhook] Aucun user trouvé pour sub={sub_id}")
                except Exception as e:
                    logger.error(f"[Webhook] Erreur révocation: {e}")

        else:
            logger.info(f"[Webhook] Event ignoré: {event_type}")

    except Exception as e:
        logger.error(f"[Webhook] ERREUR CRITIQUE NON GÉRÉE: {e}")
        logger.error(traceback.format_exc())

    return {"status": "ok"}
