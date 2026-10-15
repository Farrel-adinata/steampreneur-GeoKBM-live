<?php
declare(strict_types=1);

function monitorClassScope(array $actor, ?int $requestedClass): array
{
    if ($actor['role'] !== 'wali_kelas') {
        return [$requestedClass, null];
    }
    if (!$actor['id_guru']) {
        apiError(403, 'Akun wali kelas belum terhubung dengan data guru.');
    }
    $stmt = db()->prepare('SELECT id_kelas FROM kelas WHERE wali_kelas = ?');
    $stmt->execute([$actor['id_guru']]);
    $allowed = array_map('intval', array_column($stmt->fetchAll(), 'id_kelas'));
    if ($requestedClass !== null && !in_array($requestedClass, $allowed, true)) {
        apiError(403, 'Anda tidak memiliki akses ke kelas tersebut.');
    }
    return [$requestedClass ?? ($allowed[0] ?? 0), $allowed];
}

function handleMonitorClasses(): never
{
    $actor = requireActor(['kepsek', 'kurikulum', 'wali_kelas']);
    if ($actor['role'] !== 'wali_kelas') {
        $stmt = db()->query('SELECT id_kelas, nama_kelas FROM kelas ORDER BY nama_kelas');
        jsonResponse(['status' => 'sukses', 'kelas' => $stmt->fetchAll()]);
    }
    [, $allowed] = monitorClassScope($actor, null);
    if (!$allowed) {
        jsonResponse(['status' => 'sukses', 'kelas' => []]);
    }
    $placeholders = implode(',', array_fill(0, count($allowed), '?'));
    $stmt = db()->prepare("SELECT id_kelas, nama_kelas FROM kelas WHERE id_kelas IN ($placeholders) ORDER BY nama_kelas");
    $stmt->execute($allowed);
    jsonResponse(['status' => 'sukses', 'kelas' => $stmt->fetchAll()]);
}

function handleMonitorDashboard(array $query): never
{
    $actor = requireActor(['kepsek', 'kurikulum', 'wali_kelas']);
    $date = (string) ($query['tanggal'] ?? date('Y-m-d'));
    if (!validDate($date)) {
        apiError(422, 'tanggal wajib menggunakan format YYYY-MM-DD.');
    }
    $requested = isset($query['id_kelas']) ? positiveId($query['id_kelas'], 'id_kelas') : null;
    [$classId, $allowed] = monitorClassScope($actor, $requested);
    if ($actor['role'] === 'wali_kelas' && !$allowed) {
        jsonResponse(['status' => 'sukses', 'tanggal' => $date, 'total_jurnal' => 0, 'total_hadir' => 0, 'total_tidak_hadir' => 0]);
    }
    $params = [$date];
    $filter = '';
    if ($classId !== null) {
        $filter = ' AND jk.id_kelas = ?';
        $params[] = $classId;
    } elseif ($actor['role'] === 'wali_kelas') {
        $placeholders = implode(',', array_fill(0, count($allowed), '?'));
        $filter = " AND jk.id_kelas IN ($placeholders)";
        array_push($params, ...$allowed);
    }
    $stmt = db()->prepare(
        "SELECT COUNT(j.id_jurnal) AS total_jurnal,
                COALESCE(SUM(j.status_guru = 'Hadir'), 0) AS total_hadir,
                COALESCE(SUM(j.status_guru <> 'Hadir'), 0) AS total_tidak_hadir
         FROM jurnal_kbm j JOIN jadwal_kbm jk ON jk.id_jadwal = j.id_jadwal
         WHERE j.tanggal = ?$filter"
    );
    $stmt->execute($params);
    jsonResponse(['status' => 'sukses', 'tanggal' => $date] + $stmt->fetch());
}

