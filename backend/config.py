"""
MoreChats Configuration
Central config loaded from environment variables / .env file.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- App ---
    app_name: str = "MoreChats"
    debug: bool = False

    # --- Database ---
    database_url: str = "sqlite:///./morechats.db"

    # --- Reddit ---
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    reddit_username: str = ""
    reddit_password: str = ""
    reddit_user_agent: str = "MoreChats/1.0 by I_exist"
    reddit_max_dms_per_day: int = 30

    # Subreddits to monitor
    reddit_monitor_subreddits: str = "r4r,r4rindia,SFWr4rIndia,MakeNewFriendsHere,MeetNewPeopleHere,MeetPeople,Needafriend"

    # --- AI ---
    gemini_api_key: str = ""
    nvidia_api_key: str = ""
    gemini_model: str = "gemma-3n-e4b-it"

    # --- Persona ---
    persona_name: str = "Divit"
    reddit_handle: str = "I_exist"

    # --- Target Filters ---
    target_min_age: int = 18
    target_max_age: int = 26
    target_location: str = "India"

    @property
    def reddit_subreddit_list(self) -> list[str]:
        return [s.strip() for s in self.reddit_monitor_subreddits.split(",")]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
