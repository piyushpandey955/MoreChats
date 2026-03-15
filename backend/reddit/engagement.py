"""
Reddit Engagement -- Handles karma building and organic engagement.
"""

import logging
from backend.reddit.client import RedditClient

logger = logging.getLogger(__name__)


class RedditEngagement:
    """Manages karma-building engagement on Reddit."""

    def __init__(self, client: RedditClient):
        self.client = client

    def post_comment(self, subreddit: str, submission_id: str, text: str) -> bool:
        """Post a comment on a specific submission (for karma building)."""
        logger.info(f"Posting karma-building comment in r/{subreddit}")
        return self.client.post_comment(submission_id, text)

    def get_trending_threads(self, subreddit: str, limit: int = 10) -> list[dict]:
        """Get hot threads from a subreddit (for finding karma-building opportunities)."""
        return self.client.get_hot_posts(subreddit, limit=limit)
