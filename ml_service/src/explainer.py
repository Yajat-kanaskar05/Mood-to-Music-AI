class Explainer:
    """Explainability Layer for Song Recommendations.
    
    Generates human-readable explanations explaining WHY each song
    was recommended based on audio features, user preferences, mood, and genre.
    """

    CHECKS = [
        ('energy',           0.7, 0.3, 'high-energy track',         'soft, low-energy track'),
        ('valence',          0.7, 0.3, 'positive, uplifting tone',   'emotional, introspective tone'),
        ('danceability',     0.7, 0.3, 'great for dancing',          'relaxed listening experience'),
        ('acousticness',     0.7, 0.3, 'natural acoustic sound',     'electronic production'),
        ('instrumentalness', 0.7, 0.3, 'instrumental for focus',     'vocal-driven'),
        ('tempo_norm',       0.65, 0.35, 'fast tempo for energy',    'slow tempo for relaxation'),
    ]

    def explain(self, song, user_prefs=None, mood=None):
        reasons = []
        if mood:
            reasons.append(f"Matches your {mood} mood.")

        for feat, hi, lo, hi_label, lo_label in self.CHECKS:
            val = song.get(feat, 0.5) if hasattr(song, 'get') else 0.5
            try:
                val = float(val) if val is not None else 0.5
            except (ValueError, TypeError):
                val = 0.5

            if user_prefs and feat in user_prefs and user_prefs[feat] is not None:
                try:
                    pref_val = float(user_prefs[feat])
                    if abs(val - pref_val) < 0.15:
                        reasons.append(f"Its {hi_label if val > hi else lo_label} matches your preference.")
                except (ValueError, TypeError):
                    pass
            else:
                if val > hi:
                    reasons.append(f"It's a {hi_label}.")
                elif val < lo:
                    reasons.append(f"It offers a {lo_label}.")

        genre = song.get('track_genre', '') if hasattr(song, 'get') else ''
        if genre:
            reasons.append(f"Fits the {genre} genre.")

        unique = list(dict.fromkeys(reasons))[:3]

        feature_match = {}
        for f in ['energy', 'valence', 'danceability', 'acousticness', 'tempo_norm']:
            raw_s_val = song.get(f, 0.5) if hasattr(song, 'get') else 0.5
            try:
                s_val = round(float(raw_s_val), 2)
            except (ValueError, TypeError):
                s_val = 0.5

            u_val = None
            if user_prefs and f in user_prefs and user_prefs[f] is not None:
                try:
                    u_val = round(float(user_prefs[f]), 2)
                except (ValueError, TypeError):
                    u_val = None

            feature_match[f] = {
                'song_value': s_val,
                'user_preference': u_val
            }

        return {
            'reasons': unique,
            'summary': unique[0] if unique else 'Based on your taste.',
            'feature_match': feature_match,
            'genre': genre
        }

    def explain_batch(self, songs, user_prefs=None, mood=None):
        return [self.explain(s, user_prefs, mood) for s in songs]
