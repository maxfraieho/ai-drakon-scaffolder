from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
load_dotenv()

from routes.health import router as health_router
from routes.analyze import router as analyze_router
from routes.feedback import router as feedback_router
from routes.chat import router as chat_router

app = FastAPI(title="drakon-agent", version="0.1.0")

_cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "https://aidrakon.tech,https://www.aidrakon.tech,http://localhost:5173,http://localhost:4173").split(",") if origin.strip()]
app.add_middleware(CORSMiddleware, allow_origins=_cors_origins, allow_methods=["*"], allow_headers=["*"])

app.include_router(health_router)
app.include_router(analyze_router)
app.include_router(feedback_router)
app.include_router(chat_router)


@app.get("/settings")
def get_settings():
    import os
    return {
        "repo_root": os.getenv("REPO_ROOT", ""),
        "proxy_url": os.getenv("PROXY_URL", "http://localhost:18880/v1"),
        "proxy_model": os.getenv("PROXY_MODEL", "fast-proxy"),
        "proxy_protocol": os.getenv("PROXY_PROTOCOL", "openai"),
        "agent": "drakon",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765)
