# 🎵 Mood-to-Music AI

An intelligent, full-stack music recommendation web application powered by a **3-tier microservices architecture** (**React + Vite** $\rightarrow$ **Node.js / Express API Gateway** $\rightarrow$ **Python / FastAPI ML Engine**).

It combines **Content-Based Filtering** (memory-efficient cosine similarity), **Neural Collaborative Filtering** (PyTorch MLP + embeddings), and **Semantic Mood & Audio Feature Blending** across **81,343 Spotify tracks**, complete with natural-language explanations and an embedded Spotify player.

---

## ✨ Key Features

- **🧠 Hybrid AI Recommendation Engine**: Dynamically blends three recommendation signals with automatic cold-start weight normalization:
  - **Content-Based Filtering (CBF)**: Uses a custom `LazySimilarityMatrix` (L2-normalized on-demand dot products) to compute cosine similarities across 81,343 tracks without allocating ~50 GB of dense RAM.
  - **Neural Collaborative Filtering (CF)**: PyTorch neural network combining 64-dimensional user/song latent embeddings, bias embeddings, and a 3-layer MLP (`128 → 64 → 1`) to predict user track affinity.
  - **Mood & Audio Tuning Guidance**: Maps 8 mood presets (`happy`, `sad`, `angry`, `relaxed`, `focused`, `energetic`, `romantic`, `nostalgic`) or keyword-based free-text queries into 6D audio vectors, blended with live slider controls (`valence`, `energy`, `danceability`, `acousticness`, `tempo_norm`, `instrumentalness`).
- **🔍 Explainability Layer ("Why This Song?")**: Inspect exact natural-language reasons and a side-by-side acoustic feature alignment table comparing each recommended track against your target preferences.
- **🎧 Embedded Spotify Playback**: Expandable official Spotify player directly inside each recommendation card alongside external Spotify track links.
- **🎚️ Interactive Audio Tuning & Anchor Tracks**: Includes quick acoustic presets (*Club Night*, *Deep Focus*, *Coffee Chill*, *Late Night Melancholy*), real-time catalog search to pin anchor songs, and searchable genre filtering.
- **🔐 User Profiles & Listening History**: JWT authentication (`bcryptjs` password hashing), SQLite persistence (`better-sqlite3` with WAL mode), rate limiting, and a slide-out listening history drawer that feeds back into personalized recommendations.

---

## 🏗️ System Architecture

```text
+-------------------------------------------------------------------+
|                     FRONTEND (React + Vite)                       |
|   Mood Selector • 6 Audio Sliders • Genre Filter • Spotify Embed  |
+---------------------------------+---------------------------------+
                                  | REST (/api/*)
                                  v
+-------------------------------------------------------------------+
|                NODE.JS API GATEWAY (Express v5)                   |
|   • Serves production React SPA (frontend/dist)                   |
|   • JWT Authentication (/api/auth) & Rate Limiting (100 req/15m)  |
|   • SQLite User Profiles & Listening History (/api/users)         |
|   • ML Proxy with startup cold-start retry (/api/recommend)       |
+-----------------+---------------------------------+---------------+
                  | Internal HTTP                   | better-sqlite3
                  v                                 v
+-----------------------------------+    +--------------------------+
|   PYTHON ML MICROSERVICE          |    |     SQLITE DATABASE      |
|   (FastAPI + PyTorch)             |    |  • users                 |
|   • /recommend  • /search         |    |  • listening_history     |
|   • /moods      • /genres         |    |  • sessions              |
+-----------------------------------+    +--------------------------+
```

---

## 📊 Model Pipeline & Evaluation Metrics

1. **Preprocessing & Feature Engineering** ([`ml_service/src/preprocessing.py`](ml_service/src/preprocessing.py)):
   - Deduplicates and cleans the raw Spotify dataset (~114k raw $\rightarrow$ **81,343** clean tracks), normalizes `loudness` and `tempo`, and engineers 4 composite scores (`mood_score`, `chill_score`, `party_score`, `focus_score`) into a 13-feature `MinMaxScaler` matrix.
