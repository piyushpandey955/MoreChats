"""
AI Profile Architect -- Reddit-focused persona utilities and generators.
"""

import json
import logging

from google import genai
from google.genai import types

from backend.config import settings

logger = logging.getLogger(__name__)


PERSONA = {
    "name": "Divit",
    "real_name": "Piyush Pandey",
    "age": 21,
    "city": "Delhi NCR",
    "hometown": "Delhi (born and raised)",
    "appearance": "Above average, smart-casual dresser (shirts, chinos, clean shoes)",
    "personality": {
        "social_energy": "Introvert but cool -- chill in small groups, selective about people",
        "first_impression": "Mysterious / hard to read -- intriguing",
        "humor": "Observational -- quietly notices the absurd in everyday life",
        "deeper_side": [
            "Emotional and sensitive (doesn't show it)",
            "Philosophical (thinks about life/existence/meaning)",
            "Feels lonely more than he lets on",
        ],
        "strength_with_women": "Genuinely honest -- no pretense, no games",
        "the_one_thing": "Thinks deeply about everything -- not the typical guy",
    },
    "interests": {
        "movies": "Thrillers, sci-fi, action (Nolan, Villeneuve)",
        "music": "Lo-fi, Bollywood, indie",
        "free_time": "Watching movies, thinking about new tech ideas/concepts",
        "work_relationship": "SDE is a stepping stone -- wants to build his own thing",
        "dream": "Build something that creates real impact",
        "food": "Simple eater, not a foodie",
        "languages": ["English", "Hindi", "Hinglish"],
    },
    "dislikes_in_people": [
        "Arrogance without substance",
        "Fake personalities",
        "Materialistic mindset",
        "Boring one-word-reply energy",
    ],
    "archetype": "The Quiet Storm",
    "archetype_description": (
        "Quiet confidence + depth + enough mystery to make people curious. "
        "Not loud, not performative, thoughtful."
    ),
    "platforms": {
        "reddit": {
            "username": "I_exist",
            "bio_options": [
                "21 | delhi | building things between existential crises | films, lo-fi, and questions nobody asked",
                "probably overthinking something rn | the quiet one who noticed | building stuff that doesn't exist yet",
                "i think more than i speak. which is a lot.",
            ],
            "karma_target": 1000,
            "key_subreddits": [
                "r/movies",
                "r/TrueFilm",
                "r/AskReddit",
                "r/delhi",
                "r/indiasocial",
                "r/CasualConversation",
                "r/Showerthoughts",
            ],
            "comment_style": (
                "Observational, philosophical but accessible, dry humor one-liners, "
                "warm when relevant. Quality over quantity."
            ),
        },
    },
}


REDDIT_READINESS_CHECKLIST = [
    {"key": "username", "label": "Username set (I_exist)", "weight": 10},
    {"key": "bio_set", "label": "Reddit bio set (persona-aligned)", "weight": 10},
    {"key": "karma", "label": "Karma >= 1,000", "weight": 30},
    {"key": "account_age", "label": "Account age >= 14 days", "weight": 15},
    {"key": "comment_history", "label": "20+ quality comments in target subreddits", "weight": 20},
    {"key": "no_red_flags", "label": "No red-flag posts in history", "weight": 15},
]


def _get_client():
    return genai.Client(api_key=settings.gemini_api_key)


def _generate(prompt: str, temperature: float = 0.8) -> str:
    client = _get_client()
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=temperature,
        ),
    )
    return response.text


def score_reddit_profile(profile_data: dict) -> dict:
    """Score a Reddit profile against the readiness checklist."""
    results = []
    total = 0

    for item in REDDIT_READINESS_CHECKLIST:
        key = item["key"]
        weight = item["weight"]
        passed = False

        if key == "username":
            passed = profile_data.get("username") == "I_exist"
        elif key == "bio_set":
            passed = bool(profile_data.get("bio") and len(profile_data["bio"]) > 10)
        elif key == "karma":
            passed = profile_data.get("karma", 0) >= 1000
        elif key == "account_age":
            passed = profile_data.get("account_age_days", 0) >= 14
        elif key == "comment_history":
            passed = profile_data.get("quality_comment_count", 0) >= 20
        elif key == "no_red_flags":
            passed = not profile_data.get("has_red_flags", True)

        score = weight if passed else 0
        total += score
        results.append({**item, "passed": passed, "score": score})

    return {"items": results, "total_score": total, "ready": total >= 70}


def generate_bio_variants(platform: str, context: str = "") -> list[dict]:
    """Generate persona-aligned Reddit bio/about variants using Gemini."""
    if platform != "reddit":
        return []

    persona_desc = (
        f"Name: {PERSONA['name']}, Age: {PERSONA['age']}, City: {PERSONA['city']}. "
        f"Archetype: '{PERSONA['archetype']}' -- {PERSONA['archetype_description']}. "
        f"Personality: {PERSONA['personality']['first_impression']}. "
        f"Humor: {PERSONA['personality']['humor']}. "
        f"Interests: movies ({PERSONA['interests']['movies']}), "
        f"music ({PERSONA['interests']['music']}), {PERSONA['interests']['free_time']}. "
        f"Dream: {PERSONA['interests']['dream']}. "
        f"What makes him different: {PERSONA['personality']['the_one_thing']}"
    )
    prompt = (
        "You are a personal branding expert. Generate 3 Reddit bio/about variants.\n\n"
        f"{persona_desc}\n\n"
        "Reddit username: I_exist\n"
        "Requirements:\n"
        "- Short, witty, signals personality without revealing real identity\n"
        "- Show interests: films, music, philosophy, building things\n"
        "- Match the username's existential/philosophical vibe\n"
        "- Style: lowercase, casual, a bit philosophical\n"
        f"{f'Additional context: {context}' if context else ''}\n\n"
        'Return JSON: {"variants": [{"text": "bio text", "rationale": "why this works"}]}'
    )

    try:
        text = _generate(prompt, temperature=0.8)
        data = json.loads(text)
        variants = data.get("variants", data.get("bios", []))
        if isinstance(variants, list):
            return [
                {
                    "text": v.get("text", v.get("bio", "")),
                    "rationale": v.get("rationale", ""),
                }
                for v in variants
                if isinstance(v, dict)
            ]
    except Exception as exc:
        logger.error(f"Gemini bio generation failed: {exc}")

    return PERSONA["platforms"]["reddit"]["bio_options"]


def generate_reddit_comment_suggestions(subreddit: str, thread_title: str) -> list[dict]:
    """Generate persona-aligned Reddit comment suggestions for karma building."""
    prompt = (
        "You are writing Reddit comments for user 'I_exist'. "
        "Style: observational humor, philosophical but accessible, dry one-liners, warm when relevant.\n\n"
        "Generate 3 comment options for this Reddit thread:\n\n"
        f"Subreddit: r/{subreddit}\n"
        f"Thread title: {thread_title}\n\n"
        "The comments should match Divit's personality: 21, Delhi, film nerd, builder, thoughtful.\n\n"
        'Return JSON: {"comments": [{"text": "comment", "rationale": "why"}]}'
    )

    try:
        text = _generate(prompt, temperature=0.9)
        data = json.loads(text)
        return data.get("comments", [])
    except Exception as exc:
        logger.error(f"Gemini reddit comment generation failed: {exc}")
        return []


def get_persona() -> dict:
    return PERSONA


def get_reddit_checklist() -> list[dict]:
    return REDDIT_READINESS_CHECKLIST
