from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")
    deepseek_api_key: SecretStr = SecretStr("")
    llm_model: str = "deepseek/deepseek-flash"
    llm_api_base: str = "https://api.deepseek.com/beta"
    llm_output_mode: str = "strict"
    llm_thinking_stages: str = "skeleton,cross"
    label_language: str = "auto"
    grobid_url: str = ""
    langfuse_public_key: str = ""
    langfuse_secret_key: SecretStr = SecretStr("")
    langfuse_host: str = "https://cloud.langfuse.com"
    anchor_threshold: float = 85
    embedding_model: str = ""
    data_dir: Path = ROOT / "data"
    max_upload_bytes: int = 30 * 1024 * 1024
    max_input_chars: int = 180000
    max_children: int = 8
    llm_concurrency: int = 3
    llm_max_tokens: int = 16000


settings = Settings()
