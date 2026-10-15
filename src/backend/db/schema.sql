-- Schema-only export derived from source DDL. No records or seeded data.
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE `guru` (
  `id` int(11) NOT NULL,
  `nip` varchar(50) DEFAULT NULL,
  `nama` varchar(150) NOT NULL,
  `gelar_depan` varchar(30) DEFAULT NULL,
  `gelar_belakang` varchar(50) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `no_hp` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `face_embedding` longtext DEFAULT NULL,
  `status_aktif` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `jadwal_kbm` (
  `id_jadwal` int(11) NOT NULL,
  `id_kelas` int(11) NOT NULL,
  `hari` enum('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu') NOT NULL,
  `id_jam` int(11) NOT NULL,
  `id_mapel` int(11) NOT NULL,
  `id_guru` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `jam_pelajaran` (
  `id_jam` int(11) NOT NULL,
  `jam_ke` int(11) NOT NULL,
  `jam_mulai` time NOT NULL,
  `jam_selesai` time NOT NULL,
  `jenis` enum('KBM','ISTIRAHAT') NOT NULL DEFAULT 'KBM',
  `keterangan` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `jurnal_kbm` (
  `id_jurnal` int(11) NOT NULL,
  `tanggal` date NOT NULL,
  `id_jadwal` int(11) NOT NULL,
  `id_guru` int(11) NOT NULL,
  `status_guru` enum('Hadir','Tidak Hadir','Izin','Sakit','Diganti') NOT NULL DEFAULT 'Hadir',
  `materi` text DEFAULT NULL,
  `catatan_guru` text DEFAULT NULL,
  `catatan_siswa` text NOT NULL,
  `id_siswa_pengisi` int(11) DEFAULT NULL,
  `waktu_diisi` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `kategori_mapel` (
  `id_kategori` int(11) NOT NULL,
  `nama_kategori` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `kelas` (
  `id_kelas` int(11) NOT NULL,
  `nama_kelas` varchar(50) NOT NULL,
  `id_rombel` int(11) DEFAULT NULL,
  `wali_kelas` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `konfigurasi_sekolah` (
  `id` int(11) NOT NULL,
  `nama_sekolah` varchar(100) NOT NULL,
  `latitude` double NOT NULL,
  `longitude` double NOT NULL,
  `radius_meter` int(11) DEFAULT 50
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `log_absensi` (
  `id` int(11) NOT NULL,
  `guru_id` int(11) NOT NULL,
  `waktu_absen` timestamp NOT NULL DEFAULT current_timestamp(),
  `latitude_absen` double NOT NULL,
  `longitude_absen` double NOT NULL,
  `jarak_dari_sekolah_meter` int(11) NOT NULL,
  `skor_kemiripan_wajah` float NOT NULL,
  `status` varchar(20) DEFAULT 'Hadir'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `mata_pelajaran` (
  `id_mapel` int(11) NOT NULL,
  `kode_mapel` varchar(20) NOT NULL,
  `nama_mapel` varchar(100) NOT NULL,
  `id_kategori` int(11) DEFAULT NULL,
  `id_guru` int(11) NOT NULL,
  `total_jam_minggu` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `presensi_siswa` (
  `id_presensi` int(11) NOT NULL,
  `id_jurnal` int(11) NOT NULL,
  `id_siswa` int(11) NOT NULL,
  `status` enum('Hadir','Sakit','Izin','Alpa') NOT NULL DEFAULT 'Hadir'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `program_keahlian` (
  `id_jurusan` int(11) NOT NULL,
  `kode_jurusan` varchar(10) NOT NULL,
  `nama_jurusan` varchar(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `roles` (
  `id_role` int(11) NOT NULL,
  `kode_role` varchar(30) NOT NULL,
  `nama_role` varchar(80) NOT NULL,
  `deskripsi` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `rombel` (
  `id_rombel` int(11) NOT NULL,
  `id_tingkat` int(11) NOT NULL,
  `id_jurusan` int(11) NOT NULL,
  `paralel` varchar(2) DEFAULT NULL,
  `id_tahun_ajaran` int(11) NOT NULL,
  `nama_rombel` varchar(30) NOT NULL,
  `jumlah_siswa` smallint(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `siswa` (
  `id_siswa` int(11) NOT NULL,
  `nis` varchar(20) NOT NULL,
  `nama_siswa` varchar(100) NOT NULL,
  `id_kelas` int(11) NOT NULL,
  `is_ketua_kelas` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `tahun_ajaran` (
  `id_tahun_ajaran` int(11) NOT NULL,
  `kode` varchar(9) NOT NULL,
  `semester` enum('Ganjil','Genap') NOT NULL,
  `is_aktif` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `tingkat` (
  `id_tingkat` int(11) NOT NULL,
  `kode_tingkat` varchar(5) NOT NULL,
  `urutan` tinyint(4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `users` (
  `id_user` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `id_guru` int(11) DEFAULT NULL COMMENT 'Relasi ke guru (role guru, wali kelas, kepsek, piket, kurikulum)',
  `id_siswa` int(11) DEFAULT NULL COMMENT 'Relasi ke siswa (role ketua kelas)',
  `is_aktif` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `user_roles` (
  `id` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
  `id_role` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `guru`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nip` (`nip`);

ALTER TABLE `jadwal_kbm`
  ADD PRIMARY KEY (`id_jadwal`),
  ADD UNIQUE KEY `uq_jadwal` (`id_kelas`,`hari`,`id_jam`),
  ADD KEY `id_jam` (`id_jam`),
  ADD KEY `id_mapel` (`id_mapel`),
  ADD KEY `id_guru` (`id_guru`);

ALTER TABLE `jam_pelajaran`
  ADD PRIMARY KEY (`id_jam`);

ALTER TABLE `jurnal_kbm`
  ADD PRIMARY KEY (`id_jurnal`),
  ADD UNIQUE KEY `uq_jurnal` (`tanggal`,`id_jadwal`),
  ADD KEY `id_jadwal` (`id_jadwal`),
  ADD KEY `id_guru` (`id_guru`),
  ADD KEY `id_siswa_pengisi` (`id_siswa_pengisi`);

ALTER TABLE `kategori_mapel`
  ADD PRIMARY KEY (`id_kategori`),
  ADD UNIQUE KEY `nama_kategori` (`nama_kategori`);

ALTER TABLE `kelas`
  ADD PRIMARY KEY (`id_kelas`),
  ADD KEY `wali_kelas` (`wali_kelas`),
  ADD KEY `id_rombel` (`id_rombel`);

ALTER TABLE `konfigurasi_sekolah`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `log_absensi`
  ADD PRIMARY KEY (`id`),
  ADD KEY `guru_id` (`guru_id`);

ALTER TABLE `mata_pelajaran`
  ADD PRIMARY KEY (`id_mapel`),
  ADD UNIQUE KEY `kode_mapel` (`kode_mapel`),
  ADD KEY `id_guru` (`id_guru`),
  ADD KEY `id_kategori` (`id_kategori`);

ALTER TABLE `presensi_siswa`
  ADD PRIMARY KEY (`id_presensi`),
  ADD UNIQUE KEY `uq_presensi` (`id_jurnal`,`id_siswa`),
  ADD KEY `id_siswa` (`id_siswa`);

ALTER TABLE `program_keahlian`
  ADD PRIMARY KEY (`id_jurusan`),
  ADD UNIQUE KEY `kode_jurusan` (`kode_jurusan`);

ALTER TABLE `roles`
  ADD PRIMARY KEY (`id_role`),
  ADD UNIQUE KEY `kode_role` (`kode_role`);

ALTER TABLE `rombel`
  ADD PRIMARY KEY (`id_rombel`),
  ADD UNIQUE KEY `uq_rombel` (`id_tingkat`,`id_jurusan`,`paralel`,`id_tahun_ajaran`),
  ADD KEY `fk_rombel_tingkat` (`id_tingkat`),
  ADD KEY `fk_rombel_jurusan` (`id_jurusan`),
  ADD KEY `fk_rombel_tahun` (`id_tahun_ajaran`);

ALTER TABLE `siswa`
  ADD PRIMARY KEY (`id_siswa`),
  ADD UNIQUE KEY `nis` (`nis`),
  ADD KEY `id_kelas` (`id_kelas`);

ALTER TABLE `tahun_ajaran`
  ADD PRIMARY KEY (`id_tahun_ajaran`),
  ADD UNIQUE KEY `kode` (`kode`),
  ADD UNIQUE KEY `uq_tahun_semester` (`kode`,`semester`);

ALTER TABLE `tingkat`
  ADD PRIMARY KEY (`id_tingkat`),
  ADD UNIQUE KEY `kode_tingkat` (`kode_tingkat`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id_user`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `id_guru` (`id_guru`),
  ADD KEY `id_siswa` (`id_siswa`);

ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_role` (`id_user`,`id_role`),
  ADD KEY `id_role` (`id_role`);

ALTER TABLE `guru`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `jadwal_kbm`
  MODIFY `id_jadwal` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `jam_pelajaran`
  MODIFY `id_jam` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `jurnal_kbm`
  MODIFY `id_jurnal` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `kategori_mapel`
  MODIFY `id_kategori` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `kelas`
  MODIFY `id_kelas` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `konfigurasi_sekolah`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `log_absensi`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `mata_pelajaran`
  MODIFY `id_mapel` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `presensi_siswa`
  MODIFY `id_presensi` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `program_keahlian`
  MODIFY `id_jurusan` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `roles`
  MODIFY `id_role` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `rombel`
  MODIFY `id_rombel` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `siswa`
  MODIFY `id_siswa` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tahun_ajaran`
  MODIFY `id_tahun_ajaran` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tingkat`
  MODIFY `id_tingkat` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `users`
  MODIFY `id_user` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `user_roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `jadwal_kbm`
  ADD CONSTRAINT `jadwal_kbm_ibfk_guru` FOREIGN KEY (`id_guru`) REFERENCES `guru` (`id`),
  ADD CONSTRAINT `jadwal_kbm_ibfk_jam` FOREIGN KEY (`id_jam`) REFERENCES `jam_pelajaran` (`id_jam`),
  ADD CONSTRAINT `jadwal_kbm_ibfk_kelas` FOREIGN KEY (`id_kelas`) REFERENCES `kelas` (`id_kelas`),
  ADD CONSTRAINT `jadwal_kbm_ibfk_mapel` FOREIGN KEY (`id_mapel`) REFERENCES `mata_pelajaran` (`id_mapel`);

ALTER TABLE `jurnal_kbm`
  ADD CONSTRAINT `jurnal_kbm_ibfk_guru` FOREIGN KEY (`id_guru`) REFERENCES `guru` (`id`),
  ADD CONSTRAINT `jurnal_kbm_ibfk_jadwal` FOREIGN KEY (`id_jadwal`) REFERENCES `jadwal_kbm` (`id_jadwal`),
  ADD CONSTRAINT `jurnal_kbm_ibfk_siswa` FOREIGN KEY (`id_siswa_pengisi`) REFERENCES `siswa` (`id_siswa`) ON DELETE SET NULL;

ALTER TABLE `kelas`
  ADD CONSTRAINT `kelas_ibfk_rombel` FOREIGN KEY (`id_rombel`) REFERENCES `rombel` (`id_rombel`) ON DELETE SET NULL,
  ADD CONSTRAINT `kelas_ibfk_wali` FOREIGN KEY (`wali_kelas`) REFERENCES `guru` (`id`) ON DELETE SET NULL;

ALTER TABLE `log_absensi`
  ADD CONSTRAINT `log_absensi_ibfk_1` FOREIGN KEY (`guru_id`) REFERENCES `guru` (`id`) ON DELETE CASCADE;

ALTER TABLE `mata_pelajaran`
  ADD CONSTRAINT `mata_pelajaran_ibfk_guru` FOREIGN KEY (`id_guru`) REFERENCES `guru` (`id`),
  ADD CONSTRAINT `mata_pelajaran_ibfk_kategori` FOREIGN KEY (`id_kategori`) REFERENCES `kategori_mapel` (`id_kategori`) ON DELETE SET NULL;

ALTER TABLE `presensi_siswa`
  ADD CONSTRAINT `presensi_siswa_ibfk_jurnal` FOREIGN KEY (`id_jurnal`) REFERENCES `jurnal_kbm` (`id_jurnal`) ON DELETE CASCADE,
  ADD CONSTRAINT `presensi_siswa_ibfk_siswa` FOREIGN KEY (`id_siswa`) REFERENCES `siswa` (`id_siswa`);

ALTER TABLE `rombel`
  ADD CONSTRAINT `fk_rombel_jurusan` FOREIGN KEY (`id_jurusan`) REFERENCES `program_keahlian` (`id_jurusan`),
  ADD CONSTRAINT `fk_rombel_tahun` FOREIGN KEY (`id_tahun_ajaran`) REFERENCES `tahun_ajaran` (`id_tahun_ajaran`),
  ADD CONSTRAINT `fk_rombel_tingkat` FOREIGN KEY (`id_tingkat`) REFERENCES `tingkat` (`id_tingkat`);

ALTER TABLE `siswa`
  ADD CONSTRAINT `siswa_ibfk_kelas` FOREIGN KEY (`id_kelas`) REFERENCES `kelas` (`id_kelas`);

ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_guru` FOREIGN KEY (`id_guru`) REFERENCES `guru` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `users_ibfk_siswa` FOREIGN KEY (`id_siswa`) REFERENCES `siswa` (`id_siswa`) ON DELETE SET NULL;

ALTER TABLE `user_roles`
  ADD CONSTRAINT `user_roles_ibfk_role` FOREIGN KEY (`id_role`) REFERENCES `roles` (`id_role`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_roles_ibfk_user` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE;

SET FOREIGN_KEY_CHECKS=1;
