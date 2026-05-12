import sys
import os

try:
    from fastapi import FastAPI
    _fastapi_ok = True
except Exception as e:
    _fastapi_ok = False
    _fastapi_err = str(e)

try:
    import sqlalchemy
    _sqlalchemy_ok = True
except Exception as e:
    _sqlalchemy_ok = False
    _sqlalchemy_err = str(e)

try:
    import pg8000
    _pg8000_ok = True
except Exception as e:
    _pg8000_ok = False
    _pg8000_err = str(e)

try:
    import jose
    _jose_ok = True
except Exception as e:
    _jose_ok = False
    _jose_err = str(e)

try:
    import passlib
    _passlib_ok = True
except Exception as e:
    _passlib_ok = False
    _passlib_err = str(e)

try:
    import bcrypt
    _bcrypt_ok = True
except Exception as e:
    _bcrypt_ok = False
    _bcrypt_err = str(e)

try:
    import cryptography
    _crypto_ok = True
except Exception as e:
    _crypto_ok = False
    _crypto_err = str(e)

app = FastAPI() if _fastapi_ok else None

if app:
    @app.get("/api/debug")
    def debug():
        return {
            "python": sys.version,
            "fastapi": _fastapi_ok,
            "sqlalchemy": _sqlalchemy_ok,
            "pg8000": _pg8000_ok,
            "jose": _jose_ok,
            "passlib": _passlib_ok,
            "bcrypt": _bcrypt_ok,
            "cryptography": _crypto_ok,
            "fastapi_err": locals().get("_fastapi_err"),
            "sqlalchemy_err": locals().get("_sqlalchemy_err"),
            "pg8000_err": locals().get("_pg8000_err"),
            "jose_err": locals().get("_jose_err"),
            "passlib_err": locals().get("_passlib_err"),
            "bcrypt_err": locals().get("_bcrypt_err"),
            "crypto_err": locals().get("_crypto_err"),
        }

    @app.get("/api/health")
    def health():
        return {"status": "ok"}
