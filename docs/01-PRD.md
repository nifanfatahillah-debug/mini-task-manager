# PRD — Mini Task Manager (Qonflo AI Take-Home)

| Field | Value |
|---|---|
| Version | 1.0.0 |
| Status | Approved for build |
| Owner | Candidate (Full Stack Developer applicant) |
| Stakeholder | Qonflo AI hiring team / Internal team (end user) |
| Estimate | 3–5 hours |
| Stack | React + TS (client), Express + TS (server), JSON file persistence |

## 1. Background & Problem

Internal team mengelola task sederhana, namun:
1. Status task sering berubah tanpa jejak — tidak jelas **siapa mengubah apa**.
2. Perubahan data sulit ditelusuri (no history).
3. UI tidak menjelaskan riwayat perubahan.

Dampak: miskomunikasi, duplikasi kerja, tidak ada akuntabilitas.

## 2. Goals

- G1: User dapat CRUD task dengan alur status yang ketat.
- G2: Setiap perubahan status tercatat di audit log yang **immutable & kronologis**.
- G3: UI sederhana tapi menjelaskan "apa yang terjadi pada task ini".
- G4: Solusi konsisten end-to-end, mudah dijelaskan dan di-demo dalam 5 menit.

## 3. Non-Goals (Out of Scope)

- NO auth / login / role / permission.
- NO real-time collaboration, notifikasi, komentar, attachment.
- NO database server (cukup file JSON — sesuai syarat).
- NO UI kompleks / design system.

## 4. Users

| User | Kebutuhan |
|---|---|
| Internal team member (actor: `john.doe`, `jane.smith`, `admin` — hardcoded) | Buat task, majukan status, lihat riwayat |

Actor dipilih via dropdown di UI (bukan auth).

## 5. User Stories + Acceptance Criteria

### US-1 — Create task
> Sebagai user, aku bisa membuat task dengan judul (+ deskripsi opsional) sehingga muncul di list dengan status awal `to_do`.

AC:
- [ ] Title wajib, 1–200 karakter.
- [ ] Status awal selalu `to_do`, tidak bisa dipilih.
- [ ] Task baru muncul di list tanpa refresh manual.
- [ ] Tidak membuat audit log saat create (hanya status change yang di-log).*

*Keputusan didokumentasikan di ADRs — bisa diubah ke "log CREATE" tanpa merusak desain.

### US-2 — List tasks
> Sebagai user, aku bisa melihat semua task dengan status yang jelas.

AC:
- [ ] List menampilkan title, status badge, created/updated time, actor terakhir.
- [ ] Urutan: terbaru dulu (atau by updatedAt desc).

### US-3 — Update status (core)
> Sebagai user, aku bisa memajukan status mengikuti urutan `to_do → pending → in_progress → done`.

AC:
- [ ] Hanya boleh maju **tepat 1 langkah**. Lompat/mundur ditolak backend (400 + pesan jelas).
- [ ] Update ke nilai yang sama = **idempotent**: return 200, tidak bikin log.
- [ ] Setiap update valid menghasilkan **tepat 1 audit log** dan `task.status` + `task.updatedAt` berubah atomik.
- [ ] Frontend hanya menawarkan "next status" yang valid (backend tetap валидаsi ulang).

### US-4 — Delete task
> Sebagai user, aku bisa menghapus task yang salah/batal.

AC:
- [ ] `DELETE /tasks/:id` menghapus task; audit log historis **tidak dihapus** (retained, tidak bisa diakses via task detail — lihat §8).
- [ ] Konfirmasi di UI sebelum hapus.

### US-5 — View audit log per task
> Sebagai user, aku bisa melihat riwayat perubahan 1 task secara kronologis.

AC:
- [ ] Menjawab: task apa, siapa, dari→ke, kapan.
- [ ] Urut kronologis menaik (tertua → terbaru).
- [ ] Format contoh: `User "john.doe" changed Task "Prepare Invoice" status from "pending" to "in_progress" at 2025-01-01 10:00`.

## 6. Functional Requirements (ringkas)

| ID | Requirement | Prioritas |
|---|---|---|
| FR-1 | POST /tasks | Must |
| FR-2 | GET /tasks | Must |
| FR-3 | PUT /tasks/:id/status (validasi + idempotent + audit) | Must |
| FR-4 | DELETE /tasks/:id | Must |
| FR-5 | GET /tasks/:id/audit-logs (kronologis) | Must |
| FR-6 | Actor dropdown (predefined list) | Must |
| FR-7 | Tidak ada endpoint UPDATE/DELETE untuk audit log | Must |

## 7. Non-Functional Requirements

| ID | Requirement | Cara penuhi |
|---|---|---|
| NFR-1 | Konsistensi task ↔ log | Update status + append log dalam 1 operasi sinkron sebelum response |
| NFR-2 | Idempotency | `if (from === to) return 200 tanpa log` |
| NFR-3 | Immutability log | Tidak ada route mutasi log + append-only store + test |
| NFR-4 | Persistence | `server/db.json` (auto-created). Cukup untuk demo; gampang migrasi ke SQLite/Postgres |
| NFR-5 | Kesederhanaan | Monorepo 2 folder, tanpa ORM, tanpa auth |

## 8. Asumsi & Keputusan Kunci

1. **Create tidak di-log** — yang dinilai adalah perubahan status. (Alternatif valid: log event CREATE; dibahas di interview.)
2. **Delete task tidak menghapus log** secara fisik di file, tapi log task terhapus tidak diekspos (GET log untuk id yang tidak ada → 404). Alasan: storage append-only lebih mudah dibuktikan immutable.
3. **Actor = string bebas dari allowlist**, dikirim dari client. Bukan auth — sesuai "no overengineering".
4. **Timestamp = server time (ISO 8601)**. Client tidak boleh mengirim timestamp (mencegah pemalsuan urutan).
5. **Single-writer JSON file** cukup karena take-home single-user/demo. Risiko concurrency didokumentasikan di README.

## 9. Definisi Selesai (DoD)

- [ ] 5 endpoint jalan + validasi backend.
- [ ] UI: create, list, advance-status, delete, view log, actor dropdown.
- [ ] Refresh browser → data tetap ada (persistence).
- [ ] README berisi cara jalan + arsitektur + asumsi + trade-off + jawaban 4 pertanyaan.
- [ ] Repo public di GitHub, bisa di-clone dan jalan dalam < 5 menit.
