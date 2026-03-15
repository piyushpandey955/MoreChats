"""
AI Analyzer -- Analyzes Reddit posts/users
to produce category scores, personality traits, and match scores.
Uses Google Gemini via the google-genai SDK.
"""

import json
from google import genai
from google.genai import types
from backend.config import settings
from backend.models.schemas import Category


CATEGORIES_DESCRIPTION = {
    Category.AMBITIOUS: "Intelligent, career-driven, building something cool. Goal-oriented, passionate about growth.",
    Category.ROMANTIC: "Attractive, flirty energy. Brings sexual/romantic intimacy. Confident in their femininity.",
    Category.SWEET: "Kind, warm, beautiful. Brings love and emotional depth. Empathetic and caring.",
    Category.FRIEND: "Platonic, easy to talk to. Great conversationalist. Companionship within boundaries.",
    Category.FLING: "Casual, spontaneous, fun. Adventurous and exciting. Lives in the moment.",
    Category.NURTURER: "Caring, attentive, supportive. Comforting presence. Makes you feel looked after.",
}


def _generate(prompt: str, temperature: float = 0.4) -> str:
    """Generate content using Gemini and return the response text."""
    client = genai.Client(api_key=settings.gemini_api_key)
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=temperature,
        ),
    )
    return response.text


SYSTEM_INSTRUCTION = """You are an AI analyst for a personal CRM system. Your job is to analyze social media profiles/posts and score them against 6 personality archetypes.

The 6 archetypes:
1. AMBITIOUS - Intelligent, career-driven, building something cool, goal-oriented
2. ROMANTIC - Attractive, flirty energy, confident, romantic interest potential
3. SWEET - Kind, warm, empathetic, emotionally deep, loving
4. FRIEND - Great conversationalist, platonic potential, easy to talk to
5. FLING - Casual, spontaneous, fun, adventurous, lives in the moment
6. NURTURER - Caring, attentive, supportive, comforting, makes you feel looked after

You must also:
- Estimate age (only 18-26 are acceptable; flag if likely outside range)
- Extract personality traits (list of 3-5 adjectives)
- Extract interest tags (list of 3-8 interests)
- Estimate approachability (0-100: likelihood of responding to a thoughtful DM)
- Calculate match score (0-100: overall alignment with someone seeking balanced connections)
- Write a brief analysis summary (2-3 sentences)

CRITICAL: If the person appears to be under 18, set all scores to 0 and flag as "underage".

Always respond in valid JSON format."""


def analyze_reddit_post(post_data: dict, user_data: dict = None) -> dict:
    """
    Analyze a Reddit r4r post (+ optional user profile) and return scores.

    Args:
        post_data: dict with keys: title, text, subreddit, url, created_utc
        user_data: optional dict with keys: username, karma, account_age_days,
                   active_subreddits, recent_comments

    Returns:
        dict with category scores, traits, interests, match_score, intent, etc.
    """
    user_context = ""
    if user_data:
        user_context = f"""
User profile data:
- Username: {user_data.get('username', 'unknown')}
- Karma: {user_data.get('karma', 0)}
- Account age: {user_data.get('account_age_days', 'unknown')} days
- Active subreddits: {json.dumps(user_data.get('active_subreddits', [])[:15])}
- Recent comments (sample): {json.dumps(user_data.get('recent_comments', [])[:5])}
"""

    prompt = f"""{SYSTEM_INSTRUCTION}

Analyze this Reddit r4r post and the user who wrote it:

Post title: {post_data.get('title', '')}
Post text: {post_data.get('text', '')}
Subreddit: r/{post_data.get('subreddit', 'unknown')}
{user_context}

Parse the post for:
1. Age and gender from title/text (e.g., "22F" or "[22F4M]")
2. Location mentions
3. What they're looking for (intent)

Return a JSON object with:
{{
    "category_scores": {{
        "ambitious": 0-100,
        "romantic": 0-100,
        "sweet": 0-100,
        "friend": 0-100,
        "fling": 0-100,
        "nurturer": 0-100
    }},
    "primary_category": "one of the 6 categories",
    "parsed_age": number or null,
    "parsed_gender": "F" or "M" or "unknown",
    "age_flag": "ok" or "underage" or "overage" or "unknown",
    "location_estimate": "string or null",
    "intent": "friendship" or "relationship" or "casual" or "chatting" or "mixed",
    "personality_traits": ["trait1", "trait2"],
    "interest_tags": ["interest1", "interest2"],
    "approachability_score": 0-100,
    "match_score": 0-100,
    "analysis_summary": "2-3 sentence analysis",
    "recommended_approach": "brief suggestion on how to approach this person"
}}"""

    try:
        text = _generate(prompt)
        return json.loads(text)
    except (json.JSONDecodeError, Exception) as e:
        return {"error": f"Failed to parse AI response: {e}"}
