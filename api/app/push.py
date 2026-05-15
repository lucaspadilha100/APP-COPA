"""
Web Push (VAPID) helpers.

VAPID keypair is generated on first startup and persisted in AppSetting table,
so the deployment is zero-config (no env vars needed).
"""
from __future__ import annotations

import base64
import json
import logging
from typing import Optional

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from pywebpush import WebPushException, webpush
from sqlalchemy.orm import Session

from .models import AppSetting, PushSubscription

logger = logging.getLogger(__name__)

VAPID_SUBJECT_KEY = "vapid_subject"
VAPID_PUBLIC_KEY_KEY = "vapid_public_key"  # base64url, uncompressed point (65 bytes)
VAPID_PRIVATE_PEM_KEY = "vapid_private_pem"  # PEM PKCS8


def _b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _get_setting(db: Session, key: str) -> Optional[str]:
    s = db.query(AppSetting).filter(AppSetting.key == key).first()
    return s.value if s else None


def _set_setting(db: Session, key: str, value: str) -> None:
    s = db.query(AppSetting).filter(AppSetting.key == key).first()
    if s:
        s.value = value
    else:
        db.add(AppSetting(key=key, value=value))


def ensure_vapid_keys(db: Session, subject: str = "mailto:admin@copa-segue-me.app") -> tuple[str, str]:
    """Returns (public_key_b64url, private_pem). Generates and persists if missing."""
    pub = _get_setting(db, VAPID_PUBLIC_KEY_KEY)
    priv = _get_setting(db, VAPID_PRIVATE_PEM_KEY)
    if pub and priv:
        return pub, priv

    pk = ec.generate_private_key(ec.SECP256R1())
    public_bytes = pk.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    private_pem = pk.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    pub = _b64url(public_bytes)
    _set_setting(db, VAPID_PUBLIC_KEY_KEY, pub)
    _set_setting(db, VAPID_PRIVATE_PEM_KEY, private_pem)
    _set_setting(db, VAPID_SUBJECT_KEY, subject)
    db.commit()
    logger.info("Generated and persisted new VAPID keypair")
    return pub, private_pem


def get_public_key(db: Session) -> str:
    pub, _ = ensure_vapid_keys(db)
    return pub


def send_to_all(db: Session, title: str, body: str, url: str = "/") -> None:
    pub, priv = ensure_vapid_keys(db)
    subject = _get_setting(db, VAPID_SUBJECT_KEY) or "mailto:admin@copa-segue-me.app"
    payload = json.dumps({"title": title, "body": body, "url": url})
    subs = db.query(PushSubscription).all()
    stale_ids: list[int] = []
    for s in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": s.endpoint,
                    "keys": {"p256dh": s.p256dh, "auth": s.auth},
                },
                data=payload,
                vapid_private_key=priv,
                vapid_claims={"sub": subject},
                ttl=60 * 60 * 24,
            )
        except WebPushException as exc:
            status = getattr(exc.response, "status_code", None)
            if status in (404, 410):
                stale_ids.append(s.id)
            else:
                logger.warning("Push failed for sub %s: %s", s.id, exc)
        except Exception as exc:
            logger.warning("Push error for sub %s: %s", s.id, exc)
    if stale_ids:
        db.query(PushSubscription).filter(PushSubscription.id.in_(stale_ids)).delete(synchronize_session=False)
        db.commit()
        logger.info("Removed %d stale subscriptions", len(stale_ids))
