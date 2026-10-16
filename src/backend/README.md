# GeoKBM Live API

Backend PHP 8.1+ dengan PDO MySQL/MariaDB. Endpoint JSON menggunakan sesi PHP, cookie `HttpOnly`, dan token CSRF untuk request yang mengubah data.

## Prasyarat

- PHP 8.1 atau lebih baru dengan `pdo_mysql`.
- MySQL 8+ atau MariaDB 10.4+ untuk import schema.
- Browser/frontend berada pada origin yang ditentukan di `APP_ORIGIN`.

## Persiapan database lokal

1. Buat database lokal kosong untuk pengembangan, misalnya `geokbm_test`.
2. Import `db/schema.sql` ke database kosong tersebut.
3. Opsional (legacy): jalankan `db/migrations/001_guru_enrollment_tokens.sql`. Alur registrasi saat ini tidak lagi memakai tabel token enrollment.
4. Jangan mengimpor dump `db/sekolah_absensi.sql` untuk pengembangan aplikasi: file tersebut adalah dump sumber yang mengandung data pribadi dan biometrik.
5. Tambahkan data uji sintetis sendiri ke database lokal. Jangan memakai NIP, nama, kata sandi, hash, koordinat, atau embedding dari dump sumber.

## Konfigurasi lokal

Gunakan `.env.example` sebagai daftar variable yang harus disediakan oleh environment lokal. Backend membaca environment variables proses (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `APP_ORIGIN`, `APP_TIMEZONE`, `APP_DEBUG`); PHP built-in server tidak memuat file `.env` secara otomatis. Jangan commit kredensial atau menaruhnya di frontend.

Contoh PowerShell (ganti placeholder dengan kredensial khusus database uji lokal):

```powershell
$env:DB_HOST = '127.0.0.1'
$env:DB_NAME = 'geokbm_test'
$env:DB_USER = 'geokbm_local'
$env:DB_PASS = '<PASSWORD_DATABASE_UJI>'
$env:APP_ORIGIN = 'http://127.0.0.1:5500'
$env:APP_TIMEZONE = 'Asia/Makassar'
$env:APP_DEBUG = '0'
```

## Menjalankan server pengembangan

Dari folder backend:

```powershell
php -S 127.0.0.1:8000 -t public router.php
```

Endpoint API tersedia di `http://127.0.0.1:8000/api/...`. Origin frontend development default adalah `http://127.0.0.1:5500`; setel `APP_ORIGIN` ke origin frontend yang sebenarnya jika berbeda. Gunakan hostname konsisten (`127.0.0.1` atau `localhost`) agar cookie sesi bekerja. HTTPS wajib digunakan di luar development lokal.

Frontend pada `localhost` atau `127.0.0.1` menggunakan backend pada port `8000`. Saat deployment, frontend memakai origin halamannya sebagai API secara default. Jika API berada di host berbeda, tetapkan `window.GEOKBM_ENV.API_BASE` sebelum memuat `js/config.js` pada halaman frontend, lalu pastikan `APP_ORIGIN` backend cocok dengan origin frontend.

## Login dan keamanan sesi

- Guru login dengan `POST /api/guru/login` dan payload `{ "nip": "...", "password_polos": "..." }`.
- Siswa/ketua kelas, admin, dan monitor login melalui route masing-masing dengan `{ "username": "...", "password": "..." }`.
- Sesi disimpan pada cookie `HttpOnly`; browser mendapatkan CSRF token melalui login atau `GET /api/auth/csrf`.
- Kirim `X-CSRF-Token` untuk `POST`, `PUT`, dan `DELETE` sesudah login/enrollment CSRF.
- Guru mengaktifkan akun melalui `POST /api/guru/register` dengan `nip`, `password_polos`, dan `embedding` setelah `GET /api/guru/cek-nip` menampilkan status terdaftar beserta nama guru. Data guru harus dibuat admin lebih dahulu (resource `guru`).
- Tidak tersedia cara aman untuk bootstrap admin otomatis. Admin pertama harus dibuat secara manual melalui proses lokal tepercaya dengan hash password dan role yang disiapkan sesuai schema.

## Endpoint utama

| Method | Endpoint | Akses |
|---|---|---|
| GET | `/api/auth/me`, `/api/auth/csrf` | Publik/sesi |
| POST | `/api/auth/logout` | Sesi login + CSRF |
| POST | `/api/guru/login` | Login guru |
| GET | `/api/guru/cek-nip?nip=...` | Publik; status terdaftar + nama guru |
| POST | `/api/guru/register` | NIP terdaftar + CSRF |
| POST | `/api/guru/absen` | Guru + CSRF |
| GET | `/api/guru/riwayat` | Guru |
| GET/PUT | `/api/guru/jurnal` | Guru; PUT + CSRF |
| POST | `/api/siswa/login` | Login ketua kelas |
| GET | `/api/siswa/jadwal`, `/api/siswa/jurnal`, `/api/siswa/laporan` | Ketua kelas |
| POST | `/api/siswa/jurnal` | Ketua kelas + CSRF |
| POST | `/api/admin/login` | Login admin |
| GET/POST/PUT/DELETE | `/api/admin/{resource}` | Admin; mutasi + CSRF |
| POST | `/api/monitor/login` | Login monitor |
| GET | `/api/monitor/{kelas,dashboard,absensi-guru,jurnal-kelas,laporan}` | Monitor |

Untuk endpoint admin, resource yang didukung disesuaikan dengan tabel master di schema. Mutasi memakai `?id=...` untuk PUT/DELETE dan hanya menerima field yang diizinkan.

## Batasan yang perlu diketahui

- Threshold cosine similarity 0.45 mengikuti spesifikasi proyek, bukan hasil validasi akurasi biometrik di lapangan.
- Backend membandingkan embedding hasil inferensi browser dengan embedding tersimpan. Pipeline inferensi dan kesesuaian model harus diverifikasi terpisah menggunakan data uji yang sah.
- Proteksi CSRF dan sesi mencegah pola umum pemalsuan request, tetapi bukan pengganti HTTPS, rate limiting, audit akses, backup, atau kebijakan privasi/retensi biometrik untuk produksi.
- Endpoint pembuatan jurnal otomatis berpotensi mengisi status default `Hadir`; jalankan hanya atas tindakan admin yang sadar, dan tinjau alur sekolah sebelum penggunaan produksi.