2. **Evaluated Performance** ([`train/evaluate_metrics.py`](train/evaluate_metrics.py) / [`data/evaluation_results.json`](data/evaluation_results.json)):

| Metric | Measured Result | Target | Status |
| :--- | :--- | :--- | :--- |
| **Neural CF Test RMSE** *(5,410 test samples)* | **0.1818** *(MAE: 0.0818)* | `< 0.80` | ✅ Passed |
| **Intra-list Diversity** | **0.6978** | `0.30 – 0.70` | ✅ Passed |
| **ML Inference Latency (Python)** | **65.78 ms** | `< 150 ms` | ✅ Passed |

---

## 🛠️ Tech Stack

- **Machine Learning & Data**: Python 3.11, PyTorch, scikit-learn, pandas, NumPy, FastAPI, Uvicorn, Pydantic
- **API Gateway & Database**: Node.js, Express v5, SQLite (`better-sqlite3`), JWT (`jsonwebtoken`), `bcryptjs`, Helmet, `express-rate-limit`
- **Frontend**: React 19, Vite, Axios, Lucide Icons, CSS Glassmorphism
- **Deployment**: Single-container / unified Render Web Service deployment

---

## 📁 Project Structure

```text
M2M/
├── ml_service/                     # Python FastAPI ML microservice
│   ├── main.py                     # FastAPI app, startup model loading & endpoints
│   ├── .env.example
│   └── src/
│       ├── preprocessing.py        # Data cleaning & 13-feature engineering pipeline
│       ├── content_based.py        # ContentBasedRecommender & LazySimilarityMatrix
│       ├── collaborative_filtering.py # PyTorch NeuralCF architecture & trainer
│       ├── mood_encoder.py         # Mood presets, keyword NLP & slider blending
│       ├── hybrid_recommender.py   # Multi-signal hybrid scoring & dynamic weights
│       ├── explainer.py            # Per-track natural-language explainability layer
│       └── generate_users.py       # Synthetic interaction generator for CF training
├── backend-node/                   # Node.js Express API gateway
│   ├── app.js                      # Express v5 app, Helmet, rate limiter & SPA serving
│   ├── server.js                   # Server entrypoint
│   ├── .env.example
│   └── src/
│       ├── db/database.js          # SQLite WAL initialization & schema
│       ├── middleware/             # JWT verification & express-rate-limit
│       ├── routes/                 # auth, recommend, songs, users endpoints
│       ├── services/mlService.js   # Axios ML client with cold-start retry wrapper
│       └── constants/genres.js     # Fallback genre & mood catalog
├── frontend/                       # React + Vite web application
│   └── src/
│       ├── api/api.js              # Axios client with JWT bearer interceptor
│       ├── components/             # MoodSelector, SliderPanel, GenreFilter, LikedSongSearch, SongCard, LoginForm
│       ├── pages/                  # Home, Login
│       └── constants/              # Default genres & audio slider configs
├── train/                          # Model training & evaluation scripts
│   ├── train_cbf.py                # Cleans dataset & builds CBF model
│   ├── train_cf.py                 # Generates interactions & trains PyTorch NeuralCF
│   └── evaluate_metrics.py         # Computes RMSE, diversity & latency benchmarks
├── notebooks/                      # EDA & evaluation Jupyter notebooks
├── data/                           # Raw/processed CSVs, EDA plots & evaluation JSON
├── models/                         # Saved cbf_model.pkl & cf_model.pth checkpoints
├── requirements.txt                # Production Python dependencies (CPU PyTorch)
├── .python-version                 # Pins Python 3.11.9 for cloud builds
└── start_all.ps1                   # Launches all 3 services concurrently on Windows
```

---

## 🚀 Local Development Setup

