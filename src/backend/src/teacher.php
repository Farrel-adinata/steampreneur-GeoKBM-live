<?php
declare(strict_types=1);

function requireCsrf(): void
{
    requireMutationToken();
}

function positiveId(mixed $value, string $field): int
{
    $validated = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($validated === false) {
        apiError(422, "$field harus berupa bilangan bulat positif.");
    }
    return (int) $validated;
}

function parseEmbedding(mixed $value): array
{
    if (!embeddingIsValid($value)) {
        apiError(422, 'Embedding harus berisi angka finite 128D atau 512D dan bukan vektor nol.');
    }
    return array_map('floatval', $value);
}

function handleCheckNip(array $query): never
{
    $nip = trim((string) ($query['nip'] ?? ''));
    if ($nip === '') {
        apiError(422, 'Parameter nip wajib diisi.');
    }
    $stmt = db()->prepare('SELECT 1 FROM guru WHERE nip = ? AND status_aktif = 1 LIMIT 1');
    $stmt->execute([$nip]);
    jsonResponse(['status' => 'sukses', 'ditemukan' => (bool) $stmt->fetchColumn()]);
}

function handleTeacherEnrollment(array $body): never
{
    $nip = trim((string) ($body['nip'] ?? ''));
    $password = (string) ($body['password_polos'] ?? '');
    $token = (string) ($body['enrollment_token'] ?? '');
    if ($nip === '' || $password === '' || $token === '') {
        apiError(422, 'nip, password_polos, dan enrollment_token wajib diisi.');
    }
    if (strlen($password) < 10) {
        apiError(422, 'Kata sandi minimal 10 karakter.');
    }
    if (!preg_match('/^[A-Za-z0-9_-]{40,64}$/', $token)) {
        apiError(422, 'Token enrollment tidak valid.');
    }
    $embedding = parseEmbedding($body['embedding'] ?? null);
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'SELECT t.id, t.guru_id
             FROM guru_enrollment_tokens t
             JOIN guru g ON g.id = t.guru_id
             WHERE g.nip = ? AND t.token_hash = ? AND t.consumed_at IS NULL
               AND t.expires_at > CURRENT_TIMESTAMP()
             FOR UPDATE'
        );
        $stmt->execute([$nip, hash('sha256', $token)]);
        $enrollment = $stmt->fetch();
        if (!$enrollment) {
            $pdo->rollBack();
            apiError(403, 'Token enrollment tidak valid, sudah digunakan, atau kedaluwarsa.');
        }
        $update = $pdo->prepare(
            'UPDATE guru SET password_hash = ?, face_embedding = ?, status_aktif = 1 WHERE id = ?'
        );
        $update->execute([
            password_hash($password, PASSWORD_DEFAULT),
            json_encode($embedding, JSON_THROW_ON_ERROR),
            (int) $enrollment['guru_id'],
        ]);
        $consume = $pdo->prepare(
            'UPDATE guru_enrollment_tokens SET consumed_at = CURRENT_TIMESTAMP() WHERE id = ? AND consumed_at IS NULL'
        );
        $consume->execute([(int) $enrollment['id']]);
        if ($consume->rowCount() !== 1) {
            throw new RuntimeException('Enrollment token was consumed concurrently.');
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
    jsonResponse(['status' => 'sukses', 'pesan' => 'Aktivasi akun dan enrollment wajah berhasil.']);
}

