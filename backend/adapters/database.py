import aiosqlite
from pathlib import Path

from backend.config import settings

_SCHEMA_PATH = Path(__file__).parent.parent / "db" / "schema.sql"
_db: aiosqlite.Connection | None = None


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        raise RuntimeError("Database not initialized — call init_db() first")
    return _db


async def init_db() -> None:
    global _db
    settings.db_abs_path.parent.mkdir(parents=True, exist_ok=True)
    _db = await aiosqlite.connect(str(settings.db_abs_path))
    _db.row_factory = aiosqlite.Row
    schema = _SCHEMA_PATH.read_text()
    await _db.executescript(schema)
    await _db.commit()


async def close_db() -> None:
    global _db
    if _db is not None:
        await _db.close()
        _db = None
