import sys
from pathlib import Path

# Add backend/ai to sys.path so all imports in main.py work seamlessly
ai_dir = str(Path(__file__).resolve().parent.parent)
if ai_dir not in sys.path:
    sys.path.insert(0, ai_dir)

from main import *
