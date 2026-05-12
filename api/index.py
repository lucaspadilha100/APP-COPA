import sys
import traceback

from fastapi import FastAPI

app = FastAPI()

try:
    from app.main import app as real_app
    _app_ok = True
    _app_err = None
    _app_tb = None
    app = real_app
except Exception as e:
    _app_ok = False
    _app_err = str(e)
    _app_tb = traceback.format_exc()


@app.get("/api/debug")
def debug():
    return {
        "python": sys.version,
        "app_import_ok": _app_ok,
        "app_error": _app_err,
        "app_traceback": _app_tb,
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "app_loaded": _app_ok}
