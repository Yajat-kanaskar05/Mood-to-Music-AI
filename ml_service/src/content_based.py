import os
import pickle
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


class LazySimilarityMatrix:
    """Memory-efficient similarity matrix that computes similarities on the fly.
    
    Prevents allocating ~50 GB of RAM for 80,000+ tracks while maintaining exact 2D matrix
    indexing semantics: `similarity_matrix[i]` returns the 1D similarity array across all items.
    """
    def __init__(self, feature_matrix):
        self.feature_matrix = np.asarray(feature_matrix, dtype=np.float32)
        # Precompute L2 normalized features for sub-millisecond dot products
        norms = np.linalg.norm(self.feature_matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        self.normalized_features = self.feature_matrix / norms
        self.shape = (len(self.feature_matrix), len(self.feature_matrix))

    def __getitem__(self, idx):
        if isinstance(idx, (int, np.integer)):
            query_vec = self.normalized_features[idx]
            return np.dot(self.normalized_features, query_vec)
        elif isinstance(idx, (list, np.ndarray, slice)):
            query_vecs = self.normalized_features[idx]
            if len(query_vecs.shape) == 1:
                return np.dot(self.normalized_features, query_vecs)
            return np.dot(query_vecs, self.normalized_features.T)
        raise IndexError(f"Unsupported index type: {type(idx)}")

    def __len__(self):
        return len(self.feature_matrix)


class ContentBasedRecommender:
    def __init__(self, feature_matrix, df):
        self.feature_matrix = feature_matrix
        self.df = df
        self.similarity_matrix = None

    def build_similarity_matrix(self):
        print("Building cosine similarity matrix...")
        # For small matrices (<= 5,000 songs), dense precomputation is fine;
        # for large datasets (e.g. 80k+ songs), LazySimilarityMatrix avoids 50 GB RAM allocation
        if len(self.feature_matrix) <= 5000:
            self.similarity_matrix = cosine_similarity(self.feature_matrix)
        else:
            self.similarity_matrix = LazySimilarityMatrix(self.feature_matrix)
        print(f"Similarity matrix ready. Shape: {self.similarity_matrix.shape}")
        return self.similarity_matrix

    def recommend_from_feature_vector(self, user_vector, top_n=10, exclude_indices=None):
        """Recommend songs matching a desired audio feature vector."""
        user_vector = np.asarray(user_vector, dtype=np.float32).reshape(1, -1)
        scores = cosine_similarity(user_vector, self.feature_matrix)[0]
        indexed = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
        if exclude_indices:
            exclude_set = set(exclude_indices)
            indexed = [(i, s) for i, s in indexed if i not in exclude_set]
        results = []
        for idx, score in indexed[:top_n]:
            info = self.df.iloc[idx].to_dict()
            info['similarity_score'] = round(float(score), 4)
            results.append(info)
        return results

    def recommend_similar_songs(self, song_index: int, top_n=10, exclude_indices=None):
        """Recommend songs most similar to a given song by index."""
        if self.similarity_matrix is None:
            self.build_similarity_matrix()
        scores = self.similarity_matrix[song_index]
        indexed = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
        exclude_set = set(exclude_indices or [])
        exclude_set.add(song_index)
        results = []
        for idx, score in indexed:
            if idx in exclude_set:
                continue
            info = self.df.iloc[idx].to_dict()
            info['similarity_score'] = round(float(score), 4)
            results.append(info)
            if len(results) >= top_n:
                break
        return results

    def save(self, path='models/cbf_model.pkl'):
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        with open(path, 'wb') as f:
            pickle.dump({'similarity_matrix': self.similarity_matrix,
                         'feature_matrix': self.feature_matrix}, f)
        print(f"CBF model saved to {path} ({os.path.getsize(path)} bytes)")

    def load(self, path='models/cbf_model.pkl'):
        # Ensure project root is in sys.path
        import sys
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        if base_dir not in sys.path:
            sys.path.insert(0, base_dir)

        class RecommenderUnpickler(pickle.Unpickler):
            def find_class(self, module, name):
                if name == 'LazySimilarityMatrix':
                    return LazySimilarityMatrix
                if name == 'ContentBasedRecommender':
                    return ContentBasedRecommender
                return super().find_class(module, name)

        with open(path, 'rb') as f:
            try:
                data = pickle.load(f)
            except (ModuleNotFoundError, AttributeError):
                f.seek(0)
                data = RecommenderUnpickler(f).load()

        self.similarity_matrix = data['similarity_matrix']
        self.feature_matrix    = data['feature_matrix']
        print(f"CBF model loaded from {path}")
