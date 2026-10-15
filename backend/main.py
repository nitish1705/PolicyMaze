import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.adapters.database import close_db, get_db, init_db
from backend.application.seeder import seed_all
from backend.contracts.errors import ApiError, ErrorCode
from backend.routes.catalog import router as catalog_router
from backend.routes.documents import router as documents_router
from backend.routes.eligibility import router as eligibility_router
from backend.routes.schemes import router as schemes_router
from backend.routes.webhooks import router as webhooks_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    db = await get_db()
    cursor = await db.execute("SELECT COUNT(*) as cnt FROM scheme_catalog")
    row = await cursor.fetchone()
    if row["cnt"] == 0:
        logger.info("Empty catalog — running initial seed...")
        counts = await seed_all(db)
        logger.info("Seeded: %s", counts)
    yield
    await close_db()


app = FastAPI(
    title="Policy Maze — Explainable Eligibility Engine",
    description="AI-powered policy interpretation with traceable eligibility decisions",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router)
app.include_router(eligibility_router)
app.include_router(schemes_router)
app.include_router(catalog_router)
app.include_router(webhooks_router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content=ApiError(
            code=ErrorCode.INTERNAL_ERROR,
            category="system",
            message=str(exc),
            retryable=True,
        ).model_dump(),
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "policy-maze"}
