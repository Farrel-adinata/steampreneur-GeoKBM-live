# Kasus Uji GeoKBM Live

Dokumen ini mencakup portal guru, portal ketua kelas, onboarding, autentikasi/API, jurnal KBM, laporan, dan validasi lokasi presensi. Hasil otomatis di bawah berasal dari test runner yang tersedia di repository. Skenario integrasi yang memerlukan akun, kamera, GPS, atau data database uji ditandai belum diuji; gunakan data sintetis dan jangan menjalankan mutasi pada database produksi.

## Hasil pengujian otomatis

Terakhir dijalankan pada 16 Oktober 2026:

| Perintah | Hasil aktual | Cakupan |
|---|---|---|
| `node --test test/frontend.test.js` | Lulus, 20 tes (termasuk subtes) | Referensi halaman/aset portal guru dan siswa, target elemen DOM, navigasi dasar onboarding, konfigurasi API, sesi/CSRF API siswa, tampilan nama setelah cek NIP, sintaks JavaScript, dan helper frontend. |
| `php test/run.php` | Lulus, 33 pemeriksaan | Jarak Haversine dan batas 50 meter, radius konfigurasi, embedding wajah, status jurnal, tanggal/hari, definisi resource admin, dan struktur schema/migrasi. |
| `php -l src/backend/src/auth.php` | Lulus | Sintaks handler autentikasi PHP. |
| `php -l src/backend/public/index.php` | Lulus | Sintaks router API PHP. |
| `git diff --check` | Lulus | Tidak ditemukan whitespace error pada perubahan saat validasi. |

Pemeriksaan runtime lokal yang dilakukan:

| Pemeriksaan | Hasil aktual |
|---|---|
| Membuka halaman login, home, jurnal, laporan siswa, CSS, dan JavaScript siswa melalui server frontend lokal | Semua mengembalikan HTTP 200. |
| CORS preflight dan permintaan API CSRF dari `http://127.0.0.1:5500` | Preflight HTTP 204; API HTTP 200 setelah konfigurasi origin lokal diperbaiki. |
| `POST /api/siswa/login` dengan body kosong | HTTP 422 dengan pesan bahwa username dan kata sandi wajib diisi; tidak memakai akun nyata. |

Tes unit/helper dan pemeriksaan HTTP tersebut **bukan** pengganti uji end-to-end dengan database uji, akun ketua kelas/guru, browser ponsel, kamera, atau GPS nyata.

## Skenario fungsional dan integrasi

Isi kolom hasil aktual dan bukti setelah menjalankan skenario manual. Gunakan akun, jadwal, embedding, dan koordinat sintetis pada database uji.

