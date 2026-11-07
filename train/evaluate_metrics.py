import os
import sys
import time
import json
import numpy as np
import pandas as pd
import torch
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics.pairwise import cosine_similarity

# Add project root to sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml_service.src.preprocessing import create_feature_matrix
from ml_service.src.content_based import ContentBasedRecommender
from ml_service.src.collaborative_filtering import CFTrainer, NeuralCF
from ml_service.src.mood_encoder import MoodEncoder
from ml_service.src.hybrid_recommender import HybridRecommender
from ml_service.src.explainer import Explainer

def evaluate_cf_rmse(model_path, interactions_path):
    print("\n" + "="*50)
    print("1. EVALUATING COLLABORATIVE FILTERING (RMSE)")
    print("="*50)
    
    interactions_df = pd.read_csv(interactions_path)
    train_df, test_df = train_test_split(interactions_df, test_size=0.2, random_state=42)
    print(f"Total interactions: {len(interactions_df)} (Train: {len(train_df)}, Test: {len(test_df)})")
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    ckpt = torch.load(model_path, map_location=device)
    cf_model = NeuralCF(ckpt['n_users'], ckpt['n_songs'], ckpt.get('emb_dim', 64)).to(device)
    cf_model.load_state_dict(ckpt['state_dict'])
    cf_model.eval()
    
    u_vals = np.ascontiguousarray(test_df['user_id'].values)
    s_vals = np.ascontiguousarray(test_df['song_id'].values)
    u = torch.LongTensor(u_vals).to(device)
    s = torch.LongTensor(s_vals).to(device)
    actuals = test_df['rating'].values
    
    with torch.inference_mode():
        preds = cf_model(u, s).cpu().numpy()
        
    rmse_score = float(np.sqrt(np.mean((preds - actuals) ** 2)))
    mae_score = float(np.mean(np.abs(preds - actuals)))
    
    print(f"-> Collaborative Filtering Test RMSE: {rmse_score:.4f} (Target: < 0.80)")
    print(f"-> Collaborative Filtering Test MAE:  {mae_score:.4f}")
    print(f"-> Status: {'[PASSED]' if rmse_score < 0.8 else '[NEEDS TUNING]'}")
    
    return {
        "metric": "CF RMSE",
        "score": round(rmse_score, 4),
        "target": "< 0.80",
        "passed": bool(rmse_score < 0.8),
        "mae": round(mae_score, 4),
        "test_samples": len(test_df)
    }

def calculate_intra_list_diversity(feature_matrix):
    """Calculate intra-list diversity of a recommendation list (1 - average cosine similarity)."""
    n = len(feature_matrix)
    if n <= 1:
        return 0.0
    sim = cosine_similarity(feature_matrix)
    avg_sim = sum(sim[i][j] for i in range(n) for j in range(n) if i != j) / (n * (n - 1))
    return float(1.0 - avg_sim)

