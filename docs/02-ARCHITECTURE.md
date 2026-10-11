# Architecture — Mini Task Manager

## 1. Overview

Monorepo sederhana, 2 aplikasi independen yang bicara via REST JSON.

```
+----------------+      HTTP JSON       +----------------+      read/write     +----------+
|  client/       |  ─────────────────▶  |  server/       |  ───────────────▶  | db.json  |
|  React + TS    |  ◀─────────────────  |  Express + TS  |  ◀───────────────  | (file)   |
|  Vite          |                      |  single writer |                   +----------+
+----------------+                      +----------------+
```

Kenapa tidak dipisah repo? Biar reviewer clone 1x, jalan 2 perintah, selesai < 5 menit.

## 2. Component Breakdown

### 2.1 client/ (presentation layer)
- `src/App.tsx` — composition root: actor selector + form create + **papan kanban 4 kolom** (satu kolom per status, dikelompokkan client-side via `byStatus()`) + riwayat log expandable per kartu.
- `src/api.ts` — satu-satunya tempat `fetch()` ke backend. Semua URL di sini.
- `src/types.ts` — tipe TS yang mirror backend (Task, AuditLog, Status).
- Tidak ada business logic status di sini selain menampilkan "tombol next yang valid" untuk UX. Pengelompokan kolom murni fungsi tampilan dari array task yang sama — **tanpa drag-and-drop** (lihat ADR-007). Kebenaran tetap di backend.

### 2.2 server/ (domain + persistence)
```
server/src/
  index.ts    → bootstrap express, CORS, JSON body, mount routes
  types.ts    → Status, Task, AuditLog, DTO
  store.ts    → load/save db.json (single-writer, sync write)
  routes.ts   → 5 endpoint + validasi domain
  db.json     → auto-created saat pertama jalan (tidak di-commit)
```

### 2.3 Data flow — update status (alur terpenting)
```
UI klik "Advance" → PUT /tasks/:id/status {toStatus, actor}
  → routes.ts: cari task (404 jika hilang)
  → idempotent check: from === to → return 200, tanpa log
  → validasi transisi: harus tepat 1 langkah maju, else 400
  → mutasi in-memory: task.status = to; task.updatedAt = now
  → append audit log (server timestamp)
  → store.save() sinkron ke db.json
  → response 200 {task, audit}
UI refresh task + log.
```

Task dan log ditulis dalam 1 tick sinkron sebelum response → tidak ada state "task sudah berubah tapi log belum".

## 3. Key Decisions (ringkas, detail di ADRs)

| Keputusan | Alasan | Trade-off |
|---|---|---|
| JSON file, bukan DB | Syarat membolehkan; 0 setup; reviewer langsung jalan | Tidak tahan concurrent write; migrasi perlu nanti |
| Sync `writeFileSync` | Operasi kecil; garansi konsistensi tanpa lock | Block event loop ~ms; tidak untuk skala besar |
| Tanpa ORM / framework validasi | Domain hanya 4 status; explicit `if` lebih mudah dijelaskan | Harus tulis validasi manual |
| Actor allowlist di backend | Mencegah actor sembarangan tanpa bikin auth | Bukan keamanan beneran |
| Timestamp dari server | Mencegah client memalsukan urutan log | Jam client dan server bisa beda zona (pakai ISO UTC) |

## 4. Non-Goals yang disengaja
Tidak ada auth, pagination, filter, search, real-time, migrasi DB. Semua itu disebut di README "jika ada waktu lebih".
