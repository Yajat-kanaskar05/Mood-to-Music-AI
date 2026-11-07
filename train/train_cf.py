import os
import sys
import pandas as pd

# Add project root to sys.path so ml_service can be imported from any working directory
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml_service.src.collaborative_filtering import CFTrainer
from ml_service.src.generate_users import generate_and_save

songs_path = os.path.join(PROJECT_ROOT, 'data', 'processed', 'songs_clean.csv')
interactions_path = os.path.join(PROJECT_ROOT, 'data', 'processed', 'user_interactions.csv')
model_path = os.path.join(PROJECT_ROOT, 'models', 'cf_model.pth')

# 1. Ensure user interactions exist
if not os.path.exists(interactions_path):
    print("User interactions dataset not found. Generating synthetic user interactions...")
    generate_and_save(songs_path=songs_path, output_path=interactions_path, n_users=1000)

print("1. Loading interactions and songs catalog...")
interactions_df = pd.read_csv(interactions_path)
songs_df = pd.read_csv(songs_path)
n_catalog_songs = len(songs_df)

print(f"Total interactions: {len(interactions_df)} across {interactions_df['user_id'].nunique()} users.")
print(f"Total songs catalog size: {n_catalog_songs}")

# 2. Initialize Trainer
print("2. Initializing Neural Collaborative Filtering Trainer...")
trainer = CFTrainer(
    interactions_df=interactions_df,
    n_songs=n_catalog_songs,
    emb_dim=64,
    lr=0.001,
    epochs=20
)

# 3. Train Model
print("3. Training Neural CF model...")
trainer.train(batch_size=512)

# 4. Save Model
print("4. Saving CF model checkpoint...")
trainer.save(model_path)
print("Collaborative Filtering model trained and saved successfully!")
