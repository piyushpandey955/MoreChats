"""
Reddit Monitor -- Continuously monitors r4r subreddits for new posts
matching our target criteria (female, 18-26, India).
"""

import re
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from backend.reddit.client import RedditClient
from backend.ai.analyzer import analyze_reddit_post
from backend.config import settings

logger = logging.getLogger(__name__)


# Regex patterns for parsing r4r post titles
AGE_GENDER_PATTERN = re.compile(
    r'(\d{1,2})\s*([fFmM])\s*(?:4|for)\s*([fFmMrRaA])',
)
BRACKET_PATTERN = re.compile(
    r'\[(\d{1,2})([fFmM])\s*4\s*([fFmMrRaA])\]',
)
SIMPLE_AGE_GENDER = re.compile(
    r'(\d{1,2})\s*([fFmM])\b',
)

# Indian location keywords
INDIA_KEYWORDS = [
    "india", "indian", "delhi", "mumbai", "bangalore", "bengaluru", "hyderabad",
    "chennai", "pune", "kolkata", "ahmedabad", "jaipur", "noida", "gurgaon",
    "gurugram", "ncr", "lucknow", "chandigarh", "kochi", "indore",
]


class RedditMonitor:
    """Monitors r4r subreddits and filters posts for the pipeline."""

    def __init__(self, client: RedditClient):
        self.client = client
        self._seen_post_ids: set[str] = set()

    def scan_subreddits(self) -> list[dict]:
        """
        Scan all configured subreddits for new matching posts.
        Returns analyzed and filtered posts ready for DB insertion.
        """
        all_results = []

        for subreddit in settings.reddit_subreddit_list:
            try:
                results = self._scan_single_subreddit(subreddit)
                all_results.extend(results)
            except Exception as e:
                logger.error(f"Failed to scan r/{subreddit}: {e}")

        logger.info(f"Reddit scan complete: {len(all_results)} matching posts found")
        return all_results

    def _scan_single_subreddit(self, subreddit: str) -> list[dict]:
        """Scan a single subreddit for matching posts."""
        posts = self.client.get_new_posts(subreddit, limit=25)
        results = []

        for post in posts:
            post_id = post.get("id")

            # Skip already-seen posts
            if post_id in self._seen_post_ids:
                continue
            self._seen_post_ids.add(post_id)

            # Skip deleted authors
            if post["author"] == "[deleted]":
                continue

            # Parse the post title for gender/age
            parsed = self._parse_r4r_title(post["title"], post.get("text", ""))

            # Filter: must be female
            if parsed["gender"] not in ("F", "f"):
                continue

            # Filter: age must be 18-26
            if parsed["age"]:
                if parsed["age"] < settings.target_min_age or parsed["age"] > settings.target_max_age:
                    continue
            # If no age found, we'll let AI determine it

            # Check for India-related location
            has_india = self._check_india_location(post["title"] + " " + post.get("text", ""))

            # Get user data for deeper analysis
            user_data = None
            try:
                user_info = self.client.get_user_info(post["author"])
                user_comments = self.client.get_user_comments(post["author"], limit=20)
                active_subs = self.client.get_user_active_subreddits(post["author"], limit=30)

                if user_info:
                    user_data = {
                        **user_info,
                        "active_subreddits": active_subs,
                        "recent_comments": [c["text"] for c in user_comments[:5]],
                    }
            except Exception as e:
                logger.debug(f"Couldn't get user data for u/{post['author']}: {e}")

            # AI analysis
            try:
                analysis = analyze_reddit_post(
                    post_data={
                        "title": post["title"],
                        "text": post.get("text", ""),
                        "subreddit": subreddit,
                        "url": post.get("url", ""),
                    },
                    user_data=user_data,
                )
            except Exception as e:
                logger.error(f"AI analysis failed for post {post_id}: {e}")
                continue

            # Hard block: underage
            if analysis.get("age_flag") == "underage":
                logger.info(f"Post {post_id} blocked: underage flag")
                continue

            results.append({
                "post": post,
                "parsed": parsed,
                "user_data": user_data,
                "analysis": analysis,
                "has_india_location": has_india,
                "source": f"r/{subreddit}",
            })

        return results

    def _parse_r4r_title(self, title: str, text: str = "") -> dict:
        """
        Parse an r4r post title for age, gender, and seeking info.
        Common formats: "22F4M", "[22F4M]", "22 F looking for M", "22f"
        """
        combined = title + " " + text

        # Try bracket format first: [22F4M]
        match = BRACKET_PATTERN.search(combined)
        if match:
            return {
                "age": int(match.group(1)),
                "gender": match.group(2).upper(),
                "seeking": match.group(3).upper(),
            }

        # Try standard format: 22F4M
        match = AGE_GENDER_PATTERN.search(combined)
        if match:
            return {
                "age": int(match.group(1)),
                "gender": match.group(2).upper(),
                "seeking": match.group(3).upper(),
            }

        # Try simple: 22F
        match = SIMPLE_AGE_GENDER.search(combined)
        if match:
            return {
                "age": int(match.group(1)),
                "gender": match.group(2).upper(),
                "seeking": None,
            }

        return {"age": None, "gender": "unknown", "seeking": None}

    def _check_india_location(self, text: str) -> bool:
        """Check if the text mentions an Indian location."""
        text_lower = text.lower()
        return any(kw in text_lower for kw in INDIA_KEYWORDS)

    def clear_seen_posts(self):
        """Clear the seen posts cache (e.g., on restart)."""
        self._seen_post_ids.clear()
