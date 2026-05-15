from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PushSubscription
from ..push import get_public_key
from ..schemas import PushSubscribeIn, PushUnsubscribeIn

router = APIRouter(prefix="/push", tags=["push"])


@router.get("/key")
def public_key(db: Session = Depends(get_db)):
    return {"key": get_public_key(db)}


@router.post("/subscribe")
def subscribe(payload: PushSubscribeIn, db: Session = Depends(get_db)):
    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == payload.endpoint).first()
    if existing:
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        if payload.user_agent:
            existing.user_agent = payload.user_agent
    else:
        db.add(PushSubscription(
            endpoint=payload.endpoint,
            p256dh=payload.keys.p256dh,
            auth=payload.keys.auth,
            user_agent=payload.user_agent,
        ))
    db.commit()
    return {"ok": True}


@router.post("/unsubscribe")
def unsubscribe(payload: PushUnsubscribeIn, db: Session = Depends(get_db)):
    db.query(PushSubscription).filter(PushSubscription.endpoint == payload.endpoint).delete()
    db.commit()
    return {"ok": True}