function handleMonitorAttendance(array $query): never
{
    $actor = requireActor(['kepsek', 'kurikulum', 'wali_kelas']);
    $date = (string) ($query['tanggal'] ?? date('Y-m-d'));
    if (!validDate($date)) {
        apiError(422, 'tanggal wajib menggunakan format YYYY-MM-DD.');
    }
    [$classId, $allowed] = monitorClassScope(
        $actor,
        isset($query['id_kelas']) ? positiveId($query['id_kelas'], 'id_kelas') : null
    );
    $sql = 'SELECT la.id, la.waktu_absen, la.jarak_dari_sekolah_meter,
                   la.skor_kemiripan_wajah, la.status, g.nama AS nama_guru
            FROM log_absensi la JOIN guru g ON g.id = la.guru_id
            WHERE DATE(la.waktu_absen) = ?';
    $params = [$date];
    if ($classId !== null) {
        $sql .= ' AND EXISTS (
            SELECT 1 FROM jadwal_kbm jk WHERE jk.id_guru = g.id AND jk.id_kelas = ?
        )';
        $params[] = $classId;
    } elseif ($actor['role'] === 'wali_kelas') {
        if (!$allowed) {
            jsonResponse(['status' => 'sukses', 'absensi' => []]);
        }
        $placeholders = implode(',', array_fill(0, count($allowed), '?'));
        $sql .= " AND EXISTS (
            SELECT 1 FROM jadwal_kbm jk WHERE jk.id_guru = g.id AND jk.id_kelas IN ($placeholders)
        )";
        array_push($params, ...$allowed);
    }
    $sql .= ' ORDER BY la.waktu_absen DESC';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    jsonResponse(['status' => 'sukses', 'absensi' => $stmt->fetchAll()]);
}

function handleMonitorJournal(array $query): never
{
    $actor = requireActor(['kepsek', 'kurikulum', 'wali_kelas']);
    $date = (string) ($query['tanggal'] ?? '');
    if (!validDate($date)) {
        apiError(422, 'tanggal wajib menggunakan format YYYY-MM-DD.');
    }
    $classId = positiveId($query['id_kelas'] ?? 0, 'id_kelas');
    monitorClassScope($actor, $classId);
    $stmt = db()->prepare(
        'SELECT j.tanggal, j.status_guru, j.materi, j.catatan_guru, j.catatan_siswa,
                jp.jam_ke, jp.jam_mulai, jp.jam_selesai, mp.nama_mapel,
                g.nama AS nama_guru, k.nama_kelas
         FROM jurnal_kbm j JOIN jadwal_kbm jk ON jk.id_jadwal = j.id_jadwal
         JOIN jam_pelajaran jp ON jp.id_jam = jk.id_jam
         JOIN mata_pelajaran mp ON mp.id_mapel = jk.id_mapel
         JOIN guru g ON g.id = j.id_guru JOIN kelas k ON k.id_kelas = jk.id_kelas
         WHERE j.tanggal = ? AND jk.id_kelas = ? ORDER BY jp.jam_ke'
    );
    $stmt->execute([$date, $classId]);
    jsonResponse(['status' => 'sukses', 'jurnal' => $stmt->fetchAll()]);
}

function handleMonitorReport(array $query): never
{
    $actor = requireActor(['kepsek', 'kurikulum', 'wali_kelas']);
    $from = (string) ($query['tanggal_mulai'] ?? '');
    $to = (string) ($query['tanggal_akhir'] ?? '');
    if (!validDate($from) || !validDate($to) || $from > $to) {
        apiError(422, 'Rentang tanggal tidak valid.');
    }
    $classId = isset($query['id_kelas']) ? positiveId($query['id_kelas'], 'id_kelas') : null;
    [$classId, $allowed] = monitorClassScope($actor, $classId);
    $sql = 'SELECT j.tanggal, jk.id_kelas, k.nama_kelas, j.status_guru, COUNT(*) AS total_entri
            FROM jurnal_kbm j JOIN jadwal_kbm jk ON jk.id_jadwal = j.id_jadwal
            JOIN kelas k ON k.id_kelas = jk.id_kelas
            WHERE j.tanggal BETWEEN ? AND ?';
    $params = [$from, $to];
    if ($classId !== null) {
        $sql .= ' AND jk.id_kelas = ?';
        $params[] = $classId;
    } elseif ($actor['role'] === 'wali_kelas') {
        if (!$allowed) {
            jsonResponse(['status' => 'sukses', 'total_entri' => 0, 'laporan' => []]);
        }
        $placeholders = implode(',', array_fill(0, count($allowed), '?'));
        $sql .= " AND jk.id_kelas IN ($placeholders)";
        array_push($params, ...$allowed);
    }
    $sql .= ' GROUP BY j.tanggal, jk.id_kelas, k.nama_kelas, j.status_guru ORDER BY j.tanggal, k.nama_kelas';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    $total = array_sum(array_map(static fn(array $row): int => (int) $row['total_entri'], $rows));
    jsonResponse(['status' => 'sukses', 'total_entri' => $total, 'laporan' => $rows]);
}
