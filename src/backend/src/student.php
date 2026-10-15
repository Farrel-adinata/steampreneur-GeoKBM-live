<?php
declare(strict_types=1);

function requireStudentForClass(array $actor, int $classId): void
{
    if (($actor['role'] ?? '') !== 'ketua_kelas' || (int) ($actor['id_kelas'] ?? 0) !== $classId) {
        apiError(403, 'Data kelas tidak dapat diakses oleh akun ini.');
    }
}

function handleStudentSchedule(array $query): never
{
    $actor = requireActor(['ketua_kelas']);
    $date = (string) ($query['tanggal'] ?? '');
    if (!validDate($date)) {
        apiError(422, 'tanggal wajib menggunakan format YYYY-MM-DD.');
    }
    $weekday = weekdayName($date);
    if ($weekday === null) {
        jsonResponse(['status' => 'sukses', 'tanggal' => $date, 'jadwal' => []]);
    }
    $stmt = db()->prepare(
        "SELECT jk.id_jadwal, jk.id_guru, g.nama AS nama_guru, g.gelar_belakang,
                jp.jam_ke, jp.jam_mulai, jp.jam_selesai, mp.kode_mapel, mp.nama_mapel,
                j.id_jurnal, j.status_guru, j.materi, j.catatan_guru, j.catatan_siswa, ? AS tanggal
         FROM jadwal_kbm jk
         JOIN guru g ON g.id = jk.id_guru
         JOIN jam_pelajaran jp ON jp.id_jam = jk.id_jam
         JOIN mata_pelajaran mp ON mp.id_mapel = jk.id_mapel
         LEFT JOIN jurnal_kbm j ON j.id_jadwal = jk.id_jadwal AND j.tanggal = ?
         WHERE jk.id_kelas = ? AND jk.hari = ? AND jp.jenis = 'KBM'
         ORDER BY jp.jam_ke"
    );
    $stmt->execute([$date, $date, $actor['id_kelas'], $weekday]);
    jsonResponse(['status' => 'sukses', 'tanggal' => $date, 'jadwal' => $stmt->fetchAll()]);
}

function handleSaveStudentJournal(array $body): never
{
    $actor = requireActor(['ketua_kelas']);
    requireCsrf();
    $date = (string) ($body['tanggal'] ?? '');
    $scheduleId = positiveId($body['id_jadwal'] ?? 0, 'id_jadwal');
    $status = (string) ($body['status_guru'] ?? '');
    if (!validDate($date)) {
        apiError(422, 'tanggal wajib menggunakan format YYYY-MM-DD.');
    }
    if (!allowedJournalStatus($status)) {
        apiError(422, 'status_guru tidak diizinkan.');
    }
    $note = $body['catatan_siswa'] ?? '';
    if (!is_string($note) || mb_strlen($note) > 5000) {
        apiError(422, 'catatan_siswa wajib berupa teks dengan maksimal 5000 karakter.');
    }

    $pdo = db();
    $stmt = $pdo->prepare('SELECT id_kelas, id_guru FROM jadwal_kbm WHERE id_jadwal = ?');
    $stmt->execute([$scheduleId]);
    $schedule = $stmt->fetch();
    if (!$schedule || (int) $schedule['id_kelas'] !== (int) $actor['id_kelas']) {
        apiError(403, 'Jadwal tidak termasuk kelas akun ini.');
    }

    $upsert = $pdo->prepare(
        'INSERT INTO jurnal_kbm
            (tanggal, id_jadwal, id_guru, status_guru, catatan_siswa, id_siswa_pengisi)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status_guru = VALUES(status_guru),
            catatan_siswa = VALUES(catatan_siswa), id_siswa_pengisi = VALUES(id_siswa_pengisi)'
    );
    $upsert->execute([
        $date,
        $scheduleId,
        $schedule['id_guru'],
        $status,
        trim($note),
        $actor['id_siswa'],
    ]);
    $find = $pdo->prepare('SELECT id_jurnal FROM jurnal_kbm WHERE tanggal = ? AND id_jadwal = ?');
    $find->execute([$date, $scheduleId]);
    jsonResponse([
        'status' => 'sukses',
        'pesan' => 'Jurnal kelas berhasil disimpan.',
        'data' => ['id_jurnal' => (int) $find->fetchColumn()],
    ]);
}

function handleStudentJournal(array $query): never
{
    $actor = requireActor(['ketua_kelas']);
    $date = (string) ($query['tanggal'] ?? '');
    if (!validDate($date)) {
        apiError(422, 'tanggal wajib menggunakan format YYYY-MM-DD.');
    }
    $stmt = db()->prepare(
        "SELECT j.id_jurnal, j.tanggal, j.id_jadwal, j.status_guru, j.materi,
                j.catatan_guru, j.catatan_siswa, j.waktu_diisi,
                jp.jam_ke, jp.jam_mulai, jp.jam_selesai,
                mp.kode_mapel, mp.nama_mapel, g.nama AS nama_guru, g.gelar_belakang
         FROM jurnal_kbm j
         JOIN jadwal_kbm jk ON jk.id_jadwal = j.id_jadwal
         JOIN jam_pelajaran jp ON jp.id_jam = jk.id_jam
         JOIN mata_pelajaran mp ON mp.id_mapel = jk.id_mapel
         JOIN guru g ON g.id = j.id_guru
         WHERE jk.id_kelas = ? AND j.tanggal = ?
         ORDER BY jp.jam_ke"
    );
    $stmt->execute([$actor['id_kelas'], $date]);
    jsonResponse(['status' => 'sukses', 'tanggal' => $date, 'jurnal' => $stmt->fetchAll()]);
}

function handleStudentReport(array $query): never
{
    $actor = requireActor(['ketua_kelas']);
    $from = (string) ($query['tanggal_mulai'] ?? '');
    $to = (string) ($query['tanggal_akhir'] ?? '');
    if (!validDate($from) || !validDate($to) || $from > $to) {
        apiError(422, 'Rentang tanggal tidak valid.');
    }
    $stmt = db()->prepare(
        'SELECT j.tanggal, j.status_guru, COUNT(*) AS total_entri
         FROM jurnal_kbm j JOIN jadwal_kbm jk ON jk.id_jadwal = j.id_jadwal
         WHERE jk.id_kelas = ? AND j.tanggal BETWEEN ? AND ?
         GROUP BY j.tanggal, j.status_guru ORDER BY j.tanggal'
    );
    $stmt->execute([$actor['id_kelas'], $from, $to]);
    $rows = $stmt->fetchAll();
    $total = array_sum(array_map(static fn(array $row): int => (int) $row['total_entri'], $rows));
    jsonResponse(['status' => 'sukses', 'total_entri' => $total, 'laporan' => $rows]);
}
