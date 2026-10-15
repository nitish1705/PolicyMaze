from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str = ""
    db_path: str = "data/policy_maze.db"
    chroma_path: str = "data/chroma"
    upload_dir: str = "data/uploads"
    host: str = "0.0.0.0"
    port: int = 8000

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def db_abs_path(self) -> Path:
        return Path(__file__).parent.parent / self.db_path

    @property
    def chroma_abs_path(self) -> Path:
        return Path(__file__).parent.parent / self.chroma_path

    @property
    def upload_abs_path(self) -> Path:
        return Path(__file__).parent.parent / self.upload_dir


settings = Settings()
