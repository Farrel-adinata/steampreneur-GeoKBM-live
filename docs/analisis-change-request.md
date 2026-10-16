# Analisis Change Request

## Status dan batasan

Dokumen ini merangkum secara retrospektif change request GeoKBM Live yang dikerjakan selama sesi pengembangan. Dokumen ini **bukan bukti** bahwa analisis telah dibuat atau di-commit sebelum perubahan kode; urutan tersebut hanya dapat dibuktikan dari riwayat commit Git.

Template challenge menyebut pencarian, filter, dan ekspor CSV (Tugas 3). Fitur tersebut **tidak tercantum sebagai kebutuhan GeoKBM Live yang disepakati** dan secara eksplisit berada di luar cakupan pada `docs/01-spesifikasi.md`. Karena tidak ada persetujuan tim atau kriteria khusus untuk fitur tersebut, dokumen ini tidak menganggapnya sebagai perubahan yang telah diterima atau dikerjakan. Minta keputusan tim dan definisikan entitas, hak akses, format CSV, serta kriteria penerimaan sebelum mengimplementasikannya.

## Change request yang dikerjakan

| ID | Perubahan yang diminta | Dampak / keputusan desain | Status |
|---|---|---|---|
| CR-01 | Setelah cek NIP registrasi guru, tampilkan nama dalam field nonaktif; hilangkan token; izinkan pembuatan password dan pendaftaran wajah. | Frontend memakai nama dari respons cek NIP. Nama dan status verifikasi dibersihkan saat NIP berubah; NIP yang sudah diperiksa dikunci saat enrollment dilanjutkan. Endpoint enrollment menerima NIP, password, dan embedding. | Diimplementasikan; alur kamera/enrollment belum diuji end-to-end dengan kamera dan database uji. |
| CR-02 | Perbaiki koneksi API lokal dan pesan error koneksi. | Frontend menggunakan backend lokal pada port 8000 untuk hostname lokal dan origin halaman sebagai default deployment. Backend memakai origin development terbatas; deployment wajib mengatur `APP_ORIGIN`/`API_BASE` yang sesuai. | Diimplementasikan; origin `127.0.0.1:5500` diuji dengan preflight HTTP 204 dan CSRF HTTP 200. |
| CR-03 | Bandingkan lokasi guru saat presensi dengan titik sekolah di database dan tolak jika jaraknya lebih dari 50 meter. | Backend membaca koordinat dari `konfigurasi_sekolah`, menghitung jarak Haversine, dan membatasi radius efektif maksimum 50 meter. Radius konfigurasi yang lebih kecil tetap diberlakukan. Error penolakan menyebut jarak serta batas. | Diimplementasikan; helper jarak dan aturan radius diuji otomatis. Uji endpoint dengan fixture database/GPS aktual masih diperlukan. |
| CR-04 | Tampilkan koordinat GPS guru yang diperoleh browser pada dashboard guru. | Ringkasan lokasi menampilkan latitude, longitude, dan perkiraan akurasi; diperbarui saat pemeriksaan GPS dan sebelum request presensi. Titik ini adalah lokasi perangkat guru, bukan koordinat sekolah. | Diimplementasikan; tampilan/perangkat GPS nyata belum diuji manual. |
| CR-05 | Buat portal siswa responsif seperti referensi dan sesuaikan dengan backend. | Menambahkan login, home, jurnal, dan laporan untuk ketua kelas. API memakai sesi/CSRF, membatasi role, dan mengambil kelas dari sesi backend—bukan ID kelas yang dikirim sebagai otorisasi dari browser. Login menerima username, email, atau NIS. | Diimplementasikan; halaman/aset dan alur API teruji secara otomatis. End-to-end dengan akun serta database uji masih diperlukan. |
| CR-06 | Tambahkan onboarding agar pemilihan portal jelas. | Menambahkan pengenalan tiga slide, navigasi tombol/dots/geser, pilihan portal guru/siswa, dan tautan kembali ke pilihan portal dari halaman login. | Diimplementasikan; navigasi dasar tombol dan Lewati tercakup tes. Gestur sentuh serta perilaku kunjungan ulang belum diverifikasi. |

## Dampak lintas bagian

