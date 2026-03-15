"""
Leads API -- CRUD endpoints for the unified leads pipeline.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.models.database import get_db
from backend.models.schemas import (
    Lead, RedditUser, Message,
    LeadOut, LeadDetailOut, MessageOut,
    PipelineStats, Platform, LeadStatus, Category,
)

router = APIRouter(prefix="/api/leads", tags=["leads"])


@router.get("/", response_model=list[LeadOut])
def list_leads(
    platform: Optional[Platform] = Platform.REDDIT,
    status: Optional[LeadStatus] = None,
    category: Optional[Category] = None,
    min_match_score: Optional[float] = None,
    sort_by: str = Query("discovered_at", pattern="^(discovered_at|match_score|approachability_score)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """List leads with filtering and sorting."""
    query = db.query(Lead)

    if platform:
        query = query.filter(Lead.platform == platform)
    if status:
        query = query.filter(Lead.status == status)
    if category:
        query = query.filter(Lead.primary_category == category)
    if min_match_score is not None:
        query = query.filter(Lead.match_score >= min_match_score)

    # Sorting
    sort_col = getattr(Lead, sort_by)
    if sort_order == "desc":
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())

    leads = query.offset(offset).limit(limit).all()
    return leads


@router.get("/stats", response_model=PipelineStats)
def get_pipeline_stats(db: Session = Depends(get_db)):
    """Get pipeline statistics for Reddit-focused pipeline."""
    total = db.query(func.count(Lead.id)).filter(Lead.platform == Platform.REDDIT).scalar()

    # By status
    status_counts = dict(
        db.query(Lead.status, func.count(Lead.id))
        .filter(Lead.platform == Platform.REDDIT)
        .group_by(Lead.status)
        .all()
    )

    # By platform
    platform_counts = dict(
        db.query(Lead.platform, func.count(Lead.id))
        .filter(Lead.platform == Platform.REDDIT)
        .group_by(Lead.platform)
        .all()
    )

    # By category
    category_counts = dict(
        db.query(Lead.primary_category, func.count(Lead.id))
        .filter(Lead.primary_category.isnot(None), Lead.platform == Platform.REDDIT)
        .group_by(Lead.primary_category)
        .all()
    )

    # Response rates
    messaged_total = db.query(func.count(Lead.id)).filter(
        Lead.platform == Platform.REDDIT,
        Lead.status.in_([LeadStatus.MESSAGED, LeadStatus.REPLIED, LeadStatus.ACTIVE])
    ).scalar()
    replied_total = db.query(func.count(Lead.id)).filter(
        Lead.platform == Platform.REDDIT,
        Lead.status.in_([LeadStatus.REPLIED, LeadStatus.ACTIVE])
    ).scalar()

    response_rate = (replied_total / messaged_total * 100) if messaged_total > 0 else 0

    # Reddit response rates
    rd_messaged = db.query(func.count(Lead.id)).filter(
        Lead.platform == Platform.REDDIT,
        Lead.status.in_([LeadStatus.MESSAGED, LeadStatus.REPLIED, LeadStatus.ACTIVE]),
    ).scalar()
    rd_replied = db.query(func.count(Lead.id)).filter(
        Lead.platform == Platform.REDDIT,
        Lead.status.in_([LeadStatus.REPLIED, LeadStatus.ACTIVE]),
    ).scalar()

    return PipelineStats(
        total_leads=total,
        by_status={s.value: c for s, c in status_counts.items()},
        by_platform={p.value: c for p, c in platform_counts.items()},
        by_category={c.value if c else "uncategorized": ct for c, ct in category_counts.items()},
        response_rate=response_rate,
        reddit_response_rate=(rd_replied / rd_messaged * 100) if rd_messaged > 0 else 0,
    )


@router.get("/{lead_id}", response_model=LeadDetailOut)
def get_lead_detail(lead_id: int, db: Session = Depends(get_db)):
    """Get full detail for a single lead."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    reddit_user = db.query(RedditUser).filter(RedditUser.lead_id == lead.id).first()

    messages = db.query(Message).filter(Message.lead_id == lead.id).all()

    return LeadDetailOut(
        lead=lead,
        reddit_user=reddit_user,
        messages=[MessageOut.model_validate(m) for m in messages],
    )


@router.patch("/{lead_id}/status")
def update_lead_status(
    lead_id: int,
    new_status: LeadStatus,
    db: Session = Depends(get_db),
):
    """Update a lead's pipeline status."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.status = new_status
    lead.updated_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "lead_id": lead_id, "new_status": new_status.value}


@router.delete("/{lead_id}")
def archive_lead(lead_id: int, db: Session = Depends(get_db)):
    """Archive (soft-delete) a lead."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.status = LeadStatus.ARCHIVED
    lead.updated_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "lead_id": lead_id}
