from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_admin
from ..database import get_db
from ..models import Modality
from ..schemas import ModalityCreate, ModalityOut, ModalityUpdate

router = APIRouter(prefix="/modalities", tags=["modalities"])


@router.get("", response_model=list[ModalityOut])
def list_modalities(db: Session = Depends(get_db)):
    return db.query(Modality).order_by(Modality.order, Modality.id).all()


@router.post("", response_model=ModalityOut, dependencies=[Depends(get_current_admin)])
def create_modality(data: ModalityCreate, db: Session = Depends(get_db)):
    m = Modality(**data.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.patch("/{modality_id}", response_model=ModalityOut, dependencies=[Depends(get_current_admin)])
def update_modality(modality_id: int, data: ModalityUpdate, db: Session = Depends(get_db)):
    m = db.get(Modality, modality_id)
    if not m:
        raise HTTPException(404, "Modalidade não encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    db.commit()
    db.refresh(m)
    return m


@router.delete("/{modality_id}", dependencies=[Depends(get_current_admin)])
def delete_modality(modality_id: int, db: Session = Depends(get_db)):
    m = db.get(Modality, modality_id)
    if not m:
        raise HTTPException(404, "Modalidade não encontrada")
    db.delete(m)
    db.commit()
    return {"ok": True}
