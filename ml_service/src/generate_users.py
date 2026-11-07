import os
import numpy as np
import pandas as pd


def generate_user_interactions(df: pd.DataFrame, n_users: int = 1000) -> pd.DataFrame:
    """Generate realistic synthetic user listening/rating interactions.
    
    Each user has preferred genres and rates 5 to 50 songs within their preferred genres,
    reflecting real-world collaborative filtering patterns.
    """
    np.random.seed(42)
    rows = []
    genres = df['track_genre'].unique()

    for uid in range(n_users):
        # Sample 1 to 3 favorite genres for this user
        n_genres = min(len(genres), np.random.randint(1, 4))
        pref = np.random.choice(genres, size=n_genres, replace=False)

        pool = df[df['track_genre'].isin(pref)].index.tolist()
        if not pool:
            pool = df.index.tolist()

        n_interactions = min(np.random.randint(5, 50), len(pool))
        sampled_songs = np.random.choice(pool, size=n_interactions, replace=False)

        for sid in sampled_songs:
            rows.append({
                'user_id': int(uid),
                'song_id': int(sid),
                'rating': float(np.random.choice([3.0, 4.0, 4.0, 5.0, 5.0]))
            })

    interactions_df = pd.DataFrame(rows)
    return interactions_df


def generate_and_save(songs_path: str = None, output_path: str = None, n_users: int = 1000):
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    if songs_path is None:
        songs_path = os.path.join(project_root, 'data', 'processed', 'songs_clean.csv')
    if output_path is None:
        output_path = os.path.join(project_root, 'data', 'processed', 'user_interactions.csv')

    print(f"Loading cleaned songs from {songs_path}...")
    df = pd.read_csv(songs_path)
    print(f"Total songs available: {len(df)}")

    print(f"Generating synthetic interaction history for {n_users} users...")
    interactions_df = generate_user_interactions(df, n_users=n_users)
    print(f"Generated {len(interactions_df)} user-song interaction pairs.")

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    interactions_df.to_csv(output_path, index=False)
    print(f"Saved interactions to {output_path}!")
    return interactions_df


if __name__ == '__main__':
    generate_and_save()