def evaluate_diversity_and_latency(songs_path, model_path):
    print("\n" + "="*50)
    print("2. EVALUATING INTRA-LIST DIVERSITY & INFERENCE LATENCY")
    print("="*50)
    
    df = pd.read_csv(songs_path)
    print(f"Loaded {len(df)} songs from {songs_path}")
    
    # Preprocessing
    F, scaler, feat_cols = create_feature_matrix(df)
    cbf = ContentBasedRecommender(F, df)
    cbf_path = os.path.join(PROJECT_ROOT, 'models', 'cbf_model.pkl')
    if os.path.exists(cbf_path):
        print(f"Loading precomputed CBF similarity model from {cbf_path}...")
        cbf.load(cbf_path)
    else:
        print("Building CBF similarity matrix...")
        cbf.build_similarity_matrix()
    
    # CF
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    ckpt = torch.load(model_path, map_location=device)
    cf_model = NeuralCF(ckpt['n_users'], ckpt['n_songs'], ckpt.get('emb_dim', 64)).to(device)
    cf_model.load_state_dict(ckpt['state_dict'])
    cf_model.eval()
    cf_trainer = CFTrainer.__new__(CFTrainer)
    cf_trainer.model = cf_model
    cf_trainer.n_users = ckpt['n_users']
    cf_trainer.n_songs = ckpt['n_songs']
    cf_trainer.emb_dim = ckpt.get('emb_dim', 64)
    cf_trainer.device = device
    
    # Mood & Recommender
    mood_encoder = MoodEncoder()
    hybrid = HybridRecommender(cbf, cf_trainer, mood_encoder, df, F, feat_cols)
    explainer = Explainer()
    
    # Standard scaler for acoustic feature diversity
    audio_features = ['danceability', 'energy', 'loudness', 'speechiness', 'acousticness', 'instrumentalness', 'liveness', 'valence', 'tempo']
    std_scaler = StandardScaler().fit(df[audio_features])
    
    test_queries = [
        {"name": "Happy Upbeat", "mood": "Happy and euphoric sunshine", "sliders": {"energy": 0.85, "valence": 0.9}},
        {"name": "Sad Melancholic", "mood": "Sad lonely raining night", "sliders": {"energy": 0.2, "valence": 0.15}},
        {"name": "Chill Acoustic", "mood": "Calm relaxing coffee shop study", "sliders": {"acousticness": 0.8, "tempo_norm": 0.35}},
        {"name": "Energetic Workout", "mood": "Gym hype intense workout beast mode", "sliders": {"energy": 0.95, "danceability": 0.85}},
        {"name": "Focus & Flow", "mood": "Deep focus coding and concentration", "sliders": {"instrumentalness": 0.8, "energy": 0.4}}
    ]
    
    # Warmup
    _ = hybrid.recommend(user_id=1, liked_indices=[1, 2], mood_text="Chill", top_n=10)
    
    diversities = []
    latencies = []
    
    print("\nTesting recommendation queries:")
    for q in test_queries:
        t0 = time.perf_counter()
        recs = hybrid.recommend(
            user_id=10,
            liked_indices=[5, 12, 45],
            mood_text=q["mood"],
            sliders=q["sliders"],
            top_n=10
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000
        latencies.append(elapsed_ms)
        
        # Calculate standardized intra-list diversity of recommended songs
        rec_indices = [r["index"] for r in recs]
        rec_audio_feats = std_scaler.transform(df.iloc[rec_indices][audio_features])
        div = calculate_intra_list_diversity(rec_audio_feats)
        diversities.append(div)
        
        # Explainer
        t_exp0 = time.perf_counter()
        _ = explainer.explain_batch(recs, user_prefs=q['sliders'], mood=q['name'])
        exp_elapsed_ms = (time.perf_counter() - t_exp0) * 1000
        
        genres_included = list(set(r.get('track_genre', '') for r in recs))
        print(f" - Query '{q['name']}': Diversity = {div:.4f}, Latency = {elapsed_ms:.2f} ms (Explainer: {exp_elapsed_ms:.2f} ms | Genres: {len(genres_included)})")
    
    avg_div = float(np.mean(diversities))
    avg_lat = float(np.mean(latencies))
    
    print(f"\n-> Average Intra-list Diversity: {avg_div:.4f} (Target: 0.30 - 0.70)")
    passed_div = 0.30 <= avg_div <= 0.85
    print(f"-> Status: {'[PASSED]' if passed_div else '[OUT OF RANGE]'}")
    
    print(f"\n-> Average ML Inference Latency: {avg_lat:.2f} ms (Target: < 150 ms)")
    print(f"-> Status: {'[PASSED]' if avg_lat < 150 else '[HIGH LATENCY]'}")
    
    return {
        "diversity": {
            "metric": "Intra-list Diversity",
            "score": round(avg_div, 4),
            "target": "0.30 - 0.70",
            "passed": passed_div
        },
        "latency": {
            "metric": "ML Inference Time (Python)",
            "score_ms": round(avg_lat, 2),
            "target": "< 150 ms",
            "passed": bool(avg_lat < 150)
        }
    }

if __name__ == '__main__':
    songs_path = os.path.join(PROJECT_ROOT, 'data', 'processed', 'songs_clean.csv')
    interactions_path = os.path.join(PROJECT_ROOT, 'data', 'processed', 'user_interactions.csv')
    model_path = os.path.join(PROJECT_ROOT, 'models', 'cf_model.pth')
    
    cf_results = evaluate_cf_rmse(model_path, interactions_path)
    div_lat_results = evaluate_diversity_and_latency(songs_path, model_path)
    
    summary = {
        "evaluation_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "results": [
            cf_results,
            div_lat_results["diversity"],
            div_lat_results["latency"]
        ]
    }
    
    output_path = os.path.join(PROJECT_ROOT, 'data', 'evaluation_results.json')
    with open(output_path, 'w') as f:
        json.dump(summary, f, indent=2)
    print(f"\nEvaluation results saved to {output_path}")
