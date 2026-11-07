import numpy as np

MOOD_PROFILES = {
    'happy': {
        'valence': 0.8,
        'energy': 0.75,
        'danceability': 0.7,
        'acousticness': 0.2,
        'tempo_norm': 0.6,
        'instrumentalness': 0.1,
        'description': 'Upbeat, positive, energetic'
    },
    'sad': {
        'valence': 0.2,
        'energy': 0.3,
        'danceability': 0.3,
        'acousticness': 0.7,
        'tempo_norm': 0.3,
        'instrumentalness': 0.3,
        'description': 'Melancholic, slow, emotional'
    },
    'angry': {
        'valence': 0.3,
        'energy': 0.9,
        'danceability': 0.5,
        'acousticness': 0.1,
        'tempo_norm': 0.8,
        'instrumentalness': 0.2,
        'description': 'Intense, aggressive, high energy'
    },
    'relaxed': {
        'valence': 0.6,
        'energy': 0.2,
        'danceability': 0.4,
        'acousticness': 0.8,
        'tempo_norm': 0.2,
        'instrumentalness': 0.5,
        'description': 'Calm, peaceful, low tempo'
    },
    'focused': {
        'valence': 0.5,
        'energy': 0.4,
        'danceability': 0.3,
        'acousticness': 0.4,
        'tempo_norm': 0.4,
        'instrumentalness': 0.8,
        'description': 'Minimal, no lyrics, steady'
    },
    'energetic': {
        'valence': 0.7,
        'energy': 0.95,
        'danceability': 0.8,
        'acousticness': 0.1,
        'tempo_norm': 0.85,
        'instrumentalness': 0.1,
        'description': 'Pumped up, workout, fast'
    },
    'romantic': {
        'valence': 0.65,
        'energy': 0.4,
        'danceability': 0.5,
        'acousticness': 0.5,
        'tempo_norm': 0.35,
        'instrumentalness': 0.2,
        'description': 'Soft, warm, intimate'
    },
    'nostalgic': {
        'valence': 0.55,
        'energy': 0.45,
        'danceability': 0.45,
        'acousticness': 0.6,
        'tempo_norm': 0.4,
        'instrumentalness': 0.3,
        'description': 'Reminiscent, warm, classic feel'
    },
}

KEYWORDS = {
    'happy': ['happy', 'joy', 'excited', 'great', 'cheerful', 'wonderful', 'smile', 'glad'],
    'sad': ['sad', 'depressed', 'unhappy', 'heartbroken', 'lonely', 'down', 'blue', 'crying', 'grief'],
    'angry': ['angry', 'mad', 'frustrated', 'rage', 'furious', 'annoyed', 'irritated'],
    'relaxed': ['relaxed', 'calm', 'chill', 'peaceful', 'serene', 'tranquil', 'sleep', 'rest'],
    'focused': ['focused', 'studying', 'working', 'concentrating', 'productive', 'coding', 'study'],
    'energetic': ['energetic', 'pumped', 'workout', 'gym', 'running', 'motivated', 'hyped', 'dance'],
    'romantic': ['romantic', 'love', 'date', 'cozy', 'intimate', 'affectionate', 'crush'],
    'nostalgic': ['nostalgic', 'memories', 'throwback', 'old', 'miss', 'remember', 'childhood'],
}

FEAT_KEYS = ['valence', 'energy', 'danceability', 'acousticness', 'tempo_norm', 'instrumentalness']


class MoodEncoder:
    """Detects mood from text queries and transforms moods into audio feature vectors."""
    def __init__(self):
        self.mood_profiles = MOOD_PROFILES
        self.keywords = KEYWORDS
        self.feature_keys = FEAT_KEYS

    def text_to_mood(self, text: str):
        """Map text/keyword input to the most matching mood and return (mood_name, feature_vector)."""
        if not text or not text.strip():
            return 'happy', self.get_vector('happy')

        text_lower = text.lower()
        # Direct key match
        for mood in self.mood_profiles:
            if mood in text_lower:
                return mood, self.get_vector(mood)

        # Keyword match scoring
        scores = {
            m: sum(1 for kw in kws if kw in text_lower)
            for m, kws in self.keywords.items()
        }
        best = max(scores, key=scores.get)
        if scores[best] == 0:
            best = 'happy'

        return best, self.get_vector(best)

    def get_vector(self, mood: str) -> np.ndarray:
        """Retrieve the normalized target audio feature vector for a specified mood."""
        mood_key = (mood or '').lower().strip()
        p = self.mood_profiles.get(mood_key, self.mood_profiles['happy'])
        return np.array([p[k] for k in self.feature_keys], dtype=np.float32)

    def blend(self, mood_vec: np.ndarray, slider_values, mood_weight: float = 0.4) -> np.ndarray:
        """Blend detected mood vector with user manual slider adjustments."""
        if hasattr(slider_values, 'model_dump'):
            slider_dict = slider_values.model_dump()
        elif hasattr(slider_values, 'dict'):
            slider_dict = slider_values.dict()
        elif isinstance(slider_values, dict):
            slider_dict = slider_values
        elif slider_values is None:
            slider_dict = {}
        else:
            slider_dict = {k: getattr(slider_values, k, 0.5) for k in self.feature_keys}

        slider_vec = np.array([slider_dict.get(k, 0.5) for k in self.feature_keys], dtype=np.float32)
        return (mood_weight * mood_vec) + ((1.0 - mood_weight) * slider_vec)

    def list_moods(self):
        """Return list of supported moods with their descriptors."""
        return [
            {"mood": m, "description": data["description"]}
            for m, data in self.mood_profiles.items()
        ]
