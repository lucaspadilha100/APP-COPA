from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ModalityBase(BaseModel):
    name: str
    kind: str = "bracket"
    icon: Optional[str] = None
    phases: str = "Grupos,Oitavas,Quartas,Semifinal,Final"
    order: int = 0


class ModalityCreate(ModalityBase):
    pass


class ModalityUpdate(BaseModel):
    name: Optional[str] = None
    kind: Optional[str] = None
    icon: Optional[str] = None
    phases: Optional[str] = None
    order: Optional[int] = None


class ModalityOut(ModalityBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class GameBase(BaseModel):
    modality_id: int
    phase: str
    opponent: str
    match_date: Optional[str] = None
    match_time: Optional[str] = None
    venue: Optional[str] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: str = "scheduled"
    notes: Optional[str] = None


class GameCreate(GameBase):
    pass


class GameUpdate(BaseModel):
    phase: Optional[str] = None
    opponent: Optional[str] = None
    match_date: Optional[str] = None
    match_time: Optional[str] = None
    venue: Optional[str] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class GameOut(GameBase):
    id: int
    notified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SwimEventBase(BaseModel):
    modality_id: int
    distance: str
    athlete: str
    phase: str
    heat: Optional[str] = None
    match_date: Optional[str] = None
    match_time: Optional[str] = None
    result_time: Optional[str] = None
    qualified: bool = False
    status: str = "scheduled"
    notes: Optional[str] = None


class SwimEventCreate(SwimEventBase):
    pass


class SwimEventUpdate(BaseModel):
    distance: Optional[str] = None
    athlete: Optional[str] = None
    phase: Optional[str] = None
    heat: Optional[str] = None
    match_date: Optional[str] = None
    match_time: Optional[str] = None
    result_time: Optional[str] = None
    qualified: Optional[bool] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class SwimEventOut(SwimEventBase):
    id: int
    notified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class SettingItem(BaseModel):
    key: str
    value: Optional[str] = None


class WebhookTestPayload(BaseModel):
    url: str
    message: str
