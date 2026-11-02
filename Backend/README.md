# CampusLoop AI — Backend Starter

A small FastAPI backend for a campus item borrowing/return platform. The starter includes:
- FastAPI health endpoint
- Basic registration/login with JWT
- SQLAlchemy models for users, items, and borrow requests
- LangGraph supervisor routing to Discovery, Lending, Policy, and General agents
- Database-backed available-item search tool

## 1. Setup

```bash
python -m venv venv
```

Windows PowerShell:
```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Copy `.env.example` to `.env`, then add your Groq API key. The default database is local SQLite to make the first run easy. PostgreSQL can be configured later via `DATABASE_URL`.

## 2. Run

```bash
uvicorn main:app --reload
```

Open `http://127.0.0.1:8000/docs` for API documentation and `http://127.0.0.1:8000/health` for a health check.

## 3. Current endpoints

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/assistant/chat`

## Important current limitations

- This is the first backend scaffold, not a complete borrowing marketplace.
- Item CRUD, borrow request creation/approval, return confirmation, credit ledger, institute email verification, and admin endpoints are not implemented yet.
- The assistant never confirms a reservation; those operations will be added as validated backend tools in later steps.
- Configure a strong `JWT_SECRET_KEY` and use PostgreSQL plus database migrations before production.
