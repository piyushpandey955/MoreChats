"""
Database models (SQLAlchemy) and Pydantic schemas for MoreChats.
Unified leads model for Reddit pipeline.
"""

from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional

from pydantic import BaseModel, Field
from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, Boolean,
    ForeignKey, JSON, Enum,
)
from sqlalchemy.orm import relationship
from backend.models.database import Base


# ─── Enums ──────────────────────────────────────────────────────────────────

class Platform(str, PyEnum):
    REDDIT = "reddit"


class LeadStatus(str, PyEnum):
    DISCOVERED = "discovered"
    ANALYZED = "analyzed"
    ENGAGING = "engaging"
    MESSAGED = "messaged"
    REPLIED = "replied"
    ACTIVE = "active"
    ARCHIVED = "archived"


class Category(str, PyEnum):
    AMBITIOUS = "ambitious"
    ROMANTIC = "romantic"
    SWEET = "sweet"
    FRIEND = "friend"
    FLING = "fling"
    NURTURER = "nurturer"


class MessageStatus(str, PyEnum):
    DRAFT = "draft"
    APPROVED = "approved"
    SENT = "sent"
    FAILED = "failed"


class SendMethod(str, PyEnum):
    DM = "dm"
    COMMENT = "comment"


class InteractionType(str, PyEnum):
    UPVOTE = "upvote"
    COMMENT = "comment"
    DM_SENT = "dm_sent"


# ─── SQLAlchemy Models ──────────────────────────────────────────────────────

class Lead(Base):
    """Unified lead table for Reddit pipeline."""
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    platform = Column(Enum(Platform), nullable=False, index=True)
    platform_id = Column(String, nullable=True)  # Reddit username
    username = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    status = Column(Enum(LeadStatus), default=LeadStatus.DISCOVERED, index=True)
    primary_category = Column(Enum(Category), nullable=True)
    source = Column(String, nullable=True)  # e.g., "r/r4rindia"

    # Category scores (0-100 for each archetype)
    score_ambitious = Column(Float, default=0)
    score_romantic = Column(Float, default=0)
    score_sweet = Column(Float, default=0)
    score_friend = Column(Float, default=0)
    score_fling = Column(Float, default=0)
    score_nurturer = Column(Float, default=0)

    # Match & approachability
    match_score = Column(Float, default=0)
    approachability_score = Column(Float, default=0)

    # Demographics
    age_estimate = Column(Integer, nullable=True)
    location = Column(String, nullable=True)

    # AI analysis
    personality_traits = Column(JSON, nullable=True)  # list of traits
    interest_tags = Column(JSON, nullable=True)  # list of interests
    ai_analysis_summary = Column(Text, nullable=True)

    # Timestamps
    discovered_at = Column(DateTime, default=datetime.utcnow)
    last_interaction_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    reddit_user = relationship("RedditUser", back_populates="lead", uselist=False)
    messages = relationship("Message", back_populates="lead")
    interactions = relationship("Interaction", back_populates="lead")
    replies = relationship("Reply", back_populates="lead")


class RedditUser(Base):
    """Reddit-specific user data."""
    __tablename__ = "reddit_users"

    id = Column(Integer, primary_key=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), unique=True)
    karma = Column(Integer, default=0)
    account_age_days = Column(Integer, nullable=True)
    active_subreddits = Column(JSON, nullable=True)  # list of subreddit names
    post_history_summary = Column(Text, nullable=True)
    original_post_url = Column(String, nullable=True)
    original_post_title = Column(String, nullable=True)
    original_post_text = Column(Text, nullable=True)
    post_intent = Column(String, nullable=True)  # friendship, relationship, casual, chatting

    lead = relationship("Lead", back_populates="reddit_user")


class Message(Base):
    """Crafted messages for Reddit outreach."""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    platform = Column(Enum(Platform), nullable=False)
    variant_number = Column(Integer, default=1)  # 1, 2, or 3
    text = Column(Text, nullable=False)
    rationale = Column(Text, nullable=True)  # AI explanation of why this message works
    status = Column(Enum(MessageStatus), default=MessageStatus.DRAFT)
    send_method = Column(Enum(SendMethod), default=SendMethod.DM)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    lead = relationship("Lead", back_populates="messages")


class Interaction(Base):
    """Log of all engagement actions across platforms."""
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    platform = Column(Enum(Platform), nullable=False)
    action_type = Column(Enum(InteractionType), nullable=False)
    details = Column(Text, nullable=True)  # e.g., which post was liked
    timestamp = Column(DateTime, default=datetime.utcnow)

    lead = relationship("Lead", back_populates="interactions")


class Reply(Base):
    """Tracked replies from leads."""
    __tablename__ = "replies"

    id = Column(Integer, primary_key=True)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    platform = Column(Enum(Platform), nullable=False)
    reply_text = Column(Text, nullable=True)
    received_at = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False)

    lead = relationship("Lead", back_populates="replies")


class PipelineRun(Base):
    """Logs for each discovery/automation run."""
    __tablename__ = "pipeline_runs"

    id = Column(Integer, primary_key=True)
    platform = Column(Enum(Platform), nullable=False)
    run_type = Column(String, nullable=False)  # discovery, warmup, monitoring, reply_check
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
    leads_discovered = Column(Integer, default=0)
    actions_taken = Column(Integer, default=0)
    errors = Column(Text, nullable=True)
    status = Column(String, default="running")  # running, completed, failed


class AppSettings(Base):
    """Persisted app settings (non-sensitive ones)."""
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ─── Pydantic Schemas (API Request/Response) ────────────────────────────────

class LeadOut(BaseModel):
    id: int
    platform: Platform
    username: str
    display_name: Optional[str] = None
    status: LeadStatus
    primary_category: Optional[Category] = None
    source: Optional[str] = None
    score_ambitious: float = 0
    score_romantic: float = 0
    score_sweet: float = 0
    score_friend: float = 0
    score_fling: float = 0
    score_nurturer: float = 0
    match_score: float = 0
    approachability_score: float = 0
    age_estimate: Optional[int] = None
    location: Optional[str] = None
    personality_traits: Optional[list] = None
    interest_tags: Optional[list] = None
    ai_analysis_summary: Optional[str] = None
    discovered_at: datetime
    last_interaction_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class RedditUserOut(BaseModel):
    karma: int = 0
    account_age_days: Optional[int] = None
    active_subreddits: Optional[list] = None
    post_history_summary: Optional[str] = None
    original_post_url: Optional[str] = None
    original_post_title: Optional[str] = None
    original_post_text: Optional[str] = None
    post_intent: Optional[str] = None

    model_config = {"from_attributes": True}


class LeadDetailOut(BaseModel):
    lead: LeadOut
    reddit_user: Optional[RedditUserOut] = None
    messages: list = []

    model_config = {"from_attributes": True}


class MessageOut(BaseModel):
    id: int
    lead_id: int
    platform: Platform
    variant_number: int
    text: str
    rationale: Optional[str] = None
    status: MessageStatus
    send_method: SendMethod
    sent_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageApproveRequest(BaseModel):
    message_id: int
    edited_text: Optional[str] = None
    send_method: Optional[SendMethod] = None


class LeadFilterParams(BaseModel):
    platform: Optional[Platform] = None
    status: Optional[LeadStatus] = None
    category: Optional[Category] = None
    min_match_score: Optional[float] = None
    limit: int = Field(default=50, le=200)
    offset: int = 0


class PipelineStats(BaseModel):
    total_leads: int = 0
    by_status: dict = {}
    by_platform: dict = {}
    by_category: dict = {}
    response_rate: float = 0.0
    reddit_response_rate: float = 0.0
