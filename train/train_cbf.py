import os
import sys
import pandas as pd

# Add project root to sys.path so ml_service can be imported from any working directory
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml_service.src.preprocessing import clean_data, engineer_features, create_feature_matrix
from ml_service.src.content_based import ContentBasedRecommender

raw_csv = os.path.join(PROJECT_ROOT, 'data', 'raw', 'dataset.csv')
processed_csv = os.path.join(PROJECT_ROOT, 'data', 'processed', 'songs_clean.csv')
model_path = os.path.join(PROJECT_ROOT, 'models', 'cbf_model.pkl')

print("1. Loading raw dataset...")
df = pd.read_csv(raw_csv)
print(f"Raw tracks: {len(df)}")

print("2. Cleaning dataset...")
df = clean_data(df)
print(f"Deduplicated clean tracks: {len(df)}")

print("3. Engineering features...")
df = engineer_features(df)
feature_matrix, scaler, feature_cols = create_feature_matrix(df)

os.makedirs(os.path.dirname(processed_csv), exist_ok=True)
df.to_csv(processed_csv, index=False)
print(f"Clean songs saved to {processed_csv}")

print("4. Initializing ContentBasedRecommender...")
rec = ContentBasedRecommender(feature_matrix, df)
rec.build_similarity_matrix()

print("5. Saving model...")
os.makedirs(os.path.dirname(model_path), exist_ok=True)
rec.save(model_path)
print("CBF model saved successfully!")
