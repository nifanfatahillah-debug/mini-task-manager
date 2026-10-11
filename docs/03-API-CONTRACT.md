# API Contract — v1

Base URL: `http://localhost:3001`
Content-Type: `application/json`
Semua timestamp: ISO 8601 UTC dari server. Client tidak boleh mengirim timestamp.

## Status enum
`to_do | pending | in_progress | done` — maju tepat 1 langkah.

---

## 1. GET /tasks — list semua task
Response `200`:
```json
[
  {
    "id": "t_abc123",
    "title": "Prepare Invoice",
    "description": "Invoice klien A",
    "status": "pending",
    "createdAt": "2025-01-01T03:00:00.000Z",
    "updatedAt": "2025-01-01T03:05:00.000Z"
  }
]
```

## 2. POST /tasks — buat task
Request:
```json
{ "title": "Prepare Invoice", "description": "opsional" }
```
Rules: `title` wajib, 1–200 char. Status awal selalu `to_do`.
- `201` → task baru.
- `400` → `{ "error": "title is required" }`.

## 3. PUT /tasks/:id/status — ubah status + tulis log
Request:
```json
{ "toStatus": "pending", "actor": "john.doe" }
```
Rules:
- `actor` harus di allowlist: `john.doe`, `jane.smith`, `admin` → else `400`.
- `toStatus` harus valid enum → else `400`.
- Task tidak ada → `404`.
- `toStatus === current` → `200` dengan flag idempotent, **tanpa log baru**:
```json
{ "task": {...}, "audit": null, "idempotent": true }
```
- Transisi valid (maju 1 langkah) → `200`:
```json
{
  "task": { "id": "t_abc123", "status": "pending", "updatedAt": "..." },
  "audit": {
    "id": "a_xyz",
    "taskId": "t_abc123",
    "actor": "john.doe",
    "fromStatus": "to_do",
    "toStatus": "pending",
    "timestamp": "2025-01-01T03:00:00.000Z"
  }
}
```
- Lompat/mundur → `400`:
```json
{ "error": "Invalid transition: from \"to_do\" to \"done\". Allowed next: \"pending\"." }
```

## 4. DELETE /tasks/:id — hapus task
- `200` → `{ "deleted": "t_abc123" }`. Log historis retained di file (tidak diekspos).
- `404` jika tidak ada.

## 5. GET /tasks/:id/audit-logs — riwayat 1 task
- `200` → array urut kronologis menaik (tertua dulu):
```json
[
  {
    "id": "a_xyz",
    "taskId": "t_abc123",
    "actor": "john.doe",
    "fromStatus": "to_do",
    "toStatus": "pending",
    "timestamp": "2025-01-01T03:00:00.000Z"
  }
]
```
- `404` jika task tidak ada.

## 6. Yang TIDAK ada (by design)
Tidak ada `PUT/DELETE /audit-logs`, tidak ada `PATCH /tasks` umum, tidak ada endpoint hapus log. Ini bukti immutability.
