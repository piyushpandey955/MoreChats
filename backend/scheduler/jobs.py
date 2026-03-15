"""
Scheduler Jobs -- APScheduler job definitions for automated tasks.
"""

import logging
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from backend.models.database import SessionLocal
from backend.models.schemas import (
    Lead, RedditUser, Reply, PipelineRun,
    Platform, LeadStatus,
)

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

# These will be initialized when the app starts
_reddit_client = None


def init_scheduler(reddit_client=None):
    """Initialize the scheduler with platform clients."""
    global _reddit_client
    _reddit_client = reddit_client

    # Reddit: Subreddit monitoring (every 30 minutes)
    scheduler.add_job(
        reddit_monitor_subreddits,
        IntervalTrigger(minutes=30),
        id="reddit_monitor",
        replace_existing=True,
    )

    # Reply check (every hour)
    scheduler.add_job(
        check_all_replies,
        IntervalTrigger(minutes=60),
        id="reply_check",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Scheduler initialized with all jobs")


def reddit_monitor_subreddits():
    """Monitor Reddit r4r subreddits for new matching posts."""
    if not _reddit_client:
        return

    db = SessionLocal()
    run = PipelineRun(platform=Platform.REDDIT, run_type="monitoring")
    db.add(run)
    db.commit()

    try:
        from backend.reddit.monitor import RedditMonitor
        monitor = RedditMonitor(_reddit_client)

        results = monitor.scan_subreddits()
        total_discovered = 0

        for result in results:
            _save_reddit_lead(db, result)
            total_discovered += 1

        run.leads_discovered = total_discovered
        run.status = "completed"
        run.finished_at = datetime.utcnow()
        db.commit()
        logger.info(f"Reddit monitoring complete: {total_discovered} new leads")

    except Exception as e:
        run.status = "failed"
        run.errors = str(e)
        run.finished_at = datetime.utcnow()
        db.commit()
        logger.error(f"Reddit monitoring failed: {e}")
    finally:
        db.close()


def check_all_replies():
    """Check Reddit inbox for replies from tracked leads."""
    db = SessionLocal()

    try:
        # Get all leads we've messaged
        messaged_leads = db.query(Lead).filter(
            Lead.status == LeadStatus.MESSAGED,
        ).all()

        rd_usernames = [l.username for l in messaged_leads if l.platform == Platform.REDDIT]

        # Check Reddit
        if _reddit_client and rd_usernames:
            from backend.reddit.messaging import RedditMessaging
            rd_msg = RedditMessaging(_reddit_client)
            rd_replies = rd_msg.check_for_replies(rd_usernames)
            for r in rd_replies:
                _save_reply(db, r["username"], Platform.REDDIT, r["text"], messaged_leads)

        db.commit()

    except Exception as e:
        logger.error(f"Reply check failed: {e}")
    finally:
        db.close()


def _save_reddit_lead(db, result: dict):
    """Save a discovered Reddit lead to the database."""
    post = result["post"]
    analysis = result["analysis"]
    user_data = result.get("user_data")

    # Check for duplicates
    existing = db.query(Lead).filter(
        Lead.platform == Platform.REDDIT,
        Lead.username == post["author"],
    ).first()
    if existing:
        return

    scores = analysis.get("category_scores", {})
    lead = Lead(
        platform=Platform.REDDIT,
        platform_id=post["author"],
        username=post["author"],
        display_name=None,
        status=LeadStatus.ANALYZED,
        primary_category=analysis.get("primary_category"),
        source=result.get("source"),
        score_ambitious=scores.get("ambitious", 0),
        score_romantic=scores.get("romantic", 0),
        score_sweet=scores.get("sweet", 0),
        score_friend=scores.get("friend", 0),
        score_fling=scores.get("fling", 0),
        score_nurturer=scores.get("nurturer", 0),
        match_score=analysis.get("match_score", 0),
        approachability_score=analysis.get("approachability_score", 0),
        age_estimate=analysis.get("parsed_age"),
        location=analysis.get("location_estimate"),
        personality_traits=analysis.get("personality_traits"),
        interest_tags=analysis.get("interest_tags"),
        ai_analysis_summary=analysis.get("analysis_summary"),
    )
    db.add(lead)
    db.flush()

    reddit_user = RedditUser(
        lead_id=lead.id,
        karma=user_data.get("karma", 0) if user_data else 0,
        account_age_days=user_data.get("account_age_days") if user_data else None,
        active_subreddits=user_data.get("active_subreddits") if user_data else None,
        original_post_url=post.get("url"),
        original_post_title=post.get("title"),
        original_post_text=post.get("text"),
        post_intent=analysis.get("intent"),
    )
    db.add(reddit_user)
    db.commit()


def _save_reply(db, username: str, platform: Platform, text: str, leads: list):
    """Save a reply and update lead status."""
    lead = next((l for l in leads if l.username == username and l.platform == platform), None)
    if not lead:
        return

    # Check if we already recorded this reply
    existing = db.query(Reply).filter(
        Reply.lead_id == lead.id,
        Reply.reply_text == text,
    ).first()
    if existing:
        return

    reply = Reply(
        lead_id=lead.id,
        platform=platform,
        reply_text=text,
    )
    db.add(reply)
    lead.status = LeadStatus.REPLIED

    # Send Discord notification
    try:
        from backend.notifications.discord import send_reply_notification
        send_reply_notification(lead, text)
    except Exception as e:
        logger.error(f"Failed to send Discord notification: {e}")


def stop_scheduler():
    """Stop the scheduler gracefully."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")
