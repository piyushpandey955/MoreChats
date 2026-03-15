"""
Discord Notifications -- Send webhook notifications for replies and events.
"""

import logging
import httpx
from backend.config import settings

logger = logging.getLogger(__name__)


def send_reply_notification(lead, reply_text: str):
    """Send a Discord webhook notification when a lead replies."""
    if not settings.discord_webhook_url:
        logger.debug("Discord webhook URL not configured -- skipping notification")
        return

    platform_emoji = "\U0001f916"
    platform_name = lead.platform.value.title()
    category = lead.primary_category.value.title() if lead.primary_category else "Unknown"

    embed = {
        "embeds": [
            {
                "title": f"{platform_emoji} New Reply from {lead.username}!",
                "description": reply_text[:500],
                "color": 0xFF4500,
                "fields": [
                    {"name": "Platform", "value": platform_name, "inline": True},
                    {"name": "Category", "value": category, "inline": True},
                    {"name": "Match Score", "value": f"{lead.match_score:.0f}/100", "inline": True},
                ],
                "footer": {"text": "CircleBuilder"},
            }
        ]
    }

    try:
        response = httpx.post(settings.discord_webhook_url, json=embed, timeout=10)
        if response.status_code == 204:
            logger.info(f"Discord notification sent for reply from {lead.username}")
        else:
            logger.warning(f"Discord webhook returned {response.status_code}")
    except Exception as e:
        logger.error(f"Failed to send Discord notification: {e}")


def send_discovery_summary(platform: str, count: int, top_leads: list):
    """Send a summary notification after a discovery run."""
    if not settings.discord_webhook_url:
        return

    leads_text = "\n".join(
        f"- **{l.get('username', '?')}** ({l.get('primary_category', '?')}) -- Match: {l.get('match_score', 0):.0f}/100"
        for l in top_leads[:5]
    )

    embed = {
        "embeds": [
            {
                "title": f"Discovery Run Complete -- {platform.title()}",
                "description": f"Found **{count}** new leads.\n\n**Top matches:**\n{leads_text}",
                "color": 0x00D166,
                "footer": {"text": "CircleBuilder"},
            }
        ]
    }

    try:
        httpx.post(settings.discord_webhook_url, json=embed, timeout=10)
    except Exception as e:
        logger.error(f"Failed to send discovery summary: {e}")
