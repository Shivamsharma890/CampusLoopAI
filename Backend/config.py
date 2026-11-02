from pathlib import Path

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url

BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):

    database_url: str = Field(validation_alias="DATABASE_URL")
    groq_api_key: str = Field(validation_alias="GROQ_API_KEY")
    groq_model: str = Field(validation_alias="GROQ_MODEL")

    jwt_secret_key: str = Field(validation_alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(validation_alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(
        validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES"
    )

    frontend_origins: list[str] = Field(validation_alias="FRONTEND_ORIGINS")

    supabase_url: str = Field(validation_alias="SUPABASE_URL")
    supabase_secret_key: str = Field(validation_alias="SUPABASE_SECRET_KEY")

    embedding_model_name: str = Field(validation_alias="EMBEDDING_MODEL_NAME")
    embedding_dimension: int = Field(validation_alias="EMBEDDING_DIMENSION")
    policy_pdf_path: Path = Field(validation_alias="POLICY_PDF_PATH")

    app_name: str = "CampusLoop AI"
    debug: bool = False

    rag_chunk_size: int = 1000
    rag_chunk_overlap: int = 200
    rag_top_k: int = 4
    rag_max_distance: float = 0.65

    supabase_bucket: str = "campusloop-items"

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        try:
            url = make_url(value)
        except Exception as exc:
            raise ValueError("Invalid DATABASE_URL.") from exc

        if not url.drivername.startswith("postgresql"):
            raise ValueError("Only PostgreSQL database URLs are supported.")

        return value

    @model_validator(mode="after")
    def validate_settings(self):
        if self.access_token_expire_minutes <= 0:
            raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES must be greater than 0.")

        if self.embedding_dimension <= 0:
            raise ValueError("EMBEDDING_DIMENSION must be greater than 0.")

        if self.rag_chunk_size <= 0:
            raise ValueError("RAG_CHUNK_SIZE must be greater than 0.")

        if not 0 <= self.rag_chunk_overlap < self.rag_chunk_size:
            raise ValueError("RAG_CHUNK_OVERLAP must be smaller than RAG_CHUNK_SIZE.")

        if self.rag_top_k <= 0:
            raise ValueError("RAG_TOP_K must be greater than 0.")

        if not 0 <= self.rag_max_distance <= 2:
            raise ValueError("RAG_MAX_DISTANCE must be between 0 and 2.")

        if not self.policy_pdf_path.is_absolute():
            self.policy_pdf_path = (BASE_DIR / self.policy_pdf_path).resolve()

        return self

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )


settings = Settings()
