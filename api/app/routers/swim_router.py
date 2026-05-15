from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_admin
from ..database import get_db
from ..models import AppSetting, Modality, SwimEvent
from ..push import send_to_all as send_push_to_all
from ..schemas import SwimEventCreate, SwimEventOut, SwimEventUpdate

router = APIRouter(prefix="/swim", tags=["swim"])


def _get_setting(db: Session, key: str, default: str = "") -> str:
    s = db.query(AppSetting).filter(AppSetting.key == key).first()
    return s.value if s and s.value is not None else default


@router.get("", response_model=list[SwimEventOut])
def list_swim(modality_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(SwimEvent)
    if modality_id is not None:
        q = q.filter(SwimEvent.modality_id == modality_id)
    return q.order_by(SwimEvent.match_date.is_(None), SwimEvent.match_date, SwimEvent.match_time).all()


@router.post("", response_model=SwimEventOut, dependencies=[Depends(get_current_admin)])
def create_swim(data: SwimEventCreate, db: Session = Depends(get_db)):
    if not db.get(Modality, data.modality_id):
        raise HTTPException(404, "Modalidade não encontrada")
    e = SwimEvent(**data.model_dump())
    db.add(e)
    db.commit()
    db.refresh(e)
    return e


@router.patch("/{event_id}", response_model=SwimEventOut, dependencies=[Depends(get_current_admin)])
def update_swim(event_id: int, data: SwimEventUpdate, db: Session = Depends(get_db)):
    e = db.get(SwimEvent, event_id)
    if not e:
        raise HTTPException(404, "Prova não encontrada")
    was_finished = e.status == "finished"
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(e, k, v)
    if e.result_time and e.result_time.strip():
        e.status = "finished"
    db.commit()
    db.refresh(e)
    if e.status == "finished" and not was_finished:
        try:
            mod = db.get(Modality, e.modality_id)
            mod_label = (mod.icon + " " + mod.name) if mod and mod.icon else (mod.name if mod else "Natação")
            title = f"🏊 Resultado · {mod_label}".strip()
            body = f"{e.athlete}: {e.result_time} ({e.distance})"
            send_push_to_all(db, title, body, "/")
        except Exception as exc:
            print(f"[push] failed: {exc}")
    return e


@router.delete("/{event_id}", dependencies=[Depends(get_current_admin)])
def delete_swim(event_id: int, db: Session = Depends(get_db)):
    e = db.get(SwimEvent, event_id)
    if not e:
        raise HTTPException(404, "Prova não encontrada")
    db.delete(e)
    db.commit()
    return {"ok": True}


@router.post("/{event_id}/notify", dependencies=[Depends(get_current_admin)])
def notify_swim(event_id: int, db: Session = Depends(get_db)):
    e = db.get(SwimEvent, event_id)
    if not e:
        raise HTTPException(404, "Prova não encontrada")
    modality = db.get(Modality, e.modality_id)
    webhook_url = _get_setting(db, "webhook_url")
    if not webhook_url:
        raise HTTPException(400, "Webhook do n8n não configurado")
    template = _get_setting(
        db,
        "swim_message_template",
        "Natação {distancia} {fase} {bateria} - {atleta}: {tempo}",
    )
    classificacao = "🟢 Classificado para próxima fase" if e.qualified else ""
    message = template.format(
        modalidade=modality.name,
        distancia=e.distance,
        atleta=e.athlete,
        fase=e.phase,
        bateria=e.heat or "",
        data=e.match_date or "",
        horario=e.match_time or "",
        tempo=e.result_time or "—",
        classificacao=classificacao,
    )

    active = _get_setting(db, "active_group", "1") or "1"
    group_jid = _get_setting(db, f"group{active}_jid", "")
    group_label = _get_setting(db, f"group{active}_label", f"Grupo {active}")
    if not group_jid:
        raise HTTPException(400, f"JID do {group_label} não configurado")

    payload = {
        "message": message,
        "group_jid": group_jid,
        "group_label": group_label,
        "swim": {
            "id": e.id,
            "modality": modality.name,
            "distance": e.distance,
            "athlete": e.athlete,
            "phase": e.phase,
            "heat": e.heat,
            "date": e.match_date,
            "time": e.match_time,
            "result_time": e.result_time,
            "qualified": e.qualified,
            "status": e.status,
        },
    }
    try:
        with httpx.Client(timeout=15.0) as client:
            r = client.post(webhook_url, json=payload)
            r.raise_for_status()
    except httpx.HTTPError as ex:
        raise HTTPException(502, f"Erro ao enviar webhook: {ex}")

    e.notified_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "message": message, "notified_at": e.notified_at}
