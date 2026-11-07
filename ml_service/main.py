import os
import sys
from typing import List, Optional
import numpy as np
import pandas as pd
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure both project root and ml_service directory are in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
for p in [PROJECT_ROOT, CURRENT_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from src.preprocessing import create_feature_matrix
from src.content_based import ContentBasedRecommender
from src.collaborative_filtering import CFTrainer, NeuralCF
from src.mood_encoder import MoodEncoder
from src.hybrid_recommender import HybridRecommender
from src.explainer import Explainer

app = FastAPI(title="Mood-to-Music ML Service", version="1.0.0")

# Allow Node.js backend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def resolve_path(env_var: str, default_rel: str) -> str:
    env_val = os.getenv(env_var)
    candidates = []
    if env_val:
        candidates.extend([
            env_val,
            os.path.join(CURRENT_DIR, env_val),
            os.path.join(PROJECT_ROOT, env_val),
        ])
    candidates.extend([
        os.path.join(PROJECT_ROOT, default_rel),
        os.path.join(CURRENT_DIR, default_rel),
        default_rel,
    ])
    for c in candidates:
        if os.path.exists(c):
            return os.path.abspath(c)
    return os.path.abspath(os.path.join(PROJECT_ROOT, default_rel))


# ---- Load everything on startup ----
DATA_PATH = resolve_path('DATA_PATH', 'data/processed/songs_clean.csv')
MODELS_PATH = resolve_path('MODELS_PATH', 'models')

print(f"[1/4] Loading song dataset ({DATA_PATH})...", flush=True)
df = pd.read_csv(DATA_PATH)
feature_matrix, scaler, feature_cols = create_feature_matrix(df)

print(f"[2/4] Initializing Content-Based Recommender from {MODELS_PATH}...", flush=True)
cbf = ContentBasedRecommender(feature_matrix, df)
cbf_path = os.path.join(MODELS_PATH, 'cbf_model.pkl')
if os.path.exists(cbf_path):
    cbf.load(cbf_path)
else:
    cbf.build_similarity_matrix()

mood_encoder = MoodEncoder()
explainer = Explainer()

cf_trainer = None
cf_path = os.path.join(MODELS_PATH, 'cf_model.pth')
if os.path.exists(cf_path):
    print(f"[3/4] Loading Neural CF model ({cf_path})...", flush=True)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    ckpt = torch.load(cf_path, map_location=device)
    cf_model = NeuralCF(ckpt['n_users'], ckpt['n_songs'], ckpt['emb_dim']).to(device)
    cf_model.load_state_dict(ckpt['state_dict'])
    cf_model.eval()
    cf_trainer = CFTrainer.__new__(CFTrainer)
    cf_trainer.model = cf_model
    cf_trainer.n_users = ckpt['n_users']
    cf_trainer.n_songs = ckpt['n_songs']
    cf_trainer.emb_dim = ckpt.get('emb_dim', 64)
    cf_trainer.device = device

hybrid = HybridRecommender(cbf, cf_trainer, mood_encoder, df, feature_matrix, feature_cols)

print(f"[4/4] ML service ready! {len(df)} songs indexed.", flush=True)


# ---- Request Models ----
class SliderValues(BaseModel):
    valence: float = Field(0.5, ge=0, le=1)
    energy: float = Field(0.5, ge=0, le=1)
    danceability: float = Field(0.5, ge=0, le=1)
    acousticness: float = Field(0.5, ge=0, le=1)
    tempo_norm: float = Field(0.5, ge=0, le=1)
    instrumentalness: float = Field(0.5, ge=0, le=1)


class RecommendRequest(BaseModel):
    mood_text: Optional[str] = None
    liked_songs: Optional[List[str]] = []
    slider_values: Optional[SliderValues] = None
    user_id: Optional[int] = None
    top_n: int = Field(10, ge=1, le=50)
    genre_filter: Optional[str] = None


# ---- Endpoints ----
@app.get("/health")
def health():
    return {"status": "ok", "songs": len(df)}


@app.get("/moods")
def get_moods():
    return {"moods": [{"name": n, "description": p["description"]}
                       for n, p in mood_encoder.mood_profiles.items()]}


@app.get("/genres")
def get_genres():
    return {"genres": sorted(df['track_genre'].dropna().unique().tolist())}


@app.get("/search")
def search(query: str, limit: int = 10):
    mask = (df['track_name'].str.contains(query, case=False, na=False) |
            df['artists'].str.contains(query, case=False, na=False))
    rows = df[mask].head(limit)
    return {"results": [{"index": int(r.name), "track_name": r['track_name'],
                          "artists": r['artists'], "genre": r['track_genre']}
                         for _, r in rows.iterrows()]}


@app.post("/recommend")
def recommend(req: RecommendRequest):
    # Resolve song names -> indices
    liked_idx = []
    for name in (req.liked_songs or []):
        cleaned_name = str(name).strip().lower()
        m = df[df['track_name'].astype(str).str.strip().str.lower() == cleaned_name]
        if not m.empty:
            liked_idx.append(int(m.index[0]))

    sliders = (req.slider_values.model_dump() if hasattr(req.slider_values, 'model_dump')
               else req.slider_values.dict()) if req.slider_values else None

    recs = hybrid.recommend(
        user_id=req.user_id,
        liked_indices=liked_idx or None,
        mood_text=req.mood_text,
        sliders=sliders,
        genre_filter=req.genre_filter,
        top_n=req.top_n
    )

    if not recs:
        raise HTTPException(404, "No recommendations found")

    mood = recs[0].get('detected_mood') if recs else None
    explanations = explainer.explain_batch(recs, user_prefs=sliders, mood=mood)

    results = [{
        "track_id":     r.get('track_id', ''),
        "track_name":   r.get('track_name', ''),
        "artists":      r.get('artists', ''),
        "album_name":   r.get('album_name', ''),
        "genre":        r.get('track_genre', ''),
        "hybrid_score": r.get('hybrid_score', 0),
        "energy":       round(float(r.get('energy', 0)), 2),
        "valence":      round(float(r.get('valence', 0)), 2),
        "danceability": round(float(r.get('danceability', 0)), 2),
        "acousticness": round(float(r.get('acousticness', 0)), 2),
        "tempo":        round(float(r.get('tempo', 120)), 1),
        "explanation":  exp
    } for r, exp in zip(recs, explanations)]

    return {"recommendations": results, "count": len(results), "detected_mood": mood}


if __name__ == "__main__":
    import uvicorn
    print("\nStarting Uvicorn server on http://localhost:8000 ...", flush=True)
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
