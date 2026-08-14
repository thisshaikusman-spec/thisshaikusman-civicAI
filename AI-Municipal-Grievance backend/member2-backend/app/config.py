from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    app_name: str = "AI Municipal Grievance System"
    app_env: str = "development"
    database_url: str = "sqlite:///./complaints.db"
    frontend_url: str = "http://localhost:5173"
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24
    gemini_api_key: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def effective_database_url(self) -> str:
        if self.database_url in ("sqlite:///./complaints.db", "sqlite:///complaints.db"):
            if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
                return "sqlite:////tmp/complaints.db"
        return self.database_url


settings = Settings()

