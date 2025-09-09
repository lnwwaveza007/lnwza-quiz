Lnwza Quiz — Generate and take quizzes from PDFs using Gemini.

## Setup

1. Install deps:
   - pnpm install
2. Env vars:
   - Create `.env.local` with `GEMINI_API_KEY=...`
   - Optional: `USE_MOCK_GEMINI=true` for offline deterministic generation
3. Seed local data files:
   - pnpm run seed
4. Dev:
   - pnpm dev

## Scripts

- dev, build, start
- lint, format
- seed (creates `/data/quizzes.json` and `/data/results.json`)
- test (Vitest)

## Storage

- Server: file-based JSON under `/data` (Node fs)
- Browser fallback: IndexedDB via `idb`

## Notes

- Evidence validation enforces verbatim/near-verbatim quotes on cited pages
- If Gemini key is missing or `USE_MOCK_GEMINI=true`, mock generator is used
"# lnwza-quiz" 
