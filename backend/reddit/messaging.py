"""
Reddit Messaging -- Send DMs/comments and monitor inbox for replies.
"""

import logging
from backend.reddit.client import RedditClient

logger = logging.getLogger(__name__)


class RedditMessaging:
    """Handles Reddit messaging operations."""

    def __init__(self, client: RedditClient):
        self.client = client

    def send_dm(self, username: str, text: str, subject: str = "hey") -> bool:
        """
        Send a private message to a Reddit user.
        Only called after manual approval on the dashboard.
        """
        logger.info(f"Sending approved Reddit DM to u/{username}")
        return self.client.send_dm(username, subject=subject, text=text)

    def send_comment_reply(self, submission_id: str, text: str) -> bool:
        """
        Post a comment on an r4r submission.
        Only called after manual approval on the dashboard.
        """
        logger.info(f"Posting approved comment on submission {submission_id}")
        return self.client.post_comment(submission_id, text)

    def check_for_replies(self, tracked_usernames: list[str]) -> list[dict]:
        """
        Check Reddit inbox for replies from tracked leads.

        Args:
            tracked_usernames: List of Reddit usernames we've previously messaged.

        Returns:
            List of {username, text, subject, timestamp} for new replies.
        """
        inbox = self.client.check_inbox(limit=30)
        replies = []

        for msg in inbox:
            author = msg.get("author", "")
            if author in tracked_usernames:
                replies.append({
                    "username": author,
                    "text": msg.get("text", ""),
                    "subject": msg.get("subject", ""),
                    "timestamp": msg.get("created_utc", ""),
                    "is_read": msg.get("is_read", False),
                })

        if replies:
            logger.info(f"Found {len(replies)} new Reddit replies from tracked leads")

        return replies
