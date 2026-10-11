# Edge Cases & Test Plan

## 1. Edge Cases

| # | Kasus | Perilaku yang benar | Kenapa penting |
|---|---|---|---|
| E1 | PUT dengan `toStatus` sama | 200, tanpa log baru | Idempotency; retry aman |
| E2 | Lompat (`to_do → done`) | 400 + pesan allowed next | Domain validation |
| E3 | Mundur (`done → pending`) | 400 | Alur searah |
| E4 | Status tidak dikenal (`"archived"`) | 400 | Enum guard |
| E5 | Actor tidak dikenal (`"hacker"`) | 400 | Allowlist |
| E6 | Task id tidak ada | 404 (PUT, GET logs, DELETE) | Konsistensi |
| E7 | Title kosong / > 200 char | 400 | V1 |
| E8 | Double-klik tombol Advance cepat | Tepat 1 log (klik ke-2 jadi idempotent karena status sudah berubah) | Race-tech demo |
| E9 | Refresh browser | Data tetap (db.json) | Persistence |
| E10 | DELETE lalu GET logs id itu | 404, tapi baris log tetap di file | Retain vs expose |
| E11 | Retry network (kirim PUT sama 2x) | Request ke-2 idempotent | NFR idempotency |
| E12 | `db.json` belum ada / corrupt | Boot dengan data kosong (atau error jelas, tidak crash diam-diam) | Operabilitas |

## 2. Manual Test Script (untuk demo ke reviewer, ~3 menit)

```
1. GET /tasks → [] (kosong)
2. POST /tasks {title:"Prepare Invoice"} → 201, status to_do
3. PUT /tasks/:id/status {toStatus:"done"} → 400 (lompat, benar)
4. PUT {toStatus:"pending", actor:"john.doe"} → 200 + 1 log
5. PUT sama lagi {toStatus:"pending"} → 200 idempotent, log tetap 1
6. PUT {toStatus:"in_progress", actor:"jane.smith"} → 200, log ke-2
7. GET /tasks/:id/audit-logs → 2 log, urut kronologis
8. Refresh UI → data tetap ada
```

## 3. Verifikasi Konsistensi (checklist sebelum submit)
- [ ] Jumlah log hanya bertambah pada transisi valid.
- [ ] Tidak ada route yang menulis/menghapus `logs` selain PUT-status.
- [ ] `grep -rn "logs" server/src` hanya muncul di: append (routes), read (routes), load/save (store).
- [ ] Semua error validation me-return JSON `{error: string}` dengan status code tepat.
- [ ] CORS hanya allow `http://localhost:5173`.
