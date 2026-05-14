from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AppSetting, Game, Modality, SwimEvent

router = APIRouter(prefix="/home", tags=["home"])

PUBLIC_SETTING_KEYS = {"team_name"}


@router.get("")
def home_bundle(response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "public, max-age=30, stale-while-revalidate=60"
    modalities = db.query(Modality).order_by(Modality.order, Modality.id).all()
    games = (
        db.query(Game)
        .order_by(Game.match_date.is_(None), Game.match_date, Game.match_time)
        .all()
    )
    swim = (
        db.query(SwimEvent)
        .order_by(SwimEvent.match_date.is_(None), SwimEvent.match_date, SwimEvent.match_time)
        .all()
    )
    settings_rows = (
        db.query(AppSetting).filter(AppSetting.key.in_(PUBLIC_SETTING_KEYS)).all()
    )
    return {
        "modalities": [
            {
                "id": m.id,
                "name": m.name,
                "kind": m.kind,
                "icon": m.icon,
                "phases": m.phases,
                "order": m.order,
            }
            for m in modalities
        ],
        "games": [
            {
                "id": g.id,
                "modality_id": g.modality_id,
                "phase": g.phase,
                "opponent": g.opponent,
                "match_date": g.match_date,
                "match_time": g.match_time,
                "venue": g.venue,
                "home_score": g.home_score,
                "away_score": g.away_score,
                "status": g.status,
                "notes": g.notes,
                "notified_at": g.notified_at.isoformat() if g.notified_at else None,
            }
            for g in games
        ],
        "swim": [
            {
                "id": s.id,
                "modality_id": s.modality_id,
                "distance": s.distance,
                "athlete": s.athlete,
                "phase": s.phase,
                "heat": s.heat,
                "match_date": s.match_date,
                "match_time": s.match_time,
                "result_time": s.result_time,
                "qualified": s.qualified,
                "status": s.status,
                "notes": s.notes,
                "notified_at": s.notified_at.isoformat() if s.notified_at else None,
            }
            for s in swim
        ],
        "settings": {r.key: r.value for r in settings_rows},
    }
