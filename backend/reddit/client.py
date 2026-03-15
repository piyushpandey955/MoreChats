"""
Reddit Client -- Wraps PRAW for OAuth session management,
subreddit access, user profile extraction, and messaging.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

import praw
from praw.models import Redditor, Submission, Comment
from backend.config import settings

logger = logging.getLogger(__name__)


class RedditClient:
    """Wrapper around PRAW with session management."""

    def __init__(self):
        self.reddit: Optional[praw.Reddit] = None
        self._logged_in = False

    def login(self) -> bool:
        """Initialize PRAW with OAuth credentials."""
        try:
            self.reddit = praw.Reddit(
                client_id=settings.reddit_client_id,
                client_secret=settings.reddit_client_secret,
                username=settings.reddit_username,
                password=settings.reddit_password,
                user_agent=settings.reddit_user_agent,
            )
            # Verify login
            me = self.reddit.user.me()
            logger.info(f"Logged in to Reddit as u/{me.name}")
            self._logged_in = True
            return True
        except Exception as e:
            logger.error(f"Reddit login failed: {e}")
            self._logged_in = False
            return False

    def _ensure_logged_in(self):
        if not self._logged_in or not self.reddit:
            self.login()

    # ─── Subreddit Operations ────────────────────────────────────────────

    def get_new_posts(self, subreddit_name: str, limit: int = 25) -> list[dict]:
        """Get new posts from a subreddit."""
        self._ensure_logged_in()
        try:
            subreddit = self.reddit.subreddit(subreddit_name)
            posts = []
            for submission in subreddit.new(limit=limit):
                posts.append(self._submission_to_dict(submission))
            return posts
        except Exception as e:
            logger.error(f"Failed to get posts from r/{subreddit_name}: {e}")
            return []

    def get_hot_posts(self, subreddit_name: str, limit: int = 15) -> list[dict]:
        """Get hot/trending posts from a subreddit."""
        self._ensure_logged_in()
        try:
            subreddit = self.reddit.subreddit(subreddit_name)
            posts = []
            for submission in subreddit.hot(limit=limit):
                posts.append(self._submission_to_dict(submission))
            return posts
        except Exception as e:
            logger.error(f"Failed to get hot posts from r/{subreddit_name}: {e}")
            return []

    def _submission_to_dict(self, submission: Submission) -> dict:
        """Convert a PRAW Submission to a dict."""
        return {
            "id": submission.id,
            "title": submission.title,
            "text": submission.selftext,
            "author": str(submission.author) if submission.author else "[deleted]",
            "subreddit": str(submission.subreddit),
            "url": f"https://reddit.com{submission.permalink}",
            "score": submission.score,
            "num_comments": submission.num_comments,
            "created_utc": datetime.fromtimestamp(submission.created_utc, tz=timezone.utc).isoformat(),
            "is_self": submission.is_self,
            "flair": submission.link_flair_text,
        }

    # ─── User Profile ────────────────────────────────────────────────────

    def get_user_info(self, username: str) -> Optional[dict]:
        """Get profile data for a Reddit user."""
        self._ensure_logged_in()
        try:
            redditor: Redditor = self.reddit.redditor(username)
            # Force load the data
            _ = redditor.id

            created = datetime.fromtimestamp(redditor.created_utc, tz=timezone.utc)
            age_days = (datetime.now(timezone.utc) - created).days

            return {
                "username": redditor.name,
                "karma": redditor.link_karma + redditor.comment_karma,
                "link_karma": redditor.link_karma,
                "comment_karma": redditor.comment_karma,
                "account_age_days": age_days,
                "created_utc": created.isoformat(),
                "is_suspended": False,
            }
        except Exception as e:
            logger.error(f"Failed to get user info for u/{username}: {e}")
            return None

    def get_user_comments(self, username: str, limit: int = 50) -> list[dict]:
        """Get recent comments from a user (for personality analysis)."""
        self._ensure_logged_in()
        try:
            redditor = self.reddit.redditor(username)
            comments = []
            for comment in redditor.comments.new(limit=limit):
                comments.append({
                    "text": comment.body[:500],  # Truncate long comments
                    "subreddit": str(comment.subreddit),
                    "score": comment.score,
                    "created_utc": datetime.fromtimestamp(
                        comment.created_utc, tz=timezone.utc
                    ).isoformat(),
                })
            return comments
        except Exception as e:
            logger.error(f"Failed to get comments for u/{username}: {e}")
            return []

    def get_user_active_subreddits(self, username: str, limit: int = 50) -> list[str]:
        """Get list of subreddits a user is active in."""
        comments = self.get_user_comments(username, limit=limit)
        subreddits = {}
        for c in comments:
            sub = c["subreddit"]
            subreddits[sub] = subreddits.get(sub, 0) + 1
        # Sort by activity count
        return sorted(subreddits.keys(), key=lambda s: subreddits[s], reverse=True)

    def get_own_profile(self) -> Optional[dict]:
        """Get profile data for the logged-in account."""
        self._ensure_logged_in()
        try:
            me = self.reddit.user.me()
            created = datetime.fromtimestamp(me.created_utc, tz=timezone.utc)
            age_days = (datetime.now(timezone.utc) - created).days
            return {
                "username": me.name,
                "karma": me.link_karma + me.comment_karma,
                "link_karma": me.link_karma,
                "comment_karma": me.comment_karma,
                "account_age_days": age_days,
            }
        except Exception as e:
            logger.error(f"Failed to get own profile: {e}")
            return None

    # ─── Messaging ───────────────────────────────────────────────────────

    def send_dm(self, username: str, subject: str, text: str) -> bool:
        """Send a private message to a Reddit user."""
        self._ensure_logged_in()
        try:
            redditor = self.reddit.redditor(username)
            redditor.message(subject=subject, message=text)
            logger.info(f"Reddit DM sent to u/{username}")
            return True
        except Exception as e:
            logger.error(f"Failed to send DM to u/{username}: {e}")
            return False

    def post_comment(self, submission_id: str, text: str) -> bool:
        """Post a comment on a submission."""
        self._ensure_logged_in()
        try:
            submission = self.reddit.submission(id=submission_id)
            submission.reply(text)
            logger.info(f"Comment posted on submission {submission_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to post comment on {submission_id}: {e}")
            return False

    def check_inbox(self, limit: int = 25) -> list[dict]:
        """Check inbox for new messages."""
        self._ensure_logged_in()
        try:
            messages = []
            for msg in self.reddit.inbox.messages(limit=limit):
                messages.append({
                    "id": msg.id,
                    "author": str(msg.author) if msg.author else "[deleted]",
                    "subject": msg.subject,
                    "text": msg.body,
                    "created_utc": datetime.fromtimestamp(
                        msg.created_utc, tz=timezone.utc
                    ).isoformat(),
                    "is_read": not msg.new,
                })
            return messages
        except Exception as e:
            logger.error(f"Failed to check Reddit inbox: {e}")
            return []
