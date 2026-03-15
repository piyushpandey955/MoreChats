"""
MoreChats -- Main FastAPI Application
Reddit outreach automation with AI-powered messaging.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.models.database import init_db
from backend.api import leads, messages, pipeline
from backend.api import settings as settings_api

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info("Starting MoreChats...")

    # Initialize database
    init_db()
    logger.info("Database initialized")

    # Initialize platform clients (only if credentials are provided)
    reddit_client = None

    if settings.reddit_client_id and settings.reddit_client_secret:
        try:
            from backend.reddit.client import RedditClient
            reddit_client = RedditClient()
            reddit_client.login()
            logger.info("Reddit client connected")
        except Exception as e:
            logger.warning(f"Reddit client failed to initialize: {e}")

    # Start scheduler
    try:
        from backend.scheduler.jobs import init_scheduler
        init_scheduler(reddit_client=reddit_client)
        logger.info("Scheduler started")
    except Exception as e:
        logger.warning(f"Scheduler failed to start: {e}")

    logger.info("MoreChats is running!")
    yield

    # Shutdown
    logger.info("Shutting down MoreChats...")
    try:
        from backend.scheduler.jobs import stop_scheduler
        stop_scheduler()
    except Exception:
        pass


# Create FastAPI app
app = FastAPI(
    title="MoreChats",
    description="Reddit outreach automation with AI-powered messaging",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware (allow frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(leads.router)
app.include_router(messages.router)
app.include_router(pipeline.router)
app.include_router(settings_api.router)


@app.get("/")
def root():
    return {
        "app": "MoreChats",
        "version": "1.0.0",
        "persona": settings.persona_name,
        "platforms": {
            "reddit": settings.reddit_handle,
        },
        "status": "running",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
