# MoreChats

Hybrid-automated Reddit outreach system with AI-powered messaging and a web dashboard. Discovers, analyzes, and crafts personalized messages for leads across 6 interaction categories.

## Quick Start

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Environment Variables

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Run Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## API Docs

Once the backend is running, visit `http://localhost:8000/docs` for the interactive API documentation.

## Architecture

- **Backend**: Python + FastAPI
- **Reddit**: PRAW
- **AI**: Google Gemini (free tier)
- **Frontend**: Next.js 14 + Tailwind CSS + shadcn/ui
- **Database**: SQLite
- **Scheduler**: APScheduler

## Persona

Built around "The Quiet Storm" archetype -- quiet confidence, depth, observational humor, mystery.

- Reddit: `u/I_exist`
