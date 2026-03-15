"""
AI Message Crafter -- Generates personalized Reddit outreach responses
based on Divit's persona.
Uses configured LLM provider (Gemini or NVIDIA NIM).
"""

import json
from backend.ai.llm import generate_json


def _generate(prompt: str, temperature: float = 0.8) -> str:
    """Generate content and return JSON text."""
    return generate_json(prompt, temperature=temperature)


PERSONA_CONTEXT = f"""You are crafting messages on behalf of Divit (I_exist on Reddit).

Divit's personality:
- 21, Delhi, above-average looking, smart-casual style
- Archetype: "The Quiet Storm" -- quiet confidence, depth, mystery
- Humor: Observational -- notices the absurd in everyday life
- Interests: Thrillers/sci-fi films (Nolan, Villeneuve), lo-fi music, indie, building tech products
- Deeper side: Philosophical, emotional (doesn't show it), thinks about life/meaning
- Strength: Genuinely honest -- no pretense, no games
- Dream: Building something that creates real impact
- Communication: English, Hindi, Hinglish -- fluid code-switcher

Divit's voice in messages:
- Warm but not eager
- Curious but not interrogative
- Witty but not trying too hard
- Specific references over generic compliments
- Lowercase casual style, not formal
- Brief -- says more with less
- NEVER: pickup lines, appearance compliments, "hey beautiful", desperation, walls of text
"""


def craft_reddit_responses(post_data: dict, post_analysis: dict, count: int = 3) -> list[dict]:
    """
    Generate personalized Reddit r4r responses using the Notice-Connect-Ask framework.

    Args:
        post_data: The original r4r post (title, text, subreddit)
        post_analysis: Output from analyzer.analyze_reddit_post()
        count: Number of variants to generate

    Returns:
        list of {text, rationale, send_method} dicts
    """
    prompt = f"""{PERSONA_CONTEXT}

Generate {count} Reddit response variants for this r4r post.

THE POST:
- Title: {post_data.get('title', '')}
- Text: {post_data.get('text', '')}
- Subreddit: r/{post_data.get('subreddit', 'unknown')}

AI ANALYSIS:
- Primary category: {post_analysis.get('primary_category', 'unknown')}
- Intent: {post_analysis.get('intent', 'unknown')}
- Personality traits: {post_analysis.get('personality_traits', [])}
- Interests: {post_analysis.get('interest_tags', [])}
- Recommended approach: {post_analysis.get('recommended_approach', '')}

NOTICE-CONNECT-ASK FRAMEWORK:
1. NOTICE: Reference something specific from their post (shows you actually read it)
2. CONNECT: Share a brief related personal detail from Divit's life (builds rapport)
3. ASK: End with an easy question they can respond to (gives them something to work with)

RULES:
- 3-5 sentences max
- Proper grammar and spelling (research: +37% reply rate)
- Match their energy level (casual if they're casual, thoughtful if they're thoughtful)
- NO pickup lines, NO "hey beautiful", NO appearance compliments
- Each variant should use a different angle/hook
- Recommend whether to send as DM or comment (most r4r posts prefer DMs)

Return JSON:
{{
    "responses": [
        {{
            "text": "the actual response text",
            "rationale": "why this approach works for this specific post",
            "send_method": "dm" or "comment",
            "hook_used": "what specific thing from their post you referenced"
        }}
    ]
}}"""

    try:
        text = _generate(prompt, temperature=0.8)
        data = json.loads(text)
        return data.get("responses", [])
    except (json.JSONDecodeError, Exception):
        return []
