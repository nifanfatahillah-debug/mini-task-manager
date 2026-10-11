# Data Model & Domain Validation

## 1. Entities

### Task
```ts
type Status = "to_do" | "pending" | "in_progress" | "done";

interface Task {
  id: string;          // "t_" + 8 char acak
  title: string;       // 1–200 char, wajib
  description: string; // opsional, default ""
  status: Status;      // default "to_do"
  createdAt: string;   // ISO server time, set sekali
  updatedAt: string;   // ISO server time, berubah tiap status change
}
```

### AuditLog (append-only)
```ts
interface AuditLog {
  id: string;        // "a_" + 8 char acak
  taskId: string;    // FK ke Task.id
  actor: string;     // allowlist
  fromStatus: Status;
  toStatus: Status;
  timestamp: string; // ISO server time, set sekali, tidak pernah diubah
}
```

### Actors (hardcoded)
```ts
const ACTORS = ["john.doe", "jane.smith", "admin"];
```

## 2. Status State Machine

```
to_do ──▶ pending ──▶ in_progress ──▶ done
  │           │             │            │
  │           │             │            └─ terminal (tidak bisa kemana-mana)
  │           │             └─ hanya ke done
  │           └─ hanya ke in_progress
  └─ hanya ke pending
```

Implementasi: array urutan + cek index selisih tepat 1.
```ts
const ORDER: Status[] = ["to_do", "pending", "in_progress", "done"];
const allowedNext = (s: Status) => ORDER[ORDER.indexOf(s) + 1] ?? null;
// valid jika ORDER.indexOf(to) - ORDER.indexOf(from) === 1
```

## 3. Validation Rules (backend = source of truth)

| # | Rule | Lokasi | Response |
|---|---|---|---|
| V1 | Title wajib 1–200 char | POST /tasks | 400 |
| V2 | Actor harus di allowlist | PUT status | 400 |
| V3 | toStatus harus enum valid | PUT status | 400 |
| V4 | Idempotent: from === to → tanpa log | PUT status | 200 + `idempotent:true` |
| V5 | Hanya maju 1 langkah | PUT status | 400 + pesan allowed next |
| V6 | Timestamp selalu server time | store/routes | — (client tidak bisa kirim) |
| V7 | Tidak ada mutasi log | tidak ada route | — (by construction) |

Frontend boleh menonaktifkan tombol yang tidak valid (UX), tapi tidak dipercaya.

## 4. Persistence Format (db.json)
```json
{
  "tasks": [ { "id": "...", "title": "...", "status": "..." } ],
  "logs": [ { "id": "...", "taskId": "...", "actor": "...", "fromStatus": "...", "toStatus": "...", "timestamp": "..." } ]
}
```
- Load saat boot (jika file tidak ada → `{tasks:[],logs:[]}`).
- Save sinkron setiap mutasi. File kecil (< ratusan KB) → aman.
- `db.json` masuk `.gitignore` supaya reviewer mulai dari data kosong.

## 5. Invariants (tidak boleh dilanggar)
1. Setiap log punya `taskId` yang pernah ada.
2. `task.updatedAt` == `timestamp` log terakhir task itu (setelah transisi valid).
3. Tidak ada 2 log identik untuk 1 transisi (idempotent mencegah duplikat retry).
4. Urutan log per task monoton naik mengikuti ORDER.
