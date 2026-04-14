# HPC AI Learning Platform

A full-stack learning platform for **AI Platform Engineers** with **HPC (High-Performance Computing)** understanding. This platform guides learners practically from beginner fundamentals to professional-level expertise.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.9+-green.svg)
![React](https://img.shields.io/badge/react-18-blue.svg)

## What You'll Learn

The curriculum covers 6 progressive modules across 4 skill levels:

### Beginner
1. **Computing Foundations** — Linux, Python for infra, networking, Git, shell scripting
2. **HPC Architecture & Operations** — Cluster architecture, SLURM, MPI, storage systems, benchmarking

### Intermediate
3. **Containers & Orchestration** — Docker, Singularity/Apptainer, Kubernetes, GPU scheduling, Helm
4. **AI/ML Infrastructure** — GPU computing, CUDA, distributed training, data pipelines, MLflow

### Advanced
5. **AI Platform Engineering** — Terraform, MLOps, model serving (Triton/TorchServe), monitoring, Ray/Dask

### Professional
6. **Professional Mastery** — Multi-cluster management, FinOps, security, performance tuning, architecture design

## Features

- **Interactive lessons** with rich markdown content, code examples, and diagrams
- **Hands-on exercises** — quizzes, coding challenges, labs, and capstone projects
- **Progress tracking** — per-module completion, skill radar chart, learning streaks
- **Personalized learning path** — prerequisites unlock progressively
- **Hint system** — graduated hints for exercises to guide without giving away answers
- **Skill assessment** — radar chart visualization of competency areas
- **Dark theme UI** — modern, distraction-free learning environment

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend  | React 18, Vite, Recharts, React Markdown |
| Backend   | Python, FastAPI, Pydantic |
| Auth      | JWT (python-jose) |
| Content   | YAML-based curriculum with Markdown lessons |

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs at `http://localhost:5173` and proxies API requests to the backend at `http://localhost:8000`.

## Project Structure

```
hpc-ai-learning/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── models/
│   │   │   ├── schemas.py       # Pydantic models
│   │   │   └── database.py      # In-memory data store
│   │   ├── routes/
│   │   │   ├── auth.py          # Authentication endpoints
│   │   │   ├── modules.py       # Curriculum module endpoints
│   │   │   └── progress.py      # Progress tracking endpoints
│   │   ├── services/
│   │   │   ├── curriculum_loader.py  # YAML curriculum parser
│   │   │   └── exercise_evaluator.py # Exercise grading engine
│   │   └── curriculum/          # YAML course content
│   │       ├── 01_foundations.yaml
│   │       ├── 02_hpc_fundamentals.yaml
│   │       ├── 03_containers_orchestration.yaml
│   │       ├── 04_ai_ml_infrastructure.yaml
│   │       ├── 05_platform_engineering.yaml
│   │       └── 06_professional_mastery.yaml
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── pages/               # Dashboard, Modules, Lessons, etc.
│   │   ├── components/          # Sidebar, ProgressBar, ExercisePanel
│   │   ├── utils/               # API client, Auth context
│   │   └── styles/              # Global CSS
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in, get JWT |
| GET  | `/api/auth/me` | Get current user |

### Modules & Lessons
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/modules` | List all modules |
| GET | `/api/modules/{id}` | Module detail with lessons |
| GET | `/api/modules/{id}/lessons/{lesson_id}` | Full lesson content |

### Progress
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/progress` | Dashboard stats |
| GET  | `/api/progress/{module_id}` | Module progress |
| POST | `/api/progress/{module_id}/lessons/{lesson_id}/complete` | Mark lesson done |
| POST | `/api/exercises/{exercise_id}/submit` | Submit exercise |
| GET  | `/api/learning-path` | Personalized path |

## Curriculum Design Philosophy

This platform follows a **practical-first** approach:

1. **Learn by doing** — Every lesson includes hands-on exercises with real commands and code
2. **Progressive complexity** — Each module builds on the previous, with prerequisites enforced
3. **Industry-aligned** — Content mirrors actual AI platform engineering workflows at scale
4. **HPC + Cloud convergence** — Bridges traditional HPC and modern cloud-native AI infrastructure

## Contributing

Contributions welcome! To add or improve curriculum content:

1. Edit YAML files in `backend/app/curriculum/`
2. Follow the existing lesson structure (objectives, content_md, exercises)
3. Ensure exercises have proper solutions and hints
4. Submit a PR

## License

MIT License — see [LICENSE](LICENSE) for details.
