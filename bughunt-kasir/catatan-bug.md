# Catatan Bug Hunt: Kasir Kantin STEAM

**Nama Team: GeoKBM-Live** T

Bug di bawah dicatat berdasarkan spesifikasi resmi pada `README.md`. Tes berada
di folder `test/` (bukan `tes/`) sesuai lokasi file pada proyek saat ini.

## Bug 1 — Validasi jumlah pesanan
- **Gejala:** Jumlah kosong, nol, negatif, pecahan, atau lebih dari 99 dapat diterima. Penambahan produk yang sama dari input tampilan juga dapat menggabungkan teks, bukan menjumlahkan angka.
- **Langkah untuk memunculkan bug:** Tambahkan produk dengan jumlah `0`, `-1`, `1.5`, atau `100`; atau tambahkan Es Teh sebanyak 2 lalu 3 dan amati jumlahnya.
- **Aturan bisnis yang dilanggar:** Aturan 1 dan 2.
- **Penyebab:** `tambahItem` di `kasir.js` tidak memvalidasi jumlah maupun batas jumlah gabungan. `app.js` meneruskan `elQty.value` sebagai string.
- **Perbaikan:** `tambahItem` memvalidasi jumlah agar bilangan bulat 1–99 dan menolak jumlah gabungan di atas 99. `app.js` mengonversi input menjadi angka sebelum memanggil fungsi tersebut.
- **Test yang membuktikan:** `test/validasi-qty.test.js`.
- **Commit perbaikan:** `fc9b5b9` — `perbaikan error test failed dan member dengan subtotal 150.000 hanya dapat 10%, bukan 15%` (commit ini juga mencakup bug 2–4).
- **Ditemukan oleh:** Bersama tim(dengan bantuan AI).

## Bug 2 — Diskon member dan non-member digabung
- **Gejala:** Member dengan subtotal di atas Rp100.000 mendapat diskon 15%, bukan hanya diskon member sebesar 10%.
- **Langkah untuk memunculkan bug:** Hitung diskon member dengan subtotal Rp150.000; hasil semula Rp22.500.
- **Aturan bisnis yang dilanggar:** Aturan 4 — hanya satu jenis diskon yang berlaku.
- **Penyebab:** `hitungDiskon` di `kasir.js` menambahkan diskon non-member 5% dan diskon member 10%.
- **Perbaikan:** Perhitungan diskon member dan diskon non-member dibuat eksklusif; member hanya mendapat diskon 10%.
- **Test yang membuktikan:** `test/diskon.test.js`, termasuk tes member dengan subtotal Rp150.000 dan Rp100.001.
- **Commit perbaikan:** `fc9b5b9` — `perbaikan error test failed dan member dengan subtotal 150.000 hanya dapat 10%, bukan 15%` (commit ini juga mencakup bug 1, 3, dan 4).
- **Ditemukan oleh:** Bersama tim(dengan bantuan AI).

## Bug 3 — Batas minimum diskon non-member
- **Gejala:** Non-member dengan subtotal tepat Rp100.000 tidak mendapat diskon.
- **Langkah untuk memunculkan bug:** Hitung diskon non-member dengan subtotal Rp100.000; hasil semula Rp0.
- **Aturan bisnis yang dilanggar:** Aturan 4 — diskon berlaku pada subtotal minimal Rp100.000.
- **Penyebab:** `hitungDiskon` menggunakan kondisi `subtotal > 100000`, sehingga nilai yang tepat Rp100.000 tidak memenuhi syarat.
- **Perbaikan:** Kondisi ambang diubah menjadi `subtotal >= 100000`.
- **Test yang membuktikan:** `test/diskon.test.js`, terutama tes non-member dengan subtotal Rp100.000 serta Rp99.999.
- **Commit perbaikan:** `fc9b5b9` — `perbaikan error test failed dan member dengan subtotal 150.000 hanya dapat 10%, bukan 15%` (commit ini juga mencakup bug 1, 2, dan 4).
- **Ditemukan oleh:** Bersama tim (dengan bantuan AI).

## Bug 4 — Pembulatan PPN
- **Gejala:** PPN selalu dibulatkan ke bawah; misalnya 11% dari Rp5 adalah 0,55 dan dihitung menjadi Rp0, bukan Rp1.
- **Langkah untuk memunculkan bug:** Panggil `hitungPPN(5)`; hasil semula `0`.
- **Aturan bisnis yang dilanggar:** Aturan 5 — PPN dibulatkan ke rupiah terdekat, dengan 0,5 ke atas dibulatkan naik.
- **Penyebab:** `hitungPPN` di `kasir.js` menggunakan `Math.floor`.
- **Perbaikan:** Pembulatan diubah menjadi `Math.round`.
- **Test yang membuktikan:** `test/ppn.test.js`, termasuk kasus PPN Rp0,55 dan Rp1.600,5.
- **Commit perbaikan:** `fc9b5b9` — `perbaikan error test failed dan member dengan subtotal 150.000 hanya dapat 10%, bukan 15%` (commit ini juga mencakup bug 1–3).
- **Ditemukan oleh:** Bersama tim(dengan bantuan AI).

## Bug 5 — Pembayaran kurang tidak ditolak
- **Gejala:** Pembayaran di bawah total menghasilkan kembalian negatif dan dapat ditampilkan sebagai pembayaran berhasil.
- **Langkah untuk memunculkan bug:** Panggil `hitungKembalian(10000, 5000)`; fungsi semula menghasilkan `-5000` tanpa menolak transaksi.
- **Aturan bisnis yang dilanggar:** Aturan 7.
- **Penyebab:** `hitungKembalian` di `kasir.js` langsung mengurangi total dari pembayaran tanpa memeriksa kekurangannya.
- **Perbaikan:** Fungsi melempar error dengan pesan `Uang pembayaran kurang` jika pembayaran lebih kecil daripada total. `app.js` menangkap error dan menampilkan pesannya.
- **Test yang membuktikan:** `test/pembayaran-kurang.test.js`, mencakup pembayaran kurang, pas, dan lebih.
- **Commit perbaikan:** `694ba7a` — `perbaikan bug bayar kurang dari total harus ditolak dengan pesan 'Uang pembayaran kurang'`.
- **Ditemukan oleh:** Bersama tim(dengan bantuan AI).

## Catatan tambahan
- Jalur impor pada `contoh.test.js` disesuaikan dari `../kasir.js` menjadi `./kasir.js` karena kedua file berada di folder `bughunt-kasir/`.
- Pada pemeriksaan terakhir, `node --test` lulus dengan 49 tes dan 0 kegagalan.
- Sesuai riwayat Git, bug 1–4 tercatat dalam satu commit (`fc9b5b9`), bukan commit terpisah per bug. Bug 5 memiliki commit tersendiri (`694ba7a`).
