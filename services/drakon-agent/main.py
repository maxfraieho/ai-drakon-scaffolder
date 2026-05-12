from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="drakon-agent", version="0.1.0")


@app.get("/health")
def health():
    return {"status": "ok", "service": "drakon-agent"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8765, reload=False)
