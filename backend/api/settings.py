"""
Settings API -- Profile readiness, persona data, and app configuration.
"""

from fastapi import APIRouter
from backend.ai.profile_architect import (
    get_persona, get_reddit_checklist,
    score_reddit_profile,
    generate_bio_variants, generate_reddit_comment_suggestions,
)
from backend.config import settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/persona")
def get_persona_data():
    """Get the full persona profile (source of truth)."""
    return get_persona()


@router.get("/reddit-checklist")
def get_reddit_readiness_checklist():
    """Get the Reddit readiness checklist items."""
    return get_reddit_checklist()


@router.post("/score-reddit-profile")
def score_reddit_profile_endpoint(profile_data: dict):
    """Score a Reddit profile against readiness criteria."""
    return score_reddit_profile(profile_data)


@router.post("/generate-bios")
def generate_bios(platform: str = "reddit", context: str = ""):
    """Generate AI-powered bio variants for a platform."""
    return generate_bio_variants(platform, context)


@router.post("/generate-reddit-comments")
def generate_reddit_comments(subreddit: str, thread_title: str):
    """Generate persona-aligned Reddit comment suggestions."""
    return generate_reddit_comment_suggestions(subreddit, thread_title)


@router.get("/rate-limits")
def get_rate_limits():
    """Get current rate limit configuration."""
    return {
        "reddit": {
            "max_dms_per_day": settings.reddit_max_dms_per_day,
        },
    }


@router.get("/test-gemini")
def test_gemini_connection():
    """Quick test to verify Gemini API key works."""
    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=settings.gemini_api_key)
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents="Say 'hello' in one word. Return JSON: {\"reply\": \"hello\"}",
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.0,
            ),
        )
        import json
        data = json.loads(response.text)
        return {"status": "connected", "model": settings.gemini_model, "response": data}
    except Exception as e:
        return {"status": "error", "model": settings.gemini_model, "error": str(e)}


@router.get("/config")
def get_app_config():
    """Get non-sensitive app configuration."""
    return {
        "persona_name": settings.persona_name,
        "reddit_handle": settings.reddit_handle,
        "target_age_range": f"{settings.target_min_age}-{settings.target_max_age}",
        "target_location": settings.target_location,
        "monitored_subreddits": settings.reddit_subreddit_list,
    }
