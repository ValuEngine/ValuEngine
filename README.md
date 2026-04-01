# ValuEngine

## Stack
- Frontend : Next.js 14 + Tailwind + Recharts + Clerk
- Backend : FastAPI + yfinance + Claude Haiku

## Dev local

Backend :
```bash
cd backend && source venv/bin/activate && uvicorn main:app --reload
```

Frontend :
```bash
cd frontend && npm run dev
```

## Variables d'environnement

**backend/.env**
```
ANTHROPIC_API_KEY=...
FRONTEND_URL=http://localhost:3000
```

**frontend/.env.local**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

## Déploiement

- Backend : Railway (Procfile inclus, runtime.txt Python 3.11.9)
- Frontend : Vercel (vercel.json inclus)

Sur Railway, ajouter les variables `ANTHROPIC_API_KEY` et `FRONTEND_URL` dans les settings.
Sur Vercel, ajouter toutes les variables `NEXT_PUBLIC_*` et `CLERK_SECRET_KEY`, plus `NEXT_PUBLIC_API_URL` pointant vers l'URL Railway.