function handleTeacherAttendance(array $body): never
{
    $actor = requireActor(['guru']);
    requireCsrf();
    $latitude = $body['latitude'] ?? null;
    $longitude = $body['longitude'] ?? null;
    if (!is_numeric($latitude) || !is_numeric($longitude)) {
        apiError(422, 'Koordinat GPS tidak valid.');
    }
    $latitude = (float) $latitude;
    $longitude = (float) $longitude;
    if (!is_finite($latitude) || $latitude < -90 || $latitude > 90
        || !is_finite($longitude) || $longitude < -180 || $longitude > 180) {
        apiError(422, 'Koordinat GPS di luar rentang yang diizinkan.');
    }
    $embedding = parseEmbedding($body['embedding'] ?? null);
    $pdo = db();
    $school = $pdo->query(
        'SELECT latitude, longitude, radius_meter FROM konfigurasi_sekolah ORDER BY id LIMIT 1'
    )->fetch();
    if (!$school) {
        apiError(503, 'Konfigurasi lokasi sekolah belum tersedia.');
    }
    $distance = haversineMeters(
        $latitude,
        $longitude,
        (float) $school['latitude'],
        (float) $school['longitude']
    );
    if ($distance > (int) $school['radius_meter']) {
        apiError(403, 'Absensi ditolak karena lokasi berada di luar radius sekolah.');
    }

    $stmt = $pdo->prepare('SELECT face_embedding FROM guru WHERE id = ? AND status_aktif = 1');
    $stmt->execute([$actor['id_guru']]);
    $storedJson = $stmt->fetchColumn();
    if (!is_string($storedJson) || $storedJson === '') {
        apiError(409, 'Data wajah belum terdaftar. Hubungi admin untuk aktivasi akun.');
    }
    $stored = json_decode($storedJson, true);
    if (!embeddingIsValid($stored)) {
        apiError(500, 'Data verifikasi wajah tidak valid. Hubungi admin.');
    }
    if (count($embedding) !== count($stored)) {
        apiError(409, 'Dimensi embedding tidak cocok. Hubungi admin untuk memperbarui data wajah.');
    }
    try {
        $score = cosineSimilarity($embedding, $stored);
    } catch (InvalidArgumentException) {
        apiError(422, 'Data embedding tidak dapat diverifikasi.');
    }
    $threshold = 0.45;
    if ($score < $threshold) {
        apiError(401, 'Verifikasi wajah tidak berhasil. Silakan coba lagi.');
    }
    $insert = $pdo->prepare(
        "INSERT INTO log_absensi
         (guru_id, latitude_absen, longitude_absen, jarak_dari_sekolah_meter, skor_kemiripan_wajah, status)
         VALUES (?, ?, ?, ?, ?, 'Hadir')"
    );
    $insert->execute([$actor['id_guru'], $latitude, $longitude, $distance, $score]);
    jsonResponse([
        'status' => 'sukses',
        'pesan' => 'Absensi berhasil dicatat.',
        'detail_log' => ['jarak_ke_sekolah' => $distance, 'skor_kemiripan' => round($score, 4)],
    ], 201);
}

function handleTeacherHistory(array $query): never
{
    $actor = requireActor(['guru']);
    $limit = min(100, max(1, (int) ($query['limit'] ?? 30)));
    $stmt = db()->prepare(
        'SELECT id, waktu_absen, jarak_dari_sekolah_meter, skor_kemiripan_wajah, status
         FROM log_absensi WHERE guru_id = ? ORDER BY waktu_absen DESC LIMIT ' . $limit
    );
    $stmt->execute([$actor['id_guru']]);
    jsonResponse(['status' => 'sukses', 'riwayat' => $stmt->fetchAll()]);
}

function handleTeacherJournal(array $query): never
{
    $actor = requireActor(['guru']);
    $date = (string) ($query['tanggal'] ?? '');
    if (!validDate($date)) {
        apiError(422, 'tanggal wajib menggunakan format YYYY-MM-DD.');
    }
    $weekday = weekdayName($date);
    if ($weekday === null) {
        jsonResponse(['status' => 'sukses', 'tanggal' => $date, 'jurnal' => []]);
    }
    $stmt = db()->prepare(
        "SELECT j.id_jurnal, ? AS tanggal, jk.id_jadwal, jk.id_guru,
                COALESCE(j.status_guru, 'Hadir') AS status_guru,
                j.materi, j.catatan_guru, j.catatan_siswa, j.waktu_diisi,
                jp.jam_ke, jp.jam_mulai, jp.jam_selesai,
                mp.kode_mapel, mp.nama_mapel, k.nama_kelas
         FROM jadwal_kbm jk
         JOIN jam_pelajaran jp ON jp.id_jam = jk.id_jam
         JOIN mata_pelajaran mp ON mp.id_mapel = jk.id_mapel
         JOIN kelas k ON k.id_kelas = jk.id_kelas
         LEFT JOIN jurnal_kbm j ON j.id_jadwal = jk.id_jadwal
           AND j.id_guru = jk.id_guru AND j.tanggal = ?
         WHERE jk.id_guru = ? AND jk.hari = ? AND jp.jenis = 'KBM'
         ORDER BY jp.jam_ke"
    );
    $stmt->execute([$date, $date, $actor['id_guru'], $weekday]);
    jsonResponse(['status' => 'sukses', 'tanggal' => $date, 'jurnal' => $stmt->fetchAll()]);
}

