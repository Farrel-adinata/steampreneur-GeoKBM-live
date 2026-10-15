

# Kasus Uji GeoKBM Live

Kasus berikut diturunkan dari kontrak API yang ada. Kolom hasil aktual sengaja tidak dinyatakan lulus: tidak ada test runner/unit test dalam repository dan kasus integrasi ini belum dijalankan pada database uji dalam sesi dokumentasi. Gunakan akun serta database uji, bukan data produksi. Router membuka koneksi DB sebelum memanggil handler, sehingga kasus validasi input juga mensyaratkan backend dan database dapat terhubung.

| ID | Kriteria yang diuji | Langkah / input | Hasil yang diharapkan | Hasil sebenarnya | Lulus? | Bukti |
|---|---|---|---|---|---|---|
| U01 | Validasi login guru untuk input kosong (input salah) | `POST /api/guru/login` dengan `{}` | HTTP 422 dan JSON menjelaskan `nip` wajib diisi; tidak membuat sesi. | Belum diuji. | Belum | Belum tersedia; ambil screenshot pesan error dan simpan respons JSON tanpa data pribadi. |
| U02 | Login guru dengan akun uji yang valid | Kirim `{ "nip": "<NIP_UJI>", "password_polos": "<PASSWORD_UJI>" }` dari `geokbm_frontend_users/guru/index.html`. | Respons sukses berisi `data_guru`; frontend menyimpan sesi dan membuka `home.html`. | Belum diuji ulang dalam sesi ini. | Belum | `UI-Screenshot/Guru(Login).png` hanya bukti tampilan, bukan bukti respons login. Capture hasil uji aktual. |
| U03 | Geofence menolak lokasi di luar radius | Dengan guru uji ber-embedding valid, kirim koordinat yang jaraknya lebih besar dari `konfigurasi_sekolah.radius_meter`. | HTTP 403, log absensi tidak bertambah. | Belum diuji. | Belum | Capture respons dan bandingkan jumlah log pada database uji. |
| U04 | Batas geofence dan batas similarity | Dalam database uji, gunakan koordinat dengan jarak tepat sama dengan radius dan embedding dengan skor tepat `THRESHOLD_WAJAH` (0.45); pastikan dimensi embedding cocok. | Tahap lokasi/wajah menerima nilai batas karena handler menolak hanya jika jarak `>` radius atau skor `<` threshold; satu log `Hadir` tersimpan. | Belum diuji. | Belum | Belum tersedia. Catat radius, skor hasil hitung, respons API, dan baris log uji. |
| U05 | Status jurnal tidak valid (input salah) | `POST /api/siswa/jurnal` dengan data wajib terisi tetapi `status_guru: "Hadir Sekali"`. | HTTP 422; status ditolak dan jurnal tidak dibuat/diubah. | Belum diuji. | Belum | Belum tersedia; capture respons API dan cek jurnal database uji. |
| U06 | Simpan dan baca jurnal ketua kelas | Pilih kelas/tanggal/jadwal, simpan status `Hadir` dan catatan, lalu muat ulang jurnal. | API menyimpan/update jurnal untuk tanggal+jadwal; status dan catatan tampil kembali, kolom materi/catatan guru tidak ditimpa. | Belum diuji. | Belum | `UI-Screenshot/Siswa(Junal-KBM).png` adalah tampilan; tambahkan bukti hasil uji aktual. |

## Unit test otomatis
**Nama file test:** Tidak ditemukan.
**Jumlah test:** Tidak ada test otomatis yang terdaftar dalam repository. Jangan menulis angka kelulusan sebelum test benar-benar dibuat dan dijalankan.

## Petunjuk menjalankan kasus API
Jalankan pada database uji dengan base URL yang sesuai. Untuk validasi tanpa kredensial, misalnya `curl -i -X POST <API_BASE>/api/guru/login -H "Content-Type: application/json" -d "{}"`; hasil yang diharapkan adalah HTTP 422. Kasus absensi/jurnal membutuhkan data fixture dan perlu diverifikasi tanpa mengubah database produksi.
