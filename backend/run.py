"""
Artisans Marketplace Server Entry Point
Delegates directly to start_server.py.
"""

from start_server import *

if __name__ == "__main__":
    import uvicorn
    from app.config import PORT
    print(f"============================================================")
    print(f"   Artisans Marketplace FastAPI Backend (run.py)")
    print(f"   Server: http://0.0.0.0:{PORT} (Listening on all interfaces)")
    print(f"============================================================")
    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=True)