function handleSaveTeacherJournal(array $body, array $query): never
{
    $actor = requireActor(['guru']);
    requireCsrf();
    $fields = [];
    foreach (['materi', 'catatan_guru'] as $field) {
        if (array_key_exists($field, $body)) {
            if (!is_string($body[$field])) {
                apiError(422, "$field harus berupa teks.");
            }
            $fields[$field] = trim($body[$field]);
        }
    }
    if (!$fields) {
        apiError(422, 'Kirim materi dan/atau catatan_guru.');
    }
    $pdo = db();
    if (isset($query['id_jurnal'])) {
        $journalId = positiveId($query['id_jurnal'], 'id_jurnal');
        $owner = $pdo->prepare('SELECT id_guru FROM jurnal_kbm WHERE id_jurnal = ?');
        $owner->execute([$journalId]);
        if ((int) $owner->fetchColumn() !== (int) $actor['id_guru']) {
            apiError(403, 'Jurnal bukan milik akun guru ini.');
        }
        $set = [];
        $values = [];
        foreach ($fields as $field => $value) {
            $set[] = "$field = ?";
            $values[] = $value === '' ? null : $value;
        }
        $values[] = $journalId;
        $update = $pdo->prepare('UPDATE jurnal_kbm SET ' . implode(', ', $set) . ' WHERE id_jurnal = ?');
        $update->execute($values);
        jsonResponse(['status' => 'sukses', 'pesan' => 'Jurnal guru berhasil diperbarui.', 'id_jurnal' => $journalId]);
    }

    $scheduleId = positiveId($body['id_jadwal'] ?? 0, 'id_jadwal');
    $date = (string) ($body['tanggal'] ?? '');
    if (!validDate($date)) {
        apiError(422, 'tanggal wajib menggunakan format YYYY-MM-DD.');
    }
    $schedule = $pdo->prepare('SELECT id_guru FROM jadwal_kbm WHERE id_jadwal = ?');
    $schedule->execute([$scheduleId]);
    if ((int) $schedule->fetchColumn() !== (int) $actor['id_guru']) {
        apiError(403, 'Jadwal bukan milik akun guru ini.');
    }
    $pdo->beginTransaction();
    try {
        $find = $pdo->prepare('SELECT id_jurnal FROM jurnal_kbm WHERE tanggal = ? AND id_jadwal = ? FOR UPDATE');
        $find->execute([$date, $scheduleId]);
        $journalId = $find->fetchColumn();
        if ($journalId) {
            $set = [];
            $values = [];
            foreach ($fields as $field => $value) {
                $set[] = "$field = ?";
                $values[] = $value === '' ? null : $value;
            }
            $values[] = $journalId;
            $update = $pdo->prepare('UPDATE jurnal_kbm SET ' . implode(', ', $set) . ' WHERE id_jurnal = ?');
            $update->execute($values);
        } else {
            $insert = $pdo->prepare(
                "INSERT INTO jurnal_kbm
                 (tanggal, id_jadwal, id_guru, status_guru, materi, catatan_guru, catatan_siswa)
                 VALUES (?, ?, ?, 'Hadir', ?, ?, '')"
            );
            $insert->execute([
                $date,
                $scheduleId,
                $actor['id_guru'],
                $fields['materi'] !== '' ? $fields['materi'] : null,
                $fields['catatan_guru'] !== '' ? $fields['catatan_guru'] : null,
            ]);
            $journalId = (int) $pdo->lastInsertId();
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
    jsonResponse(['status' => 'sukses', 'pesan' => 'Jurnal guru berhasil disimpan.', 'id_jurnal' => (int) $journalId]);
}
