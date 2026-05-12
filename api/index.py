import os
import sys

# Add api/ directory to path so `app` module is found
sys.path.insert(0, os.path.dirname(__file__))

from app.main import app  # noqa: E402 — must come after sys.path fix