### Prerequisites
- **Python 3.11** (virtual environment)
- **Node.js 18+** & `npm`

### 1. Clone & Configure Environment
```bash
git clone https://github.com/Yajat-kanaskar05/Mood-to-Music-AI.git
cd Mood-to-Music-AI
```

Create `.env` files from the provided templates:
- `backend-node/.env` (see `backend-node/.env.example`):
  ```env
  PORT=4000
  ML_SERVICE_URL=http://127.0.0.1:8000
  JWT_SECRET=your_jwt_secret_key_here
  DATABASE_PATH=../data/app.db
  NODE_ENV=development
  ```
- `ml_service/.env` (see `ml_service/.env.example`):
  ```env
  PORT=8000
  DATA_PATH=../data/processed/songs_clean.csv
  MODELS_PATH=../models
  ```

### 2. Install Dependencies
```bash
# Python environment
python -m venv venv
venv\Scripts\activate        # On macOS/Linux: source venv/bin/activate
pip install -r requirements.txt

# Node.js backend
cd backend-node && npm install && cd ..

# React frontend
cd frontend && npm install && cd ..
```

### 3. Train Models *(Optional if models already exist in `models/`)*
Download the [Spotify Tracks Dataset](https://www.kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset) into `data/raw/dataset.csv`, then run:
```bash
python train/train_cbf.py
python train/train_cf.py
python train/evaluate_metrics.py
```

### 4. Run All Services
**Windows PowerShell (one-click):**
```powershell
.\start_all.ps1
```

**Or run in three separate terminals:**
```bash
# Terminal 1 — Python ML Service (Port 8000)
python ml_service/main.py

# Terminal 2 — Node.js Gateway (Port 4000)
cd backend-node && npm run dev

# Terminal 3 — React UI (Port 3000)
cd frontend && npm run dev
```

Open `http://localhost:3000` (API Swagger docs for FastAPI are available at `http://localhost:8000/docs`).

---

## ☁️ Deployment (Single-Service Render Setup)

This project is configured to run as **one unified Web Service** on Render (Node.js serves the compiled React frontend at `/` and communicates internally with FastAPI over `127.0.0.1:8000`):

- **Runtime**: `Python 3` (uses `.python-version` $\rightarrow$ `3.11.9`)
- **Build Command**:
  ```bash
  pip install -r requirements.txt && cd frontend && npm install && npm run build && cd ../backend-node && npm install
  ```
- **Start Command**:
  ```bash
  uvicorn ml_service.main:app --host 127.0.0.1 --port 8000 & cd backend-node && node server.js
  ```
- **Required Environment Variables**:
  - `NODE_ENV=production`
  - `PORT=10000`
  - `JWT_SECRET=<your-secret>`
  - `DATABASE_PATH=./data/app.db`
  - `ML_SERVICE_URL=http://127.0.0.1:8000`
  - `DATA_PATH=data/processed/songs_clean.csv`
  - `MODELS_PATH=models`

---

## 🔌 API Reference

### Node.js Gateway (`/api/*`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user and issue JWT |
| `POST` | `/api/auth/login` | Authenticate user and issue JWT |
| `POST` | `/api/recommend` | Generate hybrid recommendations *(auto-loads user history if signed in)* |
| `GET` | `/api/songs/search?q=` | Search catalog by track title or artist |
| `GET` | `/api/songs/moods` | List available mood presets |
| `GET` | `/api/songs/genres` | List available genres |
| `GET/POST/DELETE` | `/api/users/history` | View, save, or delete tracks from user listening history *(JWT required)* |

### Python ML Microservice (`:8000`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Returns status and indexed track count |
| `POST` | `/recommend` | Executes hybrid CBF + Neural CF + Mood ranking + Explainer |
| `GET` | `/search` | Queries song DataFrame |
| `GET` | `/moods` / `/genres` | Returns mood profiles and unique track genres |

