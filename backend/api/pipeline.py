"""
Pipeline API -- Trigger discovery runs and get pipeline state.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.models.database import get_db
from backend.models.schemas import Lead, PipelineRun, Platform, LeadStatus

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


@router.get("/runs")
def get_pipeline_runs(
    platform: str = Platform.REDDIT.value,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """Get recent pipeline run logs."""
    query = db.query(PipelineRun)
    if platform:
        query = query.filter(PipelineRun.platform == platform)
    runs = query.order_by(PipelineRun.started_at.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "platform": r.platform.value,
            "run_type": r.run_type,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "finished_at": r.finished_at.isoformat() if r.finished_at else None,
            "leads_discovered": r.leads_discovered,
            "actions_taken": r.actions_taken,
            "status": r.status,
            "errors": r.errors,
        }
        for r in runs
    ]


@router.post("/trigger/reddit-scan")
def trigger_reddit_scan():
    """Manually trigger a Reddit subreddit scan."""
    from backend.scheduler.jobs import reddit_monitor_subreddits
    try:
        reddit_monitor_subreddits()
        return {"ok": True, "message": "Reddit scan triggered"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("/trigger/reply-check")
def trigger_reply_check():
    """Manually trigger a reply check."""
    from backend.scheduler.jobs import check_all_replies
    try:
        check_all_replies()
        return {"ok": True, "message": "Reply check triggered"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.get("/kanban")
def get_kanban_board(db: Session = Depends(get_db)):
    """Get Reddit leads organized by pipeline status (for kanban view)."""
    columns = {}
    for status in LeadStatus:
        leads = (
            db.query(Lead)
            .filter(Lead.status == status, Lead.platform == Platform.REDDIT)
            .order_by(Lead.match_score.desc())
            .limit(50)
            .all()
        )
        columns[status.value] = [
            {
                "id": l.id,
                "platform": l.platform.value,
                "username": l.username,
                "display_name": l.display_name,
                "primary_category": l.primary_category.value if l.primary_category else None,
                "match_score": l.match_score,
                "age_estimate": l.age_estimate,
                "discovered_at": l.discovered_at.isoformat() if l.discovered_at else None,
            }
            for l in leads
        ]

    return columns
