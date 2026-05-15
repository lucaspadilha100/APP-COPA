from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class Modality(Base):
    __tablename__ = "modalities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    kind = Column(String, nullable=False, default="bracket")  # "bracket" or "swimming"
    icon = Column(String, nullable=True)
    phases = Column(String, nullable=False, default="Grupos,Oitavas,Quartas,Semifinal,Final")
    order = Column(Integer, default=0)

    games = relationship("Game", back_populates="modality", cascade="all, delete-orphan")
    swim_events = relationship("SwimEvent", back_populates="modality", cascade="all, delete-orphan")


class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    modality_id = Column(Integer, ForeignKey("modalities.id"), nullable=False)
    phase = Column(String, nullable=False)
    opponent = Column(String, nullable=False)
    match_date = Column(String, nullable=True)  # ISO date string
    match_time = Column(String, nullable=True)  # HH:MM
    venue = Column(String, nullable=True)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    status = Column(String, default="scheduled")  # scheduled | finished
    notes = Column(Text, nullable=True)
    notified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    modality = relationship("Modality", back_populates="games")


class SwimEvent(Base):
    __tablename__ = "swim_events"

    id = Column(Integer, primary_key=True, index=True)
    modality_id = Column(Integer, ForeignKey("modalities.id"), nullable=False)
    distance = Column(String, nullable=False)  # "50m", "100m", "400m", "Revezamento 4x50"
    athlete = Column(String, nullable=False)
    phase = Column(String, nullable=False)  # "Eliminatória", "Semifinal", "Final"
    heat = Column(String, nullable=True)  # "Bateria 1"
    match_date = Column(String, nullable=True)
    match_time = Column(String, nullable=True)
    result_time = Column(String, nullable=True)  # "00:55.21"
    qualified = Column(Boolean, default=False)
    status = Column(String, default="scheduled")
    notes = Column(Text, nullable=True)
    notified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    modality = relationship("Modality", back_populates="swim_events")


class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String, primary_key=True)
    value = Column(Text, nullable=True)


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    endpoint = Column(Text, unique=True, nullable=False)
    p256dh = Column(String, nullable=False)
    auth = Column(String, nullable=False)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
