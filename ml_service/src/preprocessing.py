import os
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Clean the raw Spotify tracks dataset.
    
    - Drops duplicate track_name + artists pairs
    - Drops rows missing track_name, artists, or track_genre
    - Imputes missing numeric values with column medians
    - Normalizes loudness [-60, 0] dB to [0, 1]
    - Normalizes tempo to [0, 1]
    """
    df = df.drop_duplicates(subset=['track_name', 'artists'])
    df = df.dropna(subset=['track_name', 'artists', 'track_genre'])

    numeric_cols = [
        'danceability', 'energy', 'loudness', 'speechiness',
        'acousticness', 'instrumentalness', 'liveness',
        'valence', 'tempo', 'popularity'
    ]
    for col in numeric_cols:
        df[col] = df[col].fillna(df[col].median())

    # Normalize loudness [-60, 0] -> [0, 1]
    loudness_min = df['loudness'].min()
    loudness_max = df['loudness'].max()
    df['loudness_norm'] = (df['loudness'] - loudness_min) / (loudness_max - loudness_min)

    # Normalize tempo -> [0, 1]
    tempo_min = df['tempo'].min()
    tempo_max = df['tempo'].max()
    df['tempo_norm'] = (df['tempo'] - tempo_min) / (tempo_max - tempo_min)

    return df.reset_index(drop=True)


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Engineer mood, energy, and contextual composite scores."""
    # Composite scores
    df['mood_score'] = (df['valence'] * 0.6) + (df['energy'] * 0.4)
    df['chill_score'] = ((1 - df['energy']) * 0.5) + (df['acousticness'] * 0.5)
    df['party_score'] = (
        (df['danceability'] * 0.4)
        + (df['energy'] * 0.4)
        + (df['loudness_norm'] * 0.2)
    )
    df['focus_score'] = (
        (df['instrumentalness'] * 0.5)
        + ((1 - df['speechiness']) * 0.3)
        + (df['energy'] * 0.2)
    )
    return df


def create_feature_matrix(df: pd.DataFrame):
    """Create normalized feature matrix for recommendation models."""
    feature_cols = [
        'danceability', 'energy', 'loudness_norm', 'speechiness',
        'acousticness', 'instrumentalness', 'liveness', 'valence',
        'tempo_norm', 'mood_score', 'chill_score', 'party_score', 'focus_score'
    ]
    scaler = MinMaxScaler()
    feature_matrix = scaler.fit_transform(df[feature_cols])
    return feature_matrix, scaler, feature_cols


def process_and_save(raw_csv_path: str, output_csv_path: str):
    """Full preprocessing pipeline: load -> clean -> feature engineer -> save."""
    print(f"Loading raw dataset from {raw_csv_path}...")
    df = pd.read_csv(raw_csv_path)
    initial_shape = df.shape
    print(f"Initial raw rows: {initial_shape[0]}, cols: {initial_shape[1]}")

    print("Cleaning dataset...")
    df = clean_data(df)
    print(f"Cleaned dataset rows: {len(df)}")

    print("Engineering composite mood & activity features...")
    df = engineer_features(df)

    feature_matrix, scaler, feature_cols = create_feature_matrix(df)
    print(f"Created feature matrix with shape: {feature_matrix.shape}")
    print(f"Feature columns: {feature_cols}")

    os.makedirs(os.path.dirname(output_csv_path), exist_ok=True)
    df.to_csv(output_csv_path, index=False)
    print(f"Processed dataset saved successfully to {output_csv_path}!")

    return df, feature_matrix, scaler, feature_cols


if __name__ == '__main__':
    # Determine default paths relative to workspace
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    raw_path = os.path.join(base_dir, 'data', 'raw', 'dataset.csv')
    processed_path = os.path.join(base_dir, 'data', 'processed', 'songs_clean.csv')

    process_and_save(raw_path, processed_path)
