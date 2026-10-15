# Rencana Kerja GeoKBM Live

**Waktu mulai pembangunan:** 12 Oktober 2026.
**Batas akhir pengumpulan:** 16 Oktober 2026.

| No | Langkah | Penanggung jawab | Cara memeriksa bahwa langkah ini selesai | Estimasi waktu (rencana) | Waktu sebenarnya | Status |
|---|---|---|---|---|---|---|
| 1 | Mengumpulkan kebutuhan melalui wawancara dan observasi | Tim GeoKBM Live;  | Ringkasan masalah, persona, dan temuan lapangan tersedia di Dokumen Observasi | 1–2 jam |  |
| 2 | Menyiapkan skema MySQL dan konfigurasi backend PHP | backend dan database developer | SQL dapat diimpor ke database uji; koneksi PDO berjalan | 2–4 jam |||
| 3 | Membangun alur guru: registrasi, login, absensi wajah + GPS, riwayat | Frondend dan backend developer | Login, batas lokasi, pemeriksaan wajah, dan penyimpanan riwayat diuji dengan akun uji | 4–8 jam | |  |
| 4 | Membangun jurnal guru dan portal ketua kelas | Frondend dan backend developer  | Guru mengisi materi/catatan; siswa mengisi status/catatan; nilai tampil kembali | 3–6 jam |  | |
| 5 | Membangun administrasi master data dan portal monitor | Frondend dan backend developer  | Operasi data induk dan laporan monitor berjalan dengan role yang sesuai | 4–8 jam |  |  |
| 6 | Integrasi URL API dan deployment hosting |Frondend dan backend developer  | Login dan endpoint menghasilkan JSON dari URL yang benar melalui HTTPS | 1–3 jam | |  |
| 7 | Bug hunt, kasus uji, README, dan refleksi | Team GeoKBM Live | Kasus uji terisi dengan hasil/bukti aktual, temuan bug ditutup, README dapat diikuti | 2–4 jam |  |  |
| 8 | Change request | Frondend dan backend developer | Kriteria change request disetujui dan diuji | 2-4 jam || |

Estimasi di atas adalah usulan retrospektif untuk perencanaan, bukan klaim tentang waktu yang benar-benar dipakai. Status `selesai` baru boleh ditetapkan setelah langkah verifikasi dijalankan dan dicatat.
