"""
Community Trends endpoints — anonymous aggregated data.
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, Request

from deps import limiter
from services.community_trends import get_community_trends

logger = logging.getLogger("valuengine")

router = APIRouter()


@router.get("/api/trends")
@limiter.limit("15/minute")
async def community_trends(request: Request):
    """Get community trends: top analyzed, top held, stats. Public endpoint."""
    return get_community_trends()
