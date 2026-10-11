# ADRs — Architecture Decision Records

## ADR-001: JSON file sebagai persistence (bukan DB)
- Status: Accepted
- Konteks: Syarat membolehkan memory/file/DB bebas. Estimasi 3–5 jam.
- Keputusan: `db.json` + single-writer sync.
- Alternatif: SQLite (lebih kuat, tapi tambah setup + dependency), Postgres (overkill).
- Konsekuensi: Migrasi ke DB nanti mudah karena akses data terisolasi di `store.ts` — cukup ganti implementasi load/save.

## ADR-002: Create task tidak menghasilkan audit log
- Status: Accepted
- Konteks: Syarat: "setiap perubahan status harus menghasilkan audit log". Create bukan perubahan status.
- Keputusan: POST tidak menulis log.
- Alternatif: Log event CREATE (from: null → to: to_do). Sama valid-nya; bisa ditambah tanpa merusak skema (fromStatus nullable).
- Konsekuensi: Harus konsisten dijelaskan di interview.

## ADR-003: Delete task me-retain log secara fisik
- Status: Accepted
- Konteks: "Audit log tidak boleh diubah atau dihapus dalam keadaan apapun" vs "Update task tidak boleh menghapus log lama".
- Keputusan: DELETE menghapus task dari array `tasks`, tapi entri di `logs` tidak dihapus. GET log untuk task yang sudah dihapus → 404 (tidak diekspos).
- Alternatif: hard-delete log juga (melanggar immutability), atau soft-delete task (lebih kompleks).
- Konsekuensi: File bisa tumbuh; untuk take-home tidak masalah.

## ADR-004: Validasi di backend, frontend hanya cermin
- Status: Accepted
- Konteks: Syarat: validasi boleh harus di backend, frontend opsional.
- Keputusan: Semua aturan V1–V5 dienforce di `routes.ts`. Frontend hanya menyembunyikan tombol invalid untuk UX.
- Konsekuensi: API aman walau dipanggil via curl.

## ADR-005: Idempotent via early-return (bukan request key)
- Status: Accepted
- Konteks: Retry network bisa mengirim PUT yang sama 2x.
- Keputusan: `if (from === to) return 200 tanpa log`. Cukup untuk domain ini.
- Alternatif: Idempotency-Key header (standar untuk payment, overkill di sini).
- Konsekuensi: Didokumentasikan sebagai trade-off yang disengaja.

## ADR-006: Monorepo 2 folder, tanpa ORM/auth/test-framework berat
- Status: Accepted
- Konteks: Dinilai kejelasan, bukan jumlah fitur. "No overengineering".
- Keputusan: Express polos + React polos + fetch.
- Konsekuensi: Jika membesar → refactor pertama adalah persistence (lihat README).

## ADR-007: Kanban kolom + tombol, tanpa drag-and-drop
- Status: Accepted
- Konteks: UI list polos kurang familiar; opsi kanban ala Trello dipertimbangkan.
- Keputusan: 4 kolom grid CSS (`STATUS_ORDER.map` + filter `byStatus()`), perpindahan kolom terjadi otomatis setelah PUT sukses. Tidak ada library DnD, tidak ada drop handler.
- Alternatif: drag-and-drop (`@dnd-kit`/sejenis) — ditolak karena: (a) explicit "no overengineering" di soal; (b) alur linear 1-langkah membuat drop bebas justru butuh penjelasan penolakan tambahan; (c) menambah state drag + optimistik update yang rawan inkonsistensi tampilan vs server.
- Konsekuensi: API dan backend tidak berubah sama sekali; grouping murni presentasi sehingga cerita interview tetap 1 kalimat: "frontend cuma mengelompokkan, kebenaran tetap di backend".
