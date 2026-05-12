import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_admin
from ..database import get_db
from ..models import AppSetting
from ..schemas import SettingItem, WebhookTestPayload

router = APIRouter(prefix="/settings", tags=["settings"])

PUBLIC_KEYS = {"team_name"}
ADMIN_KEYS = {"webhook_url", "message_template", "swim_message_template"}


@router.get("/public")
def get_public_settings(db: Session = Depends(get_db)):
    rows = db.query(AppSetting).filter(AppSetting.key.in_(PUBLIC_KEYS)).all()
    return {r.key: r.value for r in rows}


@router.get("", dependencies=[Depends(get_current_admin)])
def get_all_settings(db: Session = Depends(get_db)):
    rows = db.query(AppSetting).all()
    return {r.key: r.value for r in rows}


@router.put("", dependencies=[Depends(get_current_admin)])
def upsert_setting(item: SettingItem, db: Session = Depends(get_db)):
    row = db.query(AppSetting).filter(AppSetting.key == item.key).first()
    if row:
        row.value = item.value
    else:
        db.add(AppSetting(key=item.key, value=item.value))
    db.commit()
    return {"ok": True}


@router.post("/webhook/test", dependencies=[Depends(get_current_admin)])
def test_webhook(payload: WebhookTestPayload):
    try:
        with httpx.Client(timeout=15.0) as client:
            r = client.post(payload.url, json={"message": payload.message, "test": True})
            r.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Falha: {e}")
    return {"ok": True}
