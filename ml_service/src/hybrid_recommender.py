import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


class HybridRecommender:
    """Hybrid Recommendation Engine.
    
    Combines:
    1. Content-Based Filtering (CBF): Audio feature similarity to user's liked tracks.
    2. Collaborative Filtering (CF): Neural collaborative matrix factorization predicting user preference ratings.
    3. Mood & Preference Guidance: Semantic mood-to-audio vector alignment with manual audio slider blending.
    """
    def __init__(self, cbf, cf_trainer, mood_encoder, df, feature_matrix, feature_cols):
        self.cbf = cbf
        self.cf = cf_trainer
        self.mood_encoder = mood_encoder
        self.df = df
        self.F = feature_matrix
        self.feat_cols = feature_cols

    def recommend(
        self,
        user_id=None,
        liked_indices=None,
        mood_text=None,
        sliders=None,
        genre_filter=None,
        top_n=10,
        w_cbf=0.4,
        w_cf=0.3,
        w_mood=0.3
    ):
        n = len(self.df)
        scores = np.zeros(n, dtype=np.float32)
        mood_name = None
        active_weights = 0.0

        # Filter valid liked indices
        valid_liked = []
        if liked_indices:
            valid_liked = [int(i) for i in liked_indices if 0 <= int(i) < n]

        # 1. Content-Based Score (Audio feature similarity to anchor tracks)
        if valid_liked and self.cbf is not None:
            cbf_s = np.mean([self.cbf.similarity_matrix[i] for i in valid_liked], axis=0)
            denom = cbf_s.max() - cbf_s.min()
            if denom > 1e-9:
                cbf_s = (cbf_s - cbf_s.min()) / denom
            scores += w_cbf * cbf_s
            active_weights += w_cbf

        # 2. Collaborative Filtering Score (Neural CF rating predictions)
        if user_id is not None and self.cf is not None:
            cf_r = self.cf.predict(user_id, np.arange(n, dtype=np.int64))
            denom = cf_r.max() - cf_r.min()
            if denom > 1e-9:
                cf_s = (cf_r - cf_r.min()) / denom
                scores += w_cf * cf_s
                active_weights += w_cf

        # 3. Mood + Slider Score (Semantic mood vector + slider tuning)
        if mood_text or sliders:
            if mood_text:
                mood_name, mood_vec = self.mood_encoder.text_to_mood(mood_text)
            else:
                mood_vec = np.full(len(self.mood_encoder.feature_keys), 0.5, dtype=np.float32)

            if sliders:
                mood_vec = self.mood_encoder.blend(mood_vec, sliders)

            full_vec = self._expand(mood_vec)
            mood_s = cosine_similarity(full_vec.reshape(1, -1), self.F)[0]
            denom = mood_s.max() - mood_s.min()
            if denom > 1e-9:
                mood_s = (mood_s - mood_s.min()) / denom
            scores += w_mood * mood_s
            active_weights += w_mood

        # Normalize score by sum of active weights to scale match percentage dynamically (0 - 100%)
        if active_weights > 0:
            scores /= active_weights
        else:
            # Fallback baseline: if no signals provided, surface popular tracks
            if 'popularity' in self.df.columns:
                scores += (self.df['popularity'].values / 100.0).astype(np.float32)

        # Clean NaNs
        np.nan_to_num(scores, copy=False, nan=0.0)

        # 4. Exclude liked songs
        for i in valid_liked:
            scores[i] = -1.0

        # Filter by genre if requested (mask out non-matching genres before ranking)
        if genre_filter and 'track_genre' in self.df.columns:
            target_genre = str(genre_filter).strip().lower()
            non_genre_mask = self.df['track_genre'].astype(str).str.strip().str.lower() != target_genre
            scores[non_genre_mask.values] = -1.0

        # 5. Return top-N
        candidate_count = min(n, max(top_n * 3, 50))
        top_candidates = np.argsort(scores)[::-1][:candidate_count]

        results = []
        for idx in top_candidates:
            if scores[idx] < 0:
                continue
            info = self.df.iloc[idx].to_dict()
            info['index'] = int(idx)
            info['hybrid_score'] = round(float(scores[idx]), 4)
            info['detected_mood'] = mood_name
            results.append(info)
            if len(results) >= top_n:
                break

        return results

    def _expand(self, mood_vec):
        """Expand a 6-dim mood vector into the 13-dim feature matrix space."""
        v = np.full(len(self.feat_cols), 0.5, dtype=np.float32)
        for i, k in enumerate(self.mood_encoder.feature_keys):
            if k in self.feat_cols:
                v[self.feat_cols.index(k)] = mood_vec[i]
        return v
