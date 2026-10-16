# Refleksi Tim

Refleksi ini disusun dari riwayat pengerjaan, perubahan kode, dan pengujian yang tercatat. Hal yang tidak tercatat—seperti pembagian tugas anggota dan waktu aktual—tidak diasumsikan; tim perlu meninjau dan menyesuaikan bagian tersebut dengan pengalaman semua anggota sebelum dokumen dikumpulkan.

## 1. Apa yang berjalan baik dalam cara kami bekerja dengan AI?

Pekerjaan dibagi menjadi kebutuhan yang cukup spesifik: backend, portal guru, portal ketua kelas, geofence, onboarding, dokumentasi, dan pengujian. Memeriksa kode dan kontrak API sebelum mengubah fitur membantu menjaga frontend agar mengikuti perilaku backend. Perubahan juga divalidasi dengan test runner yang tersedia, pemeriksaan sintaks PHP, dan pemeriksaan whitespace, bukan hanya mengandalkan tampilan kode.

## 2. Kapan AI paling membantu? Kapan AI justru menyulitkan?

AI paling membantu untuk menelusuri alur lintas halaman/API, membuat halaman responsif dari pola referensi, serta mengubah aturan kebutuhan menjadi pemeriksaan dan pesan yang lebih jelas. AI juga membantu mengidentifikasi bahwa data kelas siswa harus ditentukan dari sesi backend, bukan dipercaya dari parameter yang dikirim browser.

AI menyulitkan ketika pesan “tidak dapat terhubung” dianggap hanya sebagai masalah URL. Pemeriksaan tanpa header `Origin` tidak menunjukkan penolakan CORS yang dialami browser; diagnosis baru lengkap setelah request dengan origin frontend diuji. Kasus ini mengingatkan kami untuk mereproduksi error dalam kondisi yang mendekati browser.

## 3. Kesalahan terbesar yang hampir lolos, dan bagaimana kami menemukannya?

Kesalahan yang paling berdampak adalah mengira API telah dapat diakses hanya karena endpoint merespons tanpa `Origin`. Browser dari `http://127.0.0.1:5500` tetap ditolak backend ketika `APP_ORIGIN` kosong. Kami menemukannya dengan menguji preflight dan request API menggunakan header origin yang sama dengan frontend, lalu memverifikasi respons setelah konfigurasi lokal diperbaiki.

Peninjauan dokumentasi juga menemukan dua hal yang perlu dibedakan dengan jujur: test runner ternyata sudah tersedia meskipun dokumen lama menyatakan sebaliknya, dan onboarding menyimpan penanda selesai tetapi belum menggunakan penanda itu untuk menentukan slide awal saat halaman dibuka kembali. Temuan onboarding tersebut masih perlu diperbaiki dan diuji.

## 4. Apa yang akan kami lakukan berbeda jika mengulang challenge ini?

Kami akan menetapkan lebih awal kontrak API, konfigurasi environment untuk development dan deployment, serta fixture database uji. Setelah itu kami akan menguji alur per peran dari browser: login, hak akses, baca/tulis jurnal, dan laporan. Untuk fitur kamera dan GPS, kami akan menguji pada perangkat nyata serta mencatat batas pengujian manual dengan jelas.

Kami juga akan menulis analisis change request sebelum perubahan kode jika proses penilaian mensyaratkannya, menjaga dokumentasi kasus uji tetap sesuai test runner, dan meminta persetujuan tim sebelum mengerjakan permintaan yang tidak tercantum di spesifikasi.

## 5. Bagaimana kami mengatur waktu? Langkah mana yang jauh lebih lama dari estimasi, dan kenapa?

Rencana proyek mencatat estimasi, tetapi waktu aktual dan pembagian tugas anggota belum tercatat secara memadai. Karena itu kami belum dapat menyimpulkan langkah mana yang melewati estimasi tanpa mengarang data. Untuk pekerjaan berikutnya, kami akan mencatat waktu mulai/selesai dan hambatan per langkah—terutama integrasi API, konfigurasi CORS, pengujian database, serta validasi kamera/GPS—agar evaluasi waktu dapat didukung bukti.

## 6. Bagian mana dari kode yang masih belum kami pahami sepenuhnya?

Sebelum menyatakan seluruh kode dipahami, anggota tim perlu meninjau dan dapat menjelaskan sendiri:

- autentikasi berbasis sesi, token CSRF, pembatasan role, dan konfigurasi CORS/origin;
- perhitungan Haversine, batas radius efektif 50 meter, serta perbandingan embedding wajah;
- relasi jadwal, jurnal, dan kelas, termasuk upsert jurnal dan agregasi laporan;
- alur promise/event pada frontend, pengelolaan error jaringan, kamera, GPS, serta state onboarding.

Tes otomatis yang lulus memeriksa sebagian helper, struktur halaman, dan sintaks; hasil tersebut tidak membuktikan bahwa setiap alur integrasi sudah dipahami atau diuji end-to-end. Setiap anggota perlu menulis ulang penjelasan berdasarkan bagian yang benar-benar telah dipelajari.
