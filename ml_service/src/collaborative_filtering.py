import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
import pandas as pd


class InteractionDataset(Dataset):
    """PyTorch Dataset for user-song-rating interactions."""
    def __init__(self, df: pd.DataFrame):
        self.users = torch.LongTensor(df['user_id'].values)
        self.songs = torch.LongTensor(df['song_id'].values)
        self.ratings = torch.FloatTensor(df['rating'].values)

    def __len__(self):
        return len(self.ratings)

    def __getitem__(self, i):
        return self.users[i], self.songs[i], self.ratings[i]


class NeuralCF(nn.Module):
    """Neural Collaborative Filtering model with latent embeddings and MLP layers."""
    def __init__(self, n_users: int, n_songs: int, emb_dim: int = 64, hidden: int = 128):
        super().__init__()
        self.n_users = n_users
        self.n_songs = n_songs
        self.emb_dim = emb_dim

        self.user_emb = nn.Embedding(n_users, emb_dim)
        self.song_emb = nn.Embedding(n_songs, emb_dim)
        self.user_bias = nn.Embedding(n_users, 1)
        self.song_bias = nn.Embedding(n_songs, 1)

        self.fc = nn.Sequential(
            nn.Linear(emb_dim * 2, hidden),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden, hidden // 2),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden // 2, 1)
        )

        nn.init.normal_(self.user_emb.weight, std=0.01)
        nn.init.normal_(self.song_emb.weight, std=0.01)
        nn.init.zeros_(self.user_bias.weight)
        nn.init.zeros_(self.song_bias.weight)

    def forward(self, u: torch.Tensor, s: torch.Tensor) -> torch.Tensor:
        x = torch.cat([self.user_emb(u), self.song_emb(s)], dim=1)
        out = self.fc(x).squeeze(-1)
        u_b = self.user_bias(u).squeeze(-1)
        s_b = self.song_bias(s).squeeze(-1)
        # Scaled sigmoid predicting ratings in the 1 to 5 range
        return torch.sigmoid(out + u_b + s_b) * 4.0 + 1.0


class CFTrainer:
    """Trainer and predictor for Neural Collaborative Filtering."""
    def __init__(self, interactions_df: pd.DataFrame, n_songs: int = None, emb_dim: int = 64, lr: float = 0.001, epochs: int = 20):
        self.df = interactions_df
        self.n_users = int(interactions_df['user_id'].nunique())
        # Ensure n_songs encompasses the full track catalog if provided
        max_song_in_df = int(interactions_df['song_id'].max()) + 1
        self.n_songs = max(max_song_in_df, n_songs) if n_songs else max_song_in_df

        self.emb_dim = emb_dim
        self.epochs = epochs
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

        self.model = NeuralCF(self.n_users, self.n_songs, emb_dim=emb_dim).to(self.device)
        self.optim = optim.Adam(self.model.parameters(), lr=lr)
        self.loss_fn = nn.MSELoss()

    def train(self, batch_size: int = 512):
        dataset = InteractionDataset(self.df)
        loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
        self.model.train()

        print(f"Starting Neural CF training ({self.epochs} epochs, device: {self.device})...")
        for epoch in range(self.epochs):
            total_loss = 0.0
            for u, s, r in loader:
                u = u.to(self.device)
                s = s.to(self.device)
                r = r.to(self.device)

                self.optim.zero_grad()
                pred = self.model(u, s)
                loss = self.loss_fn(pred, r)
                loss.backward()
                self.optim.step()

                total_loss += loss.item()

            avg_loss = total_loss / len(loader)
            if (epoch + 1) % 5 == 0 or epoch == 0 or epoch == self.epochs - 1:
                print(f"Epoch {epoch + 1:2d}/{self.epochs} | Loss: {avg_loss:.4f}")

        print("Training complete.")

    def predict(self, user_id: int, song_ids: list) -> np.ndarray:
        """Predict user ratings for a list of candidate song IDs."""
        self.model.eval()
        safe_user_id = min(max(int(user_id), 0), self.n_users - 1)
        
        with torch.inference_mode():
            if isinstance(song_ids, (list, tuple, np.ndarray)):
                s_arr = np.asarray(song_ids, dtype=np.int64)
                s = torch.from_numpy(s_arr).to(self.device).clamp(0, self.n_songs - 1)
            elif isinstance(song_ids, torch.Tensor):
                s = song_ids.to(self.device).clamp(0, self.n_songs - 1)
            else:
                s = torch.tensor(song_ids, dtype=torch.long, device=self.device).clamp(0, self.n_songs - 1)

            u = torch.full((len(s),), safe_user_id, dtype=torch.long, device=self.device)
            preds = self.model(u, s).cpu().numpy()
            if preds.ndim == 0:
                preds = np.array([float(preds)])
            return preds

    def save(self, path: str = 'models/cf_model.pth'):
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        torch.save({
            'state_dict': self.model.state_dict(),
            'n_users': self.n_users,
            'n_songs': self.n_songs,
            'emb_dim': self.emb_dim
        }, path)
        print(f"CF model saved to {path} ({os.path.getsize(path)} bytes)")

    def load(self, path: str = 'models/cf_model.pth'):
        ckpt = torch.load(path, map_location=self.device)
        self.n_users = ckpt['n_users']
        self.n_songs = ckpt['n_songs']
        self.emb_dim = ckpt['emb_dim']
        self.model = NeuralCF(self.n_users, self.n_songs, emb_dim=self.emb_dim).to(self.device)
        self.model.load_state_dict(ckpt['state_dict'])
        self.model.eval()
        print(f"CF model loaded from {path}")
