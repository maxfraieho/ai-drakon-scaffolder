from fastapi import FastAPI
from dotenv import load_dotenv

from routes.health import router as health_router
from routes.analyze import router as analyze_router
from routes.feedback import router as feedback_router

load_dotenv()

app = FastAPI(title="drakon-agent", version="0.1.0")

app.include_router(health_router)
app.include_router(analyze_router)
app.include_router(feedback_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8765, reload=False)
