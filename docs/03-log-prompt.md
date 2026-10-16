# Log Prompt

**Alat AI yang dipakai:** GitHub Copilot (Copilot SDK di VS Code)

Log ini merangkum prompt utama, permintaan debugging, dan perubahan lanjutan selama pengembangan. Waktu prompt awal tidak tercantum pada rekap; tanggal untuk prompt yang memiliki timestamp mengikuti riwayat percakapan.

| No | Waktu | Langkah ke- | Prompt (ringkas) | Hasil dari AI | Keputusan tim (diterima / diubah / ditolak) dan alasannya |
|---|---|---|---|---|---|
| 1 | 2026-10-16 | 1 | Baca spesifikasi dan SQL di `src/backend/db`, lalu buat backend PHP/MySQL, terutama autentikasi guru dan siswa, registrasi guru, jurnal, dan laporan KBM. | Backend API untuk autentikasi, registrasi/enrollment guru, jurnal, laporan, validasi, dan akses berbasis peran. | Diterima sebagai dasar backend; implementasi disesuaikan dengan skema dan endpoint yang tersedia. |
| 2 | 2026-10-16 | 2 | Lengkapi `src/frontend/guru` dengan halaman login, registrasi, dashboard, dan jurnal KBM. | Halaman dan skrip frontend guru terhubung ke API backend. | Diterima; alur dan tampilan mengikuti kebutuhan portal guru. |
| 3 | 2026-10-16 | 3 | Buat file pengujian khusus frontend di folder `test`, tetapi jangan jalankan. | Pengujian frontend disiapkan agar dapat dijalankan dari terminal. | Diterima untuk permintaan tersebut; pengujian kemudian dijalankan saat validasi perubahan lanjutan. |
| 4 | 2026-10-16 | 4 | Saat NIP berhasil dicek pada registrasi guru, tampilkan nama dalam input nonaktif, hilangkan token, lalu izinkan guru membuat password dan lanjut ke registrasi wajah. | Nama guru ditampilkan dari hasil pemeriksaan NIP; alur password dan enrollment wajah diperbarui. | Diterima; nama dikosongkan saat NIP berubah dan NIP diverifikasi dikunci saat melanjutkan. |
| 5 | 2026-10-16 | 5 | Perbaiki error koneksi API pada halaman frontend. | Default API lokal/deployment disesuaikan dan pesan koneksi dibuat lebih informatif. | Diterima; penyebab koneksi lokal dan konfigurasi API ditelusuri sebelum perubahan. |
| 6 | 2026-10-16 | 6 | Gunakan koordinat sekolah dari `konfigurasi_sekolah` dan tolak presensi guru jika jarak melebihi 50 meter. | Backend membandingkan GPS guru dengan titik sekolah dan mengembalikan alasan penolakan serta jarak. | Diterima; batas efektif maksimal 50 meter, dengan radius konfigurasi yang lebih kecil tetap berlaku. |
| 7 | 2026-10-16 | 7 | Tampilkan latitude dan longitude GPS guru yang sebenarnya pada bagian Lokasi GPS di halaman home. | Ringkasan GPS dashboard menampilkan koordinat perangkat dan perkiraan akurasi. | Diterima; koordinat diperbarui saat pemeriksaan lokasi dan sebelum presensi. |
| 8 | 2026-10-16 | 8 | Buat portal siswa responsif untuk ponsel seperti referensi `geokbm_frontend_users/siswa`, dan sesuaikan dengan backend. | Halaman login, beranda, jurnal, dan laporan siswa dibuat dan dihubungkan ke API berbasis sesi. | Diterima; akses dibatasi untuk ketua kelas dan kelas ditentukan dari sesi backend. |
| 9 | 2026-10-16 | 9 | Tambahkan halaman onboarding frontend agar alur pemilihan portal jelas seperti referensi. | Onboarding tiga slide dengan navigasi geser/tombol dan pilihan portal guru atau siswa. | Diterima; tautan kembali ke pilihan portal juga ditambahkan pada halaman login. |
| 10 | 2026-10-16 | 10 | Langkah selanjutnya. Mohon tambahkan halaman riwayat absen guru lengkapi dengan bagian pencarian, bagian filter, dan bagian unduh Unduh CSV yang sedang tampil. | Halaman riwayat absen guru lengkap dengan pencarian, filter dan download#. | Diterima; Pencarian riwayat absen dan filter serta dapat mendowanload csv file. |
