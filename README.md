# InsightFlow

A MERN web app for CSV analytics: upload a CSV, explore it, chart it, save reports, and export results. Every number comes from the file you upload. There is no sample data and no AI.

## Features

- **CSV import:** drag-and-drop or file picker, file type and size checks, header validation (empty or duplicate names), malformed-row handling, 10-row preview, automatic column types (numeric, categorical, date, text), replace or delete a dataset.
- **Analytics:** row and column counts, missing values (count and %), numeric mean, median, min, max and distribution, category frequencies, date ranges.
- **Explorer:** search across all columns, column filters (equals, contains, ≥, ≤), sortable and paginated table.
- **Charts:** bar, line and area charts for any column (distribution, top values, rows per month). They update with search and filters.
- **Reports:** save a report of the rows currently shown, with scope, rule-based observations, charts and per-column statistics. Reopen or delete reports later. Print to PDF from the browser.
- **Export:** download the filtered rows as CSV (spreadsheet formula injection is neutralized).

## Architecture

```
React (Vite, TS, Tailwind)  --JSON/HTTPS-->  Express API  -->  MongoDB Atlas
 parses and analyzes CSV in the browser       validates      Dataset, RowChunk, Report
```

- The CSV is parsed in the browser (Papa Parse), validated, and sent to the API as JSON. No server-side file uploads, so no Multer.
- Rows are sent as arrays of cells in column order, so odd header names never become MongoDB field names.
- Rows are stored in 500-row `RowChunk` documents, so a dataset never approaches MongoDB's 16 MB document limit.
- The API validates every request with Zod, sets security headers (Helmet), rate-limits, caps request size, and returns consistent JSON errors.

## Project structure

```
backend/
  src/app.js              Express app: middleware, routes, error handling
  src/server.js           connects to MongoDB and starts the server
  src/models/index.js     Dataset, RowChunk, Report schemas and limits
  src/routes/api.js       REST endpoints and Zod validation
  src/middleware/error.js centralized error handler
  src/__tests__/          API validation tests (node:test)
frontend/
  src/lib/analyze.ts      CSV parsing, type detection, statistics, filters, export
  src/lib/api.ts          typed API client
  src/components/         CsvImport, DataTable, ChartPanel, ReportCharts
  src/pages/              Landing, Workspace, Dataset, Reports, ReportView
  src/lib/analyze.test.ts Vitest unit tests
```

## Limits

5 MB per file, 50,000 rows, 100 columns, 12 MB request body, 120 API requests per minute per IP. Change them in `frontend/src/lib/analyze.ts` (`LIMITS`) and `backend/src/models/index.js` (`LIMITS`), and keep the two in sync.

## API (`/api`)

All routes except `/health` and `/auth/*` need an `Authorization: Bearer <token>` header. Each user only sees their own datasets and reports.

| Method | Path | Purpose |
|---|---|---|
| POST | /auth/register | create an account (`email`, `password` 8-72 chars), returns a token |
| POST | /auth/login | sign in, returns a token |
| GET | /health | health check (public) |
| GET | /datasets | list datasets (metadata and statistics) |
| POST | /datasets | create a dataset (`name`, `columns`, `rows` as arrays, `stats`) |
| GET | /datasets/:id | one dataset's metadata |
| GET | /datasets/:id/rows | all rows (arrays, column order) |
| DELETE | /datasets/:id | delete a dataset, its rows and its reports |
| GET | /reports | list reports (`?datasetId=` optional) |
| POST | /reports | create a report |
| GET | /reports/:id | one report |
| DELETE | /reports/:id | delete a report |

Status codes: 200, 201, 204, 400 (validation), 404, 413 (too large), 429 (rate limit), 500.

## Setup

Requires Node.js 18 or newer and a MongoDB Atlas cluster.

### 1. Database (MongoDB Atlas)

1. Create a free cluster at cloud.mongodb.com.
2. Database Access: create a user with a password.
3. Network Access: add your IP address. For deployed hosts, add the host's addresses (or `0.0.0.0/0` if you accept the wider exposure).
4. Connect, then Drivers: copy the connection string and add a database name, e.g. `...mongodb.net/insightflow`.

Collections and indexes are created automatically on first use.

### 2. Backend

```
cd backend
npm install
copy .env.example .env        (macOS/Linux: cp .env.example .env)
npm run dev
```

Edit `.env`:

| Variable | Purpose |
|---|---|
| MONGODB_URI | Atlas connection string (server only, never in the frontend) |
| PORT | API port, default 4000 |
| CORS_ORIGIN | allowed frontend origin(s), comma-separated, e.g. `http://localhost:5173` |
| JWT_SECRET | random string, 32+ characters, used to sign login tokens. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |

### 3. Frontend

```
cd frontend
npm install
copy .env.example .env
npm run dev
```

| Variable | Purpose |
|---|---|
| VITE_API_URL | public API URL, default `http://localhost:4000/api` (no secrets in frontend variables) |

Open http://localhost:5173.

## How to create a report

Import a CSV in **Workspace**, click the dataset's name, optionally search or filter, enter a title under "Save a report", and click **Create report**. Use **Print / Save as PDF** on the report page. Saved reports are under **Reports**.

## Testing

```
cd backend  && npm test     # request validation and error handling (no database needed)
cd frontend && npm test     # CSV parsing, statistics, filtering, chart data, export
cd frontend && npm run build   # type-check and production build
```

Not covered by automated tests: MongoDB operations, UI components, and end-to-end flows.

## Deployment

**Frontend (Vercel):** import the repository, set the root directory to `frontend`, add `VITE_API_URL` (your deployed API URL ending in `/api`), deploy. `vercel.json` handles client-side routing.

**Backend (Render or Railway):** root directory `backend`, build command `npm install`, start command `npm start`, and the environment variables `MONGODB_URI` and `CORS_ORIGIN` (your Vercel URL). Allow the host in Atlas Network Access.

The API is a persistent Express server. If you must deploy on Vercel alone, the backend needs adapting to serverless functions.

## Troubleshooting

- **"Network error: is the API reachable?"** The backend isn't running, `VITE_API_URL` is wrong, or `CORS_ORIGIN` doesn't match the frontend's address. Check the backend terminal for errors.
- **Backend exits with "MONGODB_URI is required"** or can't connect: check `.env` and Atlas Network Access.
- **File rejected:** check the limits above; the message says which limit was hit.

## Known limitations

- Reopened reports show saved statistics, not live data.
- All rows of a dataset load into the browser (fine within the row limit).
