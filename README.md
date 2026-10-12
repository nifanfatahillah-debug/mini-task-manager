# Mini Task Manager — Qonflo AI Take-Home

Internal task board with an **immutable, chronological audit log** for every status change.
Full-stack TypeScript: React (Vite) + Express, JSON-file persistence. No auth, no overengineering.

## Features (mapped to the brief)

- [x] **Tasks** — create, list, update status, delete
- [x] **Strict status flow** — `to_do → pending → in_progress → done`, exactly one step forward enforced in the backend
- [x] **Audit log per task** — who (`actor` from a hardcoded dropdown), from → to, server timestamp, chronological order
- [x] **Immutable log** — no update/delete endpoint for logs; append-only store
- [x] **Idempotent update** — same-status PUT returns 200 with no new log
- [x] **Consistent** — status change + log append + file write happen in one synchronous step
- [x] **Persistent** — `server/db.json` (auto-created, git-ignored)
- [x] **Kanban UI** — 4 columns, cards move automatically, expandable history per card

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node.js + Express 4 + TypeScript (`tsx` for dev) |
| Persistence | `server/db.json` (single-writer, sync write) |

## Project structure

```
.
├── client/                 # React + TS (Vite, port 5173)
│   └── src/
│       ├── App.tsx         # kanban board + all UI actions
│       ├── api.ts          # the ONLY place that calls the backend
│       ├── types.ts        # mirrors server domain types
│       └── main.tsx        # React mount point
├── server/                 # Express + TS (port 3001)
│   └── src/
│       ├── index.ts        # bootstrap: CORS, JSON, routes, listen
│       ├── routes.ts       # 5 endpoints + all domain validation
│       ├── store.ts        # the ONLY reader/writer of db.json
│       └── types.ts        # Status, Task, AuditLog, transition helpers
├── docs/                   # PRD, architecture, API contract, ADRs, test plan
└── README.md
```

## Prerequisites

- **Node.js 18+** (`node -v` to check)
- **npm** (comes with Node)
- No database, no env file, no other setup.

## Quick start

```bash
# 1. Backend — http://localhost:3001
cd server
npm install
npm run dev        # tsx watch mode; leaves db.json in server/

# 2. Frontend — open a SECOND terminal
cd client
npm install
npm run dev        # Vite dev server
```

Open **http://localhost:5173** (or http://127.0.0.1:5173 — both are CORS-allowed).
Create a task → it lands in **To Do** → **Move to Pending** → **View history** to see the audit entry.

> `server/db.json` is created automatically on first run and is git-ignored, so every clone starts empty.

## Scripts

| Where | Command | What it does |
|---|---|---|
| `server/` | `npm run dev` | Start API with `tsx` (hot reload), port 3001 |
| `server/` | `npm run build` | Type-check + emit to `dist/` |
| `server/` | `npm start` | Run compiled output (`node dist/index.js`) |
| `client/` | `npm run dev` | Start Vite dev server, port 5173 |
| `client/` | `npm run build` | Type-check (`tsc --noEmit`) + production bundle |

## API reference

Base URL: `http://localhost:3001`. All timestamps are ISO-8601 UTC from the server.

| Method & path | Body | Success | Errors |
|---|---|---|---|
| `GET /tasks` | — | `200` task array (newest first) | — |
| `POST /tasks` | `{ "title": "…", "description?": "…" }` | `201` new task (`status: "to_do"`) | `400` title missing / empty / > 200 chars |
| `PUT /tasks/:id/status` | `{ "toStatus": "pending", "actor": "john.doe" }` | `200` `{ task, audit }` · same-status → `200` `{ task, audit: null, idempotent: true }` | `404` task missing · `400` unknown status / unknown actor / skip or backward transition |
| `DELETE /tasks/:id` | — | `200` `{ deleted: id }` (logs retained on disk) | `404` task missing |
| `GET /tasks/:id/audit-logs` | — | `200` log array, oldest first | `404` task missing |

Example audit entry:

```json
{
  "id": "a_xyz",
  "taskId": "t_abc",
  "actor": "john.doe",
  "fromStatus": "pending",
  "toStatus": "in_progress",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

Actors (hardcoded per spec, chosen via dropdown): `john.doe`, `jane.smith`, `admin`.

## Status rules

```
to_do ──▶ pending ──▶ in_progress ──▶ done
```

- Exactly **one step forward**; skip or backward → `400` with the allowed next status in the message.
- Same-status update → `200`, **no new log** (idempotent, safe for retries / double-clicks).
- Create does **not** write a log (only status changes do — see `docs/05-ADRS.md`, ADR-002).
- Delete removes the task but **retains** its log rows on disk (ADR-003).

## Configuration

| Item | Value | Where to change |
|---|---|---|
| Backend port | `3001` | `server/src/index.ts` (`PORT`) |
| Frontend port | `5173` | `client/vite.config.ts` + run flag |
| CORS origins | `http://localhost:5173`, `http://127.0.0.1:5173` | `server/src/index.ts` |
| Actors | `john.doe`, `jane.smith`, `admin` | `server/src/types.ts` (`ACTORS`) + `client/src/types.ts` |
| Data file | `server/db.json` | `server/src/store.ts` (`DB_FILE`) |

