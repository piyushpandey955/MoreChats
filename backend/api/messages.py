"""
Messages API -- Craft, review, approve, and send messages.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.models.database import get_db
from backend.models.schemas import (
    Lead, RedditUser, Message,
    MessageOut, MessageApproveRequest,
    Platform, LeadStatus, MessageStatus, SendMethod,
)
from backend.ai.crafter import craft_reddit_responses

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.post("/craft/{lead_id}", response_model=list[MessageOut])
def craft_messages(lead_id: int, db: Session = Depends(get_db)):
    """Generate 3 message variants for a lead using AI."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if lead.platform == Platform.REDDIT:
        reddit_user = db.query(RedditUser).filter(RedditUser.lead_id == lead.id).first()
        post_data = {
            "title": reddit_user.original_post_title if reddit_user else "",
            "text": reddit_user.original_post_text if reddit_user else "",
            "subreddit": lead.source.replace("r/", "") if lead.source else "unknown",
        }
        analysis = {
            "primary_category": lead.primary_category.value if lead.primary_category else "unknown",
            "intent": reddit_user.post_intent if reddit_user else "unknown",
            "personality_traits": lead.personality_traits or [],
            "interest_tags": lead.interest_tags or [],
            "recommended_approach": "",
        }
        variants = craft_reddit_responses(post_data, analysis)

    else:
        raise HTTPException(status_code=400, detail="Unknown platform")

    # Save variants to DB
    saved_messages = []
    for i, variant in enumerate(variants[:3], 1):
        msg = Message(
            lead_id=lead.id,
            platform=lead.platform,
            variant_number=i,
            text=variant.get("text", ""),
            rationale=variant.get("rationale", ""),
            status=MessageStatus.DRAFT,
            send_method=SendMethod(variant.get("send_method", "dm")),
        )
        db.add(msg)
        db.flush()
        saved_messages.append(msg)

    db.commit()
    return saved_messages


@router.get("/lead/{lead_id}", response_model=list[MessageOut])
def get_messages_for_lead(lead_id: int, db: Session = Depends(get_db)):
    """Get all message variants for a lead."""
    messages = db.query(Message).filter(Message.lead_id == lead_id).all()
    return messages


@router.post("/approve")
def approve_and_send(request: MessageApproveRequest, db: Session = Depends(get_db)):
    """
    Approve a message variant and trigger sending.
    Optionally edit the text before sending.
    """
    msg = db.query(Message).filter(Message.id == request.message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    lead = db.query(Lead).filter(Lead.id == msg.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Update text if edited
    if request.edited_text:
        msg.text = request.edited_text
    if request.send_method:
        msg.send_method = request.send_method

    # Send the message
    success = False
    try:
        if lead.platform == Platform.REDDIT:
            from backend.reddit.client import RedditClient
            client = RedditClient()
            client.login()

            if msg.send_method == SendMethod.COMMENT:
                reddit_user = db.query(RedditUser).filter(RedditUser.lead_id == lead.id).first()
                if reddit_user and reddit_user.original_post_url:
                    # Extract submission ID from URL
                    parts = reddit_user.original_post_url.split("/")
                    sub_id = parts[6] if len(parts) > 6 else None
                    if sub_id:
                        success = client.post_comment(sub_id, msg.text)
            else:
                success = client.send_dm(lead.username, subject="hey", text=msg.text)

    except Exception as e:
        msg.status = MessageStatus.FAILED
        db.commit()
        raise HTTPException(status_code=500, detail=f"Send failed: {str(e)}")

    if success:
        msg.status = MessageStatus.SENT
        msg.sent_at = datetime.utcnow()
        lead.status = LeadStatus.MESSAGED
        lead.last_interaction_at = datetime.utcnow()
        db.commit()
        return {"ok": True, "message": "Message sent successfully"}
    else:
        msg.status = MessageStatus.FAILED
        db.commit()
        raise HTTPException(status_code=500, detail="Failed to send message")