| Bagian terdampak | File / fungsi utama | Perubahan |
|---|---|---|
| Registrasi guru | `src/frontend/guru/register.html`, `src/frontend/guru/js/register.js`, `src/backend/src/teacher.php` | Field nama, validasi NIP terverifikasi, pembuatan password, dan enrollment embedding. |
| API/origin | `src/frontend/guru/js/config.js`, `src/frontend/guru/js/shared.js`, `src/frontend/siswa/js/config.js`, `src/frontend/siswa/js/shared.js`, `src/backend/src/config.php` | Default API development, sesi/CSRF browser, dan konfigurasi origin lokal/deployment. |
| Absensi guru | `src/backend/src/teacher.php`, `src/backend/src/validators.php`, `src/frontend/guru/js/home.js` | Validasi geofence 50 meter, pesan penolakan, dan tampilan koordinat GPS perangkat. |
| Portal siswa | `src/frontend/siswa/`, `src/backend/src/auth.php`, `src/backend/public/index.php`, `src/backend/src/student.php` | Halaman mobile-first, login ketua kelas dengan NIS, jurnal, dan laporan berbasis sesi. |
| Onboarding | `src/frontend/index.html`, `src/frontend/css/onboarding.css`, `src/frontend/js/onboarding.js`, halaman login portal | Pengenalan aplikasi serta navigasi ke portal guru/siswa. |
| Test dan dokumentasi | `test/frontend.test.js`, `test/run.php`, `docs/04-kasus-uji.md`, `src/backend/README.md` | Tes perilaku dasar, catatan cakupan, konfigurasi, dan skenario integrasi yang masih perlu dijalankan. |

## Kriteria penerimaan dan verifikasi

| ID | Kriteria penerimaan | Cara verifikasi | Status verifikasi |
|---|---|---|---|
| A01 | Cek NIP yang cocok menampilkan nama dari API; perubahan NIP menghapus nama/verifikasi lama. | Tes frontend dan skenario NIP valid/tidak valid dengan database uji. | Tampilan/perubahan NIP lulus tes frontend; integrasi database belum diuji. |
| A02 | Aplikasi lokal tersambung ke backend dengan origin yang diizinkan; deployment tidak bergantung pada alamat lokal. | Uji preflight/API lokal serta konfigurasi `API_BASE` dan `APP_ORIGIN` deployment. | Lokal `127.0.0.1:5500` terverifikasi; deployment belum diuji. |
| A03 | Lokasi sekolah berasal dari `konfigurasi_sekolah`; lokasi guru di luar radius efektif ditolak dengan pesan jarak dan tidak dicatat. | Uji jarak di bawah, tepat pada, dan di atas batas memakai database uji; cek tabel log. | Helper perhitungan/radius lulus pemeriksaan otomatis; endpoint dan tidak-adanya log perlu dikonfirmasi dengan fixture. |
| A04 | Dashboard menampilkan latitude/longitude perangkat saat GPS berhasil didapat dan error yang jelas saat lokasi gagal. | Uji izin GPS dan tampilan pada browser ponsel. | Belum diuji manual pada perangkat. |
| A05 | Ketua kelas dapat login, membaca jadwal/jurnal/laporan kelasnya, dan menyimpan jurnal tanpa mengakses kelas lain. | Uji akun ketua kelas dan non-ketua, kelas sendiri/lain, serta perubahan jurnal di database uji. | Validasi frontend/API dasar lulus; skenario role dan database belum dijalankan end-to-end. |
| A06 | Onboarding memberi akses jelas ke login guru/siswa dan dapat digunakan pada ponsel. | Tes link/aset dan navigasi tombol; uji visual dan geser pada perangkat/browser mobile. | Link/aset dan navigasi tombol dasar lulus tes; gestur/visual belum diverifikasi. |

## Tes otomatis yang tersedia

Pada validasi terakhir yang dicatat di `docs/04-kasus-uji.md`:

- `node --test test/frontend.test.js`: 20 tes, lulus.
- `php test/run.php`: 33 pemeriksaan, lulus.
- `php -l src/backend/src/auth.php` dan `php -l src/backend/public/index.php`: sintaks PHP valid.

Hasil unit/helper dan pemeriksaan lokal tidak membuktikan alur end-to-end pada perangkat, kamera, GPS, akun, atau database produksi. Gunakan database uji dan data sintetis untuk pengujian integrasi.

## Keputusan tim yang masih diperlukan

- Setujui atau tolak pencarian/filter/ekspor CSV dari template challenge secara terpisah sebelum implementasi; tetapkan cakupan data, role, format ekspor, serta uji privasi.
- Verifikasi onboarding saat kunjungan ulang: implementasi menyimpan penanda saat Lewati, tetapi status tersimpan belum digunakan untuk memilih slide awal.
- Jalankan kasus integrasi A01–A06 dengan akun dan database uji; isi bukti/hasil aktual di `docs/04-kasus-uji.md`.
