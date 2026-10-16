# InsightFlow (work in progress)

CSV upload, analysis, report and export. MERN, no AI features.

## Status
Done: backend API (Express + Mongoose + Zod), chunked row storage, frontend analytics engine (`frontend/src/lib/analyze.ts`), API client.
Stage 1 done: Vite + React + TS + Tailwind scaffold, landing page, workspace with CSV drag-and-drop import (validation, type detection, preview, name form), dataset list and delete, vercel.json.
Stage 2 done: dataset page with summary cards, search, add/remove filters, sortable paginated table, bar/line/area charts (histogram, top categories, monthly counts) that update with filters, and filtered CSV export.
Stage 3 done: create a report from the filtered rows (title, scope, rule-based observations, per-column statistics), saved reports list, reopen and delete, print-ready page (browser Print / Save as PDF).
Stage 4 done: tests written (not yet run).
Also done: rows are stored as arrays in column order (so odd header names like `a.b` or `$x` can't break MongoDB), Replace dataset (new data is imported before the old is removed), and charts on the report page.
Not built yet: shadcn/ui (plain Tailwind components are used instead).
**Nothing here has been installed, run or tested.**

## Testing
- Frontend: `cd frontend && npm test` (Vitest: CSV parsing, type detection, statistics, filtering, chart data, CSV export).
- Backend: `cd backend && npm test` (node:test: request validation, 404/400/413 handling; no database needed).
- Not covered yet: MongoDB operations (add `mongodb-memory-server` for create/list/delete/cascade tests) and UI component tests.
- Before deploying run: `npm run build` in `frontend/` (includes the type-check).

## Limits
5 MB file, 50,000 rows, 100 columns, 12 MB JSON body. Rows are stored in 500-row chunks (`RowChunk`), so no document nears Mongo's 16 MB cap.

## API (`/api`)
POST /datasets takes `rows` as arrays of cells in `columns` order.
GET /health; GET, POST /datasets; GET, DELETE /datasets/:id; GET /datasets/:id/rows; GET, POST /reports; GET, DELETE /reports/:id

## Backend setup
cd backend && npm i && cp .env.example .env (set MONGODB_URI) && npm run dev

Render/Railway: build `npm i`, start `npm start`, env MONGODB_URI and CORS_ORIGIN (your Vercel URL). Allow the host in Atlas Network Access.

## Frontend
cd frontend && npm i && cp .env.example .env && npm run dev. Env: VITE_API_URL (public URL only, no secrets). Deploy on Vercel (root directory `frontend`).
