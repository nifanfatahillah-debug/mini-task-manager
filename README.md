# Mini Task Manager — Qonflo AI Take-Home (Full Stack: React + Express)

Aplikasi internal sederhana untuk mengelola task + **audit log yang immutable** untuk setiap perubahan status.

## Cara Menjalankan

Butuh: Node.js 18+.

```bash
# Terminal 1 — backend (http://localhost:3001)
cd server
npm install
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd client
npm install
npm run dev
```

Buka `http://localhost:5173`. Data tersimpan di `server/db.json` (dibuat otomatis, tidak di-commit).

## Arsitektur Singkat

```
React (client/) ──REST JSON──▶ Express (server/) ──▶ db.json
```

- `client/src/api.ts` satu-satunya tempat HTTP; `App.tsx` hanya UI.
- `server/src/routes.ts` berisi 5 endpoint + semua validasi domain; `store.ts` satu-satunya penulis `db.json` (tulis sinkron, jadi status task dan log tidak pernah out-of-sync).
- Status hanya maju 1 langkah: `to_do → pending → in_progress → done`. Detail: `docs/02-ARCHITECTURE.md`, kontrak API: `docs/03-API-CONTRACT.md`.

## Asumsi

1. **Create tidak menulis log** — yang di-log hanya perubahan status (lihat ADR-002).
2. **Delete task me-retain log** secara fisik di file, tapi tidak diekspos via API (ADR-003).
3. **Actor = dropdown hardcoded** (`john.doe`, `jane.smith`, `admin`), bukan auth — sesuai "no overengineering".
4. **Timestamp selalu dari server** (ISO UTC); client tidak boleh mengirim timestamp agar urutan log tidak bisa dipalsukan.
5. **Single-user/demo** — file JSON cukup karena syarat membolehkan.

## Trade-off

| Keputusan | Kenapa | Konsekuensi |
|---|---|---|
| JSON file, bukan DB | 0 setup, reviewer jalan < 5 menit | Tidak tahan concurrent write |
| Tulis sinkron (`writeFileSync`) | Konsistensi task↔log terjamin tanpa lock | Block event loop ~ms, tak cocok skala besar |
| Idempotent via early-return, bukan Idempotency-Key | Cukup untuk domain 4 status | Didokumentasikan sebagai batasan sadar |
| Tanpa ORM/auth/test-framework | Domain kecil; explicit code lebih mudah dijelaskan | Validasi ditulis manual |

## Jika Ada Waktu Lebih

1. Migrasi persistence ke SQLite (cukup ganti `store.ts`, kontrak API tetap).
2. Soft-delete task agar log task terhapus tetap bisa diaudit.
3. Test otomatis untuk 12 edge case di `docs/06-EDGE-CASES-TESTPLAN.md`.
4. Pagination `GET /tasks` + filter by status.

## Jawaban Pertanyaan Wajib

### 1. Bagaimana memastikan audit log tidak ter-modifikasi?

Tiga lapis: (a) **by construction** — tidak ada route PUT/DELETE/PATCH untuk log, jadi tidak ada jalan API untuk mengubahnya; (b) **single writer** — satu-satunya kode yang menyentuh array `logs` adalah `applyStatusChange` (append) dan `load/save`; bisa diverifikasi dengan `grep`; (c) **server timestamp** — client tidak mengirim waktu, jadi urutan tidak bisa dipalsukan. Batasan jujur: file JSON masih bisa diedit manual di disk — untuk produksi perlu DB dengan permission read-only + hash chain.

### 2. Bagian paling berisiko jika digunakan banyak user?

`store.ts` — baca-tulis file tanpa lock. Dua PUT bersamaan bisa menimpa (lost update) atau bikin urutan log salah. Berikutnya: tidak ada auth, jadi `actor` hanya klaim dari client.

### 3. Jika berkembang besar, apa yang di-refactor pertama dan kenapa?

Persistence (`store.ts` → SQLite/Postgres dengan transaksi). Karena itu satu-satunya bagian yang asumsi single-writer-nya jebol duluan saat user bertambah, sementara interface-nya sudah terisolasi sehingga API dan UI tidak perlu berubah.

### 4. Bagian mana yang dibantu AI dan bagaimana validasinya?

AI membantu scaffolding awal (struktur folder, boilerplate Vite/Express) dan draf dokumen. Semua logika domain (state machine, idempotency, immutability) saya tulis dan verifikasi sendiri dengan: `tsc --noEmit` bersih di kedua paket, 8 skenario curl (create, skip-ditolak, transisi valid, idempotent tanpa log, actor-salah ditolak, log kronologis), dan `vite build` sukses. Saya memahami dan bisa menjelaskan seluruh solusi ini.
