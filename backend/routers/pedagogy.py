"""
Pedagogy endpoints — "Explain like I'm 15" financial education.
"""

import os
import logging
from fastapi import APIRouter, HTTPException, Request

from anthropic import Anthropic as _Anthropic

from deps import limiter, verify_clerk_token
from services.pedagogy import get_glossary_terms, get_term_explanation, build_pedagogy_prompt

logger = logging.getLogger("valuengine")

router = APIRouter()


def _parse_json(text: str) -> dict:
    """Parse JSON from AI response, handling markdown code blocks."""
    import json
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    return json.loads(text)


@router.get("/api/pedagogy/glossary")
@limiter.limit("30/minute")
async def pedagogy_glossary(request: Request):
    """Return all glossary terms with simple explanations."""
    return {"terms": get_glossary_terms()}


@router.get("/api/pedagogy/term/{term_id}")
@limiter.limit("30/minute")
async def pedagogy_term(term_id: str, request: Request):
    """Get full explanation for a specific glossary term."""
    explanation = get_term_explanation(term_id)
    if not explanation:
        raise HTTPException(status_code=404, detail="Terme non trouve dans le glossaire")
    return explanation


@router.post("/api/pedagogy/explain")
@limiter.limit("5/minute")
async def pedagogy_explain(request: Request):
    """AI-powered explanation of any financial concept. Requires auth."""
    await verify_clerk_token(request)

    try:
        body = await request.json()
        concept = body.get("concept", "").strip()
        context = body.get("context", "").strip()
    except Exception:
        raise HTTPException(status_code=400, detail="Corps de requete invalide")

    if not concept or len(concept) > 200:
        raise HTTPException(status_code=400, detail="Concept requis (max 200 caracteres)")

    # Check glossary first
    glossary_match = get_term_explanation(concept)
    if glossary_match:
        return {"source": "glossary", **glossary_match}

    # AI explanation
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="Service IA temporairement indisponible")

    try:
        prompt = build_pedagogy_prompt(concept, context)
        client = _Anthropic(api_key=api_key)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        result = _parse_json(msg.content[0].text)
        return {"source": "ai", **result}
    except Exception as e:
        logger.error(f"[Pedagogy] AI error: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'explication")
