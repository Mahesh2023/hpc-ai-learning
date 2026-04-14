# HPC AI Learning Platform

A full-stack, production-ready interactive learning platform for **AI Platform Engineering with HPC**, taking you from Linux fundamentals to enterprise-scale AI infrastructure.

## Features

| Feature | Description |
|---------|-------------|
| **Structured Curriculum** | 6 modules, 30 lessons, 90+ exercises (beginner → professional) |
| **Interactive Code Editor** | Monaco Editor with syntax highlighting for Python, Bash, YAML |
| **Sandboxed Code Runner** | Execute Python and Bash code safely with resource limits |
| **In-Browser Terminal** | Full Linux terminal via WebSocket + xterm.js |
| **Progress Tracking** | Persistent SQLite database tracks lessons, exercises, and scores |
| **Learning Path** | Visual timeline with prerequisites and completion status |
| **Dark Theme UI** | Professional dark theme with responsive design |
| **Docker Deployment** | Single `docker compose up` to deploy everything |

## Quick Start

### Option 1: Docker (recommended)

```bash
# Clone the repository
git clone https://github.com/Mahesh2023/hpc-ai-learning.git
cd hpc-ai-learning

# Copy and edit environment config
cp .env.example .env
# Edit .env — at minimum, change HPCAI_SECRET_KEY

# Start everything
docker compose up -d --build

# Open http://localhost in your browser
```

### Option 2: Local Development

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### Option 3: Makefile shortcuts

```bash
make install   # Install all dependencies
make dev       # Start backend + frontend for development
make up        # Docker compose up
make down      # Docker compose down
make logs      # Tail logs
make secret    # Generate a JWT secret key
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                       │
│  React 18 + Vite + Monaco Editor + xterm.js     │
└──────────────┬──────────────┬───────────────────┘
               │ HTTP/REST    │ WebSocket
               ▼              ▼
┌──────────────────────────────────────────────────┐
│              Nginx (port 80)                     │
│  Static files  │  /api/* proxy  │  /ws/* proxy   │
└───────────────────────┬──────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│         FastAPI Backend (port 8000)              │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐ │
│  │   Auth   │  │ Modules  │  │   Progress     │ │
│  │  (JWT)   │  │ (YAML)   │  │  (SQLite)      │ │
│  └──────────┘  └──────────┘  └────────────────┘ │
│  ┌──────────┐  ┌────────────────────────────────┐│
│  │ Sandbox  │  │  Terminal (WebSocket + pty)    ││
│  │ (Python/ │  │  Full Linux shell in browser   ││
│  │  Bash)   │  │                                ││
│  └──────────┘  └────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

## Curriculum

| # | Module | Level | Hours | Topics |
|---|--------|-------|-------|--------|
| 1 | Computing Foundations | Beginner | 12 | Linux, Python, networking, Git, shell scripting |
| 2 | HPC Architecture & Operations | Beginner | 15 | Cluster architecture, SLURM, MPI, storage, benchmarking |
| 3 | Containers & Orchestration | Intermediate | 18 | Docker, Singularity, Kubernetes, GPU scheduling, Helm |
| 4 | AI/ML Infrastructure | Intermediate | 20 | GPU computing, CUDA, distributed training, MLflow |
| 5 | AI Platform Engineering | Advanced | 22 | Terraform, MLOps, model serving, monitoring, Ray/Dask |
| 6 | Professional Mastery | Professional | 25 | Multi-cluster, FinOps, security, performance tuning |

**Total: 112 hours of structured learning content**

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/auth/me` | Current user info |
| GET | `/api/modules` | List all modules |
| GET | `/api/modules/:id` | Module detail + lessons |
| GET | `/api/modules/:id/lessons/:id` | Lesson content + exercises |
| GET | `/api/progress` | Dashboard stats |
| GET | `/api/progress/:module_id` | Module progress |
| POST | `/api/progress/:module_id/lessons/:id/complete` | Mark lesson done |
| POST | `/api/exercises/:id/submit` | Submit exercise answer |
| POST | `/api/sandbox/run` | Execute code (Python/Bash) |
| GET | `/api/sandbox/templates` | Starter code templates |
| GET | `/api/health` | Health check |
| WS | `/ws/terminal` | Interactive terminal |

## Project Structure

```
hpc-ai-learning/
├── docker-compose.yml          # One-command deployment
├── Makefile                    # Dev & deployment shortcuts
├── .env.example                # Environment configuration template
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── config.py           # Environment-based settings
│       ├── main.py             # FastAPI app + lifespan
│       ├── models/
│       │   ├── database.py     # SQLAlchemy + SQLite persistence
│       │   └── schemas.py      # Pydantic models
│       ├── routes/
│       │   ├── auth.py         # JWT authentication
│       │   ├── modules.py      # Curriculum endpoints
│       │   ├── progress.py     # Progress tracking
│       │   ├── sandbox.py      # Code execution API
│       │   └── terminal.py     # WebSocket terminal
│       ├── services/
│       │   ├── code_runner.py  # Sandboxed execution (resource limits)
│       │   ├── curriculum_loader.py
│       │   └── exercise_evaluator.py
│       └── curriculum/         # 6 YAML module files
│
└── frontend/
    ├── Dockerfile              # Multi-stage (Node build → Nginx)
    ├── nginx.conf              # Production reverse proxy config
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── CodeEditor.jsx  # Monaco + fallback textarea
        │   ├── Terminal.jsx    # xterm.js + WebSocket
        │   ├── ExercisePanel.jsx
        │   ├── ProgressBar.jsx
        │   └── Sidebar.jsx
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── ModuleList.jsx
        │   ├── ModuleDetail.jsx
        │   ├── LessonViewer.jsx
        │   ├── LearningPath.jsx
        │   ├── Sandbox.jsx     # Code playground + terminal
        │   ├── Login.jsx
        │   └── Register.jsx
        ├── utils/
        │   ├── api.js          # API client + demo fallback data
        │   └── auth.jsx        # Auth context + JWT management
        └── styles/
            └── global.css
```

## Configuration

All settings are controlled via environment variables (prefix `HPCAI_`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `80` | Port for the web interface |
| `HPCAI_SECRET_KEY` | (insecure default) | JWT signing key — **change in production** |
| `HPCAI_DATABASE_URL` | `sqlite:///data/hpcai.db` | Database connection string |
| `HPCAI_SANDBOX_ENABLED` | `true` | Enable code execution |
| `HPCAI_TERMINAL_ENABLED` | `true` | Enable in-browser terminal |
| `HPCAI_SANDBOX_TIMEOUT` | `30` | Max execution time (seconds) |
| `HPCAI_CORS_ORIGINS` | `localhost` variants | Allowed CORS origins |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Monaco Editor, xterm.js, Recharts |
| Backend | FastAPI, SQLAlchemy, Gunicorn, WebSockets |
| Database | SQLite (file-based, zero config) |
| Deployment | Docker, Docker Compose, Nginx |
| Security | JWT auth, bcrypt passwords, sandboxed execution |

## License

MIT