| ID | Area dan skenario | Langkah / data uji | Hasil yang diharapkan | Hasil aktual / status |
|---|---|---|---|---|
| U01 | Onboarding dan pemilihan portal | Buka `src/frontend/index.html`; lanjutkan dengan tombol dan titik navigasi, lewati pengenalan, lalu pilih portal guru dan siswa. Uji pula geser pada layar sentuh. | Tiga slide dapat dijelajahi; tombol Lewati membawa pengguna ke pilihan portal; tautan membuka `guru/index.html` atau `siswa/index.html`. | Navigasi tombol dan Lewati tercakup tes frontend; uji geser dan klik visual di browser belum dilakukan. |
| U02 | Responsivitas halaman portal | Buka login, beranda, jurnal, dan laporan pada lebar ponsel (320–430 px) dan desktop. | Konten tidak meluber horizontal; kontrol mudah disentuh; panel, formulir, serta navigasi bawah tetap terbaca dan dapat digunakan. | Belum diuji visual/manual pada browser. |
| U03 | Login siswa dengan NIS | Kirim `POST /api/siswa/login` dengan NIS ketua kelas dan kata sandi uji yang benar. Ulangi menggunakan kata sandi salah. | Login benar menghasilkan sesi `ketua_kelas` dan `data_siswa`; halaman menuju home. Login salah ditolak dengan HTTP 401. | Payload kosong sudah diverifikasi HTTP 422; login berhasil/gagal memakai akun uji belum diuji end-to-end. |
| U04 | Pembatasan peran dan sesi siswa | Akses halaman/API siswa tanpa sesi; lalu coba login akun siswa yang bukan ketua kelas. | Pengunjung tanpa sesi kembali ke login dan endpoint terlindungi menolak akses; akun non-ketua kelas ditolak. | Belum diuji dengan akun uji. |
| U05 | Jadwal kelas berdasarkan tanggal | Dengan sesi ketua kelas, panggil `GET /api/siswa/jadwal?tanggal=YYYY-MM-DD` pada hari KBM, Sabtu, dan Minggu. | Jadwal hanya berasal dari kelas pada sesi; hari KBM menampilkan jam, mapel, guru, dan jurnal tanggal itu; Minggu mengembalikan jadwal kosong. | Validasi helper tanggal/hari tercakup pemeriksaan backend; hasil endpoint memakai fixture belum diuji. |
| U06 | Simpan dan perbarui jurnal siswa | Pilih slot kelas sendiri; kirim `POST /api/siswa/jurnal` dengan tanggal, `id_jadwal`, status yang diizinkan, dan catatan opsional. Kirim ulang slot/tanggal yang sama. | Jurnal tersimpan dan dapat dibaca kembali; kiriman kedua memperbarui entri unik, tidak membuat duplikat; data materi/catatan guru tidak ditimpa. | Validasi status/helper tercakup; penulisan dan pembacaan DB belum diuji dengan fixture. |
| U07 | Tolak jurnal yang tidak valid/di luar kelas | Coba status di luar daftar, tanggal tidak valid, catatan lebih dari 5000 karakter, serta `id_jadwal` dari kelas lain. | Input tidak valid ditolak HTTP 422; jadwal kelas lain ditolak HTTP 403; tidak ada jurnal yang berubah. | Validasi status dan tanggal tercakup unit test; seluruh respons endpoint dan DB belum diuji. |
| U08 | Laporan jurnal dan rentang tanggal | Panggil `GET /api/siswa/laporan?tanggal_mulai=...&tanggal_akhir=...` dengan rentang valid, tanggal terbalik, dan tanggal mustahil. | Rentang valid hanya menghitung jurnal kelas sesi dan mengelompokkan berdasarkan tanggal/status; rentang tidak valid ditolak HTTP 422. | Validasi tanggal dasar tercakup unit test; agregasi endpoint belum diuji dengan fixture. |
| U09 | Cek NIP dan nama guru | Buka registrasi guru; cek NIP terdaftar, NIP tidak dikenal, lalu ubah NIP setelah hasil tampil. | NIP terdaftar menampilkan nama pada field nonaktif; NIP tidak dikenal atau NIP yang diubah tidak mempertahankan nama/status verifikasi lama. | Tampilan nama dan pengosongan setelah NIP berubah tercakup tes frontend; integrasi API/DB belum diuji dengan fixture. |
| U10 | Aktivasi password dan registrasi wajah | Dengan guru uji terdaftar, buat password minimal 10 karakter, konfirmasi password, ambil lima sampel wajah, lalu simpan enrollment. Uji password pendek dan konfirmasi yang tidak sama. | Validasi password berjalan; enrollment valid mengirim NIP, password, dan embedding ke backend; aktivasi berhasil. Input invalid ditolak dengan pesan jelas. | Sintaks dan integritas referensi UI diuji; kamera, face model, dan penyimpanan database belum diuji end-to-end. |
| U11 | Koordinat GPS pada dashboard guru | Izinkan GPS di browser dan aktifkan kamera/model; amati ringkasan Lokasi GPS Guru. | Ringkasan menampilkan latitude/longitude perangkat dengan enam angka desimal dan akurasi perkiraan; saat izin/lokasi gagal, status menjelaskan lokasi tidak tersedia. | Sintaks JavaScript diuji; perilaku GPS nyata dan tampilan perangkat belum diuji. |
| U12 | Batas geofence presensi | Isi `konfigurasi_sekolah` pada database uji. Kirim koordinat guru pada jarak kurang dari 50 m, tepat 50 m, dan lebih dari 50 m; ulangi dengan `radius_meter` konfigurasi lebih kecil dari 50 m. | Jarak dihitung dari titik database sekolah. Jarak sampai batas efektif diterima; jarak di luarnya ditolak HTTP 403 dengan jarak aktual dan batas; batas efektif tidak pernah lebih dari 50 m dan radius yang lebih kecil tetap berlaku. | Helper Haversine dan pembatasan radius lulus pemeriksaan backend; endpoint, penyimpanan log, dan GPS nyata belum diuji dengan fixture. |
| U13 | Koordinat sekolah kosong/tidak valid | Kosongkan konfigurasi sekolah atau masukkan latitude/longitude di luar rentang pada database uji, lalu coba presensi. | Presensi ditolak HTTP 503 dengan pesan konfigurasi lokasi belum tersedia/tidak valid; tidak ada log presensi baru. | Validasi HTTP/database belum diuji dengan fixture. |
| U14 | API lokal dan origin browser | Jalankan backend pada port 8000 dan frontend pada origin yang disetel sebagai `APP_ORIGIN`; lakukan preflight dan GET `/api/auth/csrf`. Ulangi dengan origin yang tidak diizinkan. | Origin terdaftar menerima preflight dan respons dengan kredensial; origin berbeda ditolak. URL API lokal mengarah ke backend lokal. | Origin `127.0.0.1:5500`: preflight HTTP 204 dan CSRF HTTP 200; variasi origin terlarang dan konfigurasi deployment belum diuji ulang. |

## Petunjuk menjalankan pengujian

Dari root repository:

```powershell
node --test test\frontend.test.js
php test\run.php
php -l src\backend\src\auth.php
php -l src\backend\public\index.php
```

Pengujian yang memanggil API memerlukan backend berjalan dan konfigurasi database **uji**. Pastikan `APP_ORIGIN` sama persis dengan origin frontend, termasuk skema, hostname, dan port. Jangan menaruh kata sandi atau data pribadi pada bukti tangkapan layar/log.
