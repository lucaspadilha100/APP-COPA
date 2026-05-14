from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .auth import ensure_default_admin
from .config import settings
from .database import Base, SessionLocal, engine
from .routers import auth_router, games_router, home_router, modalities_router, settings_router, swim_router
from .seed import seed_initial_data

app = FastAPI(title="Copa São Mateus Moreira API", version="1.0.0")

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()] or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            ensure_default_admin(db)
            seed_initial_data(db)
        finally:
            db.close()
    except Exception as exc:
        import traceback
        print(f"[startup] DB init error: {exc}")
        traceback.print_exc()


@app.get("/api/health")
def health():
    return {"status": "ok"}


app.include_router(auth_router.router, prefix="/api")
app.include_router(modalities_router.router, prefix="/api")
app.include_router(games_router.router, prefix="/api")
app.include_router(swim_router.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")
app.include_router(home_router.router, prefix="/api")
