# Spesifikasi Produk

**Nama tim:** GeoKBM Live (SMK Negeri 1 Kuwus)
**Anggota Tim:** Ananiasti A. Mirta, Nevriana Kartika, Farrel Adinata Garsi.
**Nama produk:** GeoKBM Live — Sistem Informasi Absensi Guru dan Jurnal KBM berbasis ArcFace dan geolokasi.
**Alur inti yang dibangun:** Guru login, memverifikasi wajah dan lokasi untuk mencatat absensi, lalu guru dan ketua kelas mengisi jurnal KBM digital yang dapat dipantau pihak sekolah.


## 1. Masalah
Dokumen lapangan menyebut absensi manual/fingerprint belum memastikan identitas dan lokasi secara bersamaan. Jurnal KBM masih dicatat di buku; pencatatan membutuhkan waktu, dapat terlambat/tidak lengkap, dan buku dapat rusak atau hilang. Akibatnya, data kehadiran dan kegiatan belajar sulit dipantau dan direkap dengan cepat.

## 2. Pengguna
- **Guru pengajar:** membutuhkan login, absensi dari ponsel dengan verifikasi wajah dan GPS, riwayat absensi, serta pengisian materi/catatan jurnal.
- **Ketua kelas:** membutuhkan jadwal KBM dan cara digital untuk mencatat status kehadiran guru serta catatan kelas.
- **Admin sekolah:** membutuhkan pengelolaan data induk, akun, peran, dan jadwal.
- **Kepala sekolah/kurikulum/wali kelas:** membutuhkan ringkasan absensi dan jurnal per tanggal/kelas untuk pemantauan.

## 3. Hasil wawancara calon pengguna
**Narasumber (peran saja):** guru pengajar dan ketua kelas. Dokumen juga memuat persona kepala sekolah; pemetaan persona dengan daftar narasumber tidak sepenuhnya konsisten dan perlu dikonfirmasi tim.
**Cara dan tanggal:** wawancara dicatat pada Rabu, 1 Oktober 2026. Dokumen menyebut lokasi sekolah/ruang kelas dan izin rekaman lisan; metode tatap muka tersirat dari lokasi tetapi tidak ditulis sebagai label metode. Observasi tercatat 2 Oktober 2026.

| Pertanyaan kami | Jawaban narasumber (ringkasan tanpa identitas pribadi) |
|---|---|
| Apa kendala absensi yang berjalan sekarang? | Guru menyebut proses manual memakan waktu dan pencatatan kehadiran belum efisien/akurat. |
| Apa kendala jurnal KBM? | Guru dan ketua kelas menyebut jurnal berbuku dapat memakan waktu, tidak lengkap/terlupa, serta berisiko hilang atau rusak. |
| Apa yang dibutuhkan? | Absensi digital yang lebih cepat dan jurnal KBM digital yang praktis, terintegrasi, tersimpan, dan mudah direkap/dipantau. |

**Observasi :** pencatatan masih manual; pengisian jurnal kelas disebut memerlukan sekitar 5–15 menit. 

## 4. Fitur wajib (alur inti)
1. Guru dapat login menggunakan NIP dan kata sandi.
2. Aplikasi guru meminta kamera/GPS, menjalankan verifikasi liveness/wajah, mengirim embedding dan koordinat untuk diverifikasi backend, lalu menampilkan hasil serta riwayat absensi.
3. Guru dapat mengisi bagian jurnal milik guru; ketua kelas dapat melihat jadwal dan mengisi status guru/catatan kelas.
4. Pihak sekolah dapat melihat dashboard, absensi, jurnal, dan laporan sesuai halaman portal monitor.

## 5. Di luar cakupan
- Integrasi ke perangkat fingerprint fisik atau sistem SIM sekolah komersial.
- Jaminan akurasi biometrik tanpa uji lapangan lintas perangkat, cahaya, dan kondisi pengguna.
- Kebijakan retensi/penghapusan biometrik, persetujuan digital, dan audit keamanan produksi belum dijelaskan dalam dokumen ini.
- Change request pencarian/filter/ekspor CSV pada template challenge kantin tidak tercantum sebagai kebutuhan GeoKBM Live di DOCX; jangan dianggap fitur yang disepakati.

## 6. Aturan bisnis dan perhitungan
- Absensi ditolak jika jarak Haversine dari koordinat sekolah **lebih besar** daripada `konfigurasi_sekolah.radius_meter`; jarak tepat pada radius masih lolos tahap lokasi.
- Backend absensi memakai embedding 512D dan threshold cosine similarity `0.45`. Handler juga menerima 128D sebagai transisi, tetapi dimensi harus sama dengan embedding tersimpan. Nilai ini adalah konfigurasi kode, bukan bukti akurasi yang telah divalidasi di lapangan.
- Handler absensi memeriksa GPS lebih dahulu, lalu data embedding guru dan kecocokan wajah. Jika lolos keduanya, backend menyimpan log berstatus `Hadir`.
- Status guru pada jurnal siswa hanya boleh `Hadir`, `Tidak Hadir`, `Izin`, `Sakit`, atau `Diganti`.
- Guru mengisi `materi`/`catatan_guru`; siswa mengisi `status_guru`/`catatan_siswa`. Penyimpanan jurnal memakai pasangan tanggal dan jadwal sebagai kunci unik/upsert.
- Login guru mengirim `nip` dan `password_polos`; login siswa/monitor mengirim `username` dan `password`.

## 7. Data yang disimpan
| Data | Contoh isi | Disimpan di mana |
|---|---|---|
| Profil guru | NIP, nama, hash kata sandi, embedding wajah | MySQL, tabel `guru` |
| Log absensi | Waktu, koordinat, jarak, skor kemiripan, status | MySQL, tabel `log_absensi` |
| Konfigurasi sekolah | Koordinat dan radius geofence | MySQL, tabel `konfigurasi_sekolah` |
| Data KBM | Jadwal, kelas, jam, mata pelajaran | MySQL, tabel master terkait |
| Jurnal | Tanggal, jadwal, materi, status, catatan guru/siswa | MySQL, tabel `jurnal_kbm` |
| Akun dan hak akses | Username/email, hash kata sandi, role | MySQL, `users`, `roles`, `user_roles` |
| Sesi browser | Identitas/sesi guru atau token admin/monitor | `localStorage` atau `sessionStorage` sesuai frontend |
| URL API frontend | `API_BASE` | File publik `env.js`; `.env` frontend tidak dibaca otomatis oleh browser |

## 8. Kriteria "selesai"
- [ ] Dengan akun uji yang diizinkan, login guru menerima payload yang sesuai dan menampilkan halaman guru; kredensial uji tidak disimpan di dokumen publik.
- [ ] Permintaan absensi di luar radius ditolak, dan permintaan pada radius yang diizinkan hanya tersimpan jika verifikasi wajah juga lulus.
- [ ] Jurnal dapat diisi oleh guru dan ketua kelas tanpa menghapus kolom milik peran lain.
- [ ] Portal monitor menampilkan ringkasan/daftar sesuai tanggal dan kelas yang dipilih.
- [ ] Kasus uji di `04-kasus-uji.md` dijalankan pada database uji dan bukti hasil aktual dilampirkan.
- [ ] Setiap anggota memeriksa serta menulis ulang bagian penjelasan kodenya sendiri sebelum dokumen dikumpulkan.