## Smoke test (3 minutes)

```bash
# create
curl -X POST http://localhost:3001/tasks -H "Content-Type: application/json" \
  -d '{"title":"Prepare Invoice"}'
# → copy the id, then (replace $ID):

# skip must fail
curl -X PUT http://localhost:3001/tasks/$ID/status -H "Content-Type: application/json" \
  -d '{"toStatus":"done","actor":"john.doe"}'                     # expect 400

# valid step
curl -X PUT http://localhost:3001/tasks/$ID/status -H "Content-Type: application/json" \
  -d '{"toStatus":"pending","actor":"john.doe"}'                  # expect 200 + audit

# idempotent retry — no new log
curl -X PUT http://localhost:3001/tasks/$ID/status -H "Content-Type: application/json" \
  -d '{"toStatus":"pending","actor":"john.doe"}'                  # expect idempotent:true

# history — expect 1 entry, chronological
curl http://localhost:3001/tasks/$ID/audit-logs
```

Full 12-case plan: `docs/06-EDGE-CASES-TESTPLAN.md`.

## Troubleshooting

| Symptom | Cause → fix |
|---|---|
| `Failed to fetch` in the browser | You opened the UI on a host not in CORS origins — use `http://localhost:5173` or `http://127.0.0.1:5173` |
| `EADDRINUSE :::3001` | A previous server is still running — stop the old terminal or kill the PID holding port 3001 |
| Empty list after restart | Normal if `server/db.json` was deleted; otherwise check the backend terminal for `[store] db.json unreadable` |
| `title is required` on Add | Title is mandatory, 1–200 chars; description is optional |

## Assumptions

1. **Create does not write a log** — only status changes do (ADR-002; a `CREATE` log could be added without breaking the schema).
2. **Delete retains log rows** on disk but no longer exposes them via the API (ADR-003).
3. **Actor = hardcoded dropdown**, not auth — per "no overengineering".
4. **Timestamps always come from the server**; the client cannot send one.
5. **Single-user/demo load** — a JSON file suffices because the spec allows it.

## Trade-offs

| Decision | Why | Cost |
|---|---|---|
| JSON file, not a DB | Zero setup, reviewer runs in < 5 min | No concurrent-write safety |
| Synchronous `writeFileSync` | Task + log persist atomically, no lock needed | Blocks the loop ~ms; unsuitable at scale |
| Idempotency via early-return | Enough for a 4-status domain | Documented limit vs. `Idempotency-Key` |
| Kanban columns + buttons, no drag-and-drop | Familiar Trello feel, zero new deps/edge cases | Less "wow" (deliberate; see ADR-007) |
| No ORM / auth / test framework | Small domain; explicit code is easier to explain | Manual validation |

## If there were more time

1. Migrate persistence to SQLite (only `store.ts` changes; API/UI untouched).
2. Soft-delete tasks so deleted-task logs stay auditable.
3. Automated tests for the 12 edge cases.
4. Pagination + status filter on `GET /tasks`.

## Required answers

### 1. How do you ensure the audit log cannot be modified?

Three layers: **(a) by construction** — there is no PUT/PATCH/DELETE route for logs, so no API path can change them; **(b) single writer** — the only code touching the `logs` array is `applyStatusChange` (append) plus `load`/`save` (verify with `grep -rn "logs" server/src`); **(c) server timestamps** — the client never sends time, so ordering cannot be forged. Honest limit: the JSON file itself is editable on disk — production would need a DB with read-only log permissions + a hash chain.

### 2. What is riskiest with many concurrent users?

`store.ts` — file read/write with no lock. Two simultaneous PUTs can overwrite each other (lost update) or misorder logs. Next: no real auth, so `actor` is only a claim.

### 3. What would you refactor first as the system grows, and why?

Persistence (`store.ts` → SQLite/Postgres with transactions) — it is the only part whose single-writer assumption breaks first under load, and its interface is already isolated so the API and UI would not change.

### 4. Which parts did AI help with, and how did you validate them?

AI helped with initial scaffolding (folder layout, Vite/Express boilerplate) and document drafts. All domain logic (state machine, idempotency, immutability) was verified independently: clean `tsc --noEmit` in both packages, 8 curl scenarios (create, skip-rejected, valid transition, idempotent-no-log, bad-actor rejected, chronological logs), and a successful `vite build`. I understand and can explain the entire solution.
