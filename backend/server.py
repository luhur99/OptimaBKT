from fastapi import FastAPI

app = FastAPI()

@app.get("/api/")
def root():
    return {"status": "ok", "note": "OptimaBKT uses Supabase as backend; FastAPI stub only."}

@app.get("/api/health")
def health():
    return {"status": "healthy"}
