from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_admin
from ..database import get_db
from ..models import AppSetting, Game, Modality
from ..push import send_to_all as send_push_to_all
from ..schemas import GameCreate, GameOut, GameUpdate

router = APIRouter(prefix="/games", tags=["games"])


def _get_setting(db: Session, key: str, default: str = "") -> str:
    s = db.query(AppSetting).filter(AppSetting.key == key).first()
    return s.value if s and s.value is not None else default


def _format_message(template: str, game: Game, modality: Modality, team_name: str) -> str:
    status_map = {
        "scheduled": ("⏰", "Agendado"),
        "finished": ("✅", "Encerrado"),
    }
    emoji, status_label = status_map.get(game.status, ("", game.status))
    return template.format(
        modalidade=modality.name,
        fase=game.phase,
        data=game.match_date or "",
        horario=game.match_time or "",
        adversario=game.opponent,
        placar_nos="" if game.home_score is None else game.home_score,
        placar_eles="" if game.away_score is None else game.away_score,
        status=status_label,
        status_emoji=emoji,
        local=game.venue or "",
        time_casa=team_name,
        notas=game.notes or "",
    )


@router.get("", response_model=list[GameOut])
def list_games(modality_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Game)
    if modality_id is not None:
        q = q.filter(Game.modality_id == modality_id)
    return q.order_by(Game.match_date.is_(None), Game.match_date, Game.match_time).all()


@router.post("", response_model=GameOut, dependencies=[Depends(get_current_admin)])
def create_game(data: GameCreate, db: Session = Depends(get_db)):
    if not db.get(Modality, data.modality_id):
        raise HTTPException(404, "Modalidade não encontrada")
    g = Game(**data.model_dump())
    db.add(g)
    db.commit()
    db.refresh(g)
    return g


@router.patch("/{game_id}", response_model=GameOut, dependencies=[Depends(get_current_admin)])
def update_game(game_id: int, data: GameUpdate, db: Session = Depends(get_db)):
    g = db.get(Game, game_id)
    if not g:
        raise HTTPException(404, "Jogo não encontrado")
    was_finished = g.status == "finished"
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(g, k, v)
    if g.home_score is not None and g.away_score is not None:
        g.status = "finished"
    db.commit()
    db.refresh(g)
    if g.status == "finished" and not was_finished:
        try:
            mod = db.get(Modality, g.modality_id)
            team_name = _get_setting(db, "team_name", "Nossa equipe")
            mod_label = (mod.icon + " " + mod.name) if mod and mod.icon else (mod.name if mod else "")
            title = f"✅ Resultado · {mod_label}".strip()
            body = f"{team_name} {g.home_score} × {g.away_score} {g.opponent}"
            send_push_to_all(db, title, body, "/")
        except Exception as exc:
            print(f"[push] failed: {exc}")
    return g


@router.delete("/{game_id}", dependencies=[Depends(get_current_admin)])
def delete_game(game_id: int, db: Session = Depends(get_db)):
    g = db.get(Game, game_id)
    if not g:
        raise HTTPException(404, "Jogo não encontrado")
    db.delete(g)
    db.commit()
    return {"ok": True}


@router.post("/{game_id}/notify", dependencies=[Depends(get_current_admin)])
def notify_game(game_id: int, db: Session = Depends(get_db)):
    g = db.get(Game, game_id)
    if not g:
        raise HTTPException(404, "Jogo não encontrado")
    modality = db.get(Modality, g.modality_id)
    webhook_url = _get_setting(db, "webhook_url")
    if not webhook_url:
        raise HTTPException(400, "Webhook do n8n não configurado")
    template = _get_setting(db, "message_template", "{modalidade} {fase} vs {adversario} {placar_nos}x{placar_eles}")
    team_name = _get_setting(db, "team_name", "São Mateus Moreira")
    message = _format_message(template, g, modality, team_name)

    active = _get_setting(db, "active_group", "1") or "1"
    group_jid = _get_setting(db, f"group{active}_jid", "")
    group_label = _get_setting(db, f"group{active}_label", f"Grupo {active}")
    if not group_jid:
        raise HTTPException(400, f"JID do {group_label} não configurado")

    payload = {
        "message": message,
        "group_jid": group_jid,
        "group_label": group_label,
        "game": {
            "id": g.id,
            "modality": modality.name,
            "phase": g.phase,
            "opponent": g.opponent,
            "date": g.match_date,
            "time": g.match_time,
            "home_score": g.home_score,
            "away_score": g.away_score,
            "status": g.status,
            "venue": g.venue,
        },
    }
    try:
        with httpx.Client(timeout=15.0) as client:
            r = client.post(webhook_url, json=payload)
            r.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Erro ao enviar webhook: {e}")

    g.notified_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "message": message, "notified_at": g.notified_at}
