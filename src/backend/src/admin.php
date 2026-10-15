<?php
declare(strict_types=1);

function adminResourceDefinitions(): array
{
    return [
        'guru' => ['table' => 'guru', 'primary' => 'id', 'fields' => ['nip', 'nama', 'gelar_depan', 'gelar_belakang', 'email', 'no_hp', 'status_aktif']],
        'jadwal_kbm' => ['table' => 'jadwal_kbm', 'primary' => 'id_jadwal', 'fields' => ['id_kelas', 'hari', 'id_jam', 'id_mapel', 'id_guru']],
        'jam_pelajaran' => ['table' => 'jam_pelajaran', 'primary' => 'id_jam', 'fields' => ['jam_ke', 'jam_mulai', 'jam_selesai', 'jenis', 'keterangan']],
        'kategori_mapel' => ['table' => 'kategori_mapel', 'primary' => 'id_kategori', 'fields' => ['nama_kategori']],
        'kelas' => ['table' => 'kelas', 'primary' => 'id_kelas', 'fields' => ['nama_kelas', 'id_rombel', 'wali_kelas']],
        'konfigurasi_sekolah' => ['table' => 'konfigurasi_sekolah', 'primary' => 'id', 'fields' => ['nama_sekolah', 'latitude', 'longitude', 'radius_meter']],
        'mata_pelajaran' => ['table' => 'mata_pelajaran', 'primary' => 'id_mapel', 'fields' => ['kode_mapel', 'nama_mapel', 'id_kategori', 'id_guru', 'total_jam_minggu']],
        'program_keahlian' => ['table' => 'program_keahlian', 'primary' => 'id_jurusan', 'fields' => ['kode_jurusan', 'nama_jurusan']],
        'rombel' => ['table' => 'rombel', 'primary' => 'id_rombel', 'fields' => ['id_tingkat', 'id_jurusan', 'paralel', 'id_tahun_ajaran', 'nama_rombel', 'jumlah_siswa']],
        'roles' => ['table' => 'roles', 'primary' => 'id_role', 'fields' => ['kode_role', 'nama_role', 'deskripsi']],
        'siswa' => ['table' => 'siswa', 'primary' => 'id_siswa', 'fields' => ['nis', 'nama_siswa', 'id_kelas', 'is_ketua_kelas']],
        'tahun_ajaran' => ['table' => 'tahun_ajaran', 'primary' => 'id_tahun_ajaran', 'fields' => ['kode', 'semester', 'is_aktif']],
        'tingkat' => ['table' => 'tingkat', 'primary' => 'id_tingkat', 'fields' => ['kode_tingkat', 'urutan']],
        'users' => ['table' => 'users', 'primary' => 'id_user', 'fields' => ['username', 'email', 'id_guru', 'id_siswa', 'is_aktif'], 'password' => true],
        'user_roles' => ['table' => 'user_roles', 'primary' => 'id', 'fields' => ['id_user', 'id_role']],
    ];
}

function handleAdminList(string $resource, array $definition): never
{
    $actor = requireActor(['admin']);
    $columns = array_merge([$definition['primary']], $definition['fields']);
    if ($resource === 'guru') {
        $columns = ['id', 'nip', 'nama', 'gelar_depan', 'gelar_belakang', 'email', 'no_hp', 'status_aktif'];
    }
    if ($resource === 'users') {
        $columns = ['id_user', 'username', 'email', 'id_guru', 'id_siswa', 'is_aktif', 'created_at'];
    }
    $limit = min(500, max(1, (int) ($_GET['limit'] ?? 200)));
    $stmt = db()->query(
        'SELECT ' . implode(', ', $columns) . ' FROM ' . $definition['table']
        . ' ORDER BY ' . $definition['primary'] . ' DESC LIMIT ' . $limit
    );
    jsonResponse(['status' => 'sukses', 'data' => $stmt->fetchAll()]);
}

function adminValues(array $definition, array $body): array
{
    $allowed = $definition['fields'];
    if (!empty($definition['password'])) {
        $allowed[] = 'password';
    }
    $unknown = array_diff(array_keys($body), $allowed);
    if ($unknown) {
        apiError(422, 'Field tidak dikenal: ' . implode(', ', $unknown));
    }
    $values = [];
    foreach ($definition['fields'] as $field) {
        if (array_key_exists($field, $body)) {
            $values[$field] = is_string($body[$field]) ? trim($body[$field]) : $body[$field];
        }
    }
    if (array_key_exists('password', $body)) {
        $password = (string) $body['password'];
        if (strlen($password) < 10) {
            apiError(422, 'Kata sandi minimal 10 karakter.');
        }
        $values['password_hash'] = password_hash($password, PASSWORD_DEFAULT);
    }
    if (!$values) {
        apiError(422, 'Setidaknya satu field harus dikirim.');
    }
    return $values;
}

function handleAdminResource(string $resource, string $method, array $query, array $body): never
{
    $actor = requireActor(['admin']);
    $definitions = adminResourceDefinitions();
    if ($resource === 'guru-enrollment') {
        if ($method !== 'POST') {
            apiError(405, 'Method tidak diizinkan.');
        }
        requireCsrf();
        $teacherId = positiveId($body['guru_id'] ?? 0, 'guru_id');
        $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
        $pdo = db();
        $teacher = $pdo->prepare('SELECT 1 FROM guru WHERE id = ? AND status_aktif = 1');
        $teacher->execute([$teacherId]);
        if (!$teacher->fetchColumn()) {
            apiError(404, 'Data guru aktif tidak ditemukan.');
        }
        $pdo->beginTransaction();
        try {
            $revoke = $pdo->prepare(
                'UPDATE guru_enrollment_tokens SET consumed_at = CURRENT_TIMESTAMP()
                 WHERE guru_id = ? AND consumed_at IS NULL'
            );
            $revoke->execute([$teacherId]);
            $insert = $pdo->prepare(
                'INSERT INTO guru_enrollment_tokens (guru_id, token_hash, expires_at, created_by)
                 VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 20 MINUTE), ?)'
            );
            $insert->execute([$teacherId, hash('sha256', $token), $actor['id']]);
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $error;
        }
        jsonResponse([
            'status' => 'sukses',
            'pesan' => 'Token enrollment dibuat. Bagikan secara aman kepada guru; token hanya ditampilkan sekali.',
            'enrollment_token' => $token,
            'berlaku_detik' => 1200,
        ], 201);
    }
    if ($resource === 'jurnal_otomatis') {
        if ($method !== 'GET') {
            apiError(405, 'Method tidak diizinkan.');
        }
        handleAutoJournal($query);
    }
    if (!isset($definitions[$resource])) {
        apiError(404, 'Resource admin tidak ditemukan.');
    }
    $definition = $definitions[$resource];
    if ($method === 'GET') {
        handleAdminList($resource, $definition);
    }
    requireCsrf();
    $pdo = db();
    if ($method === 'POST') {
        $values = adminValues($definition, $body);
        $fields = array_keys($values);
        $sql = 'INSERT INTO ' . $definition['table'] . ' (' . implode(', ', $fields) . ') VALUES ('
            . implode(', ', array_fill(0, count($fields), '?')) . ')';
        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute(array_values($values));
        } catch (PDOException) {
            apiError(409, 'Data tidak dapat disimpan. Periksa field wajib, relasi, atau duplikasi.');
        }
        jsonResponse(['status' => 'sukses', 'id' => (int) $pdo->lastInsertId()], 201);
    }

    $id = positiveId($query['id'] ?? 0, 'id');
    if ($method === 'PUT') {
        $values = adminValues($definition, $body);
        $fields = array_keys($values);
        $sets = array_map(static fn(string $field): string => "$field = ?", $fields);
        $sql = 'UPDATE ' . $definition['table'] . ' SET ' . implode(', ', $sets)
            . ' WHERE ' . $definition['primary'] . ' = ?';
        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute([...array_values($values), $id]);
        } catch (PDOException) {
            apiError(409, 'Data tidak dapat diperbarui. Periksa field wajib, relasi, atau duplikasi.');
        }
        if ($stmt->rowCount() === 0) {
            $check = $pdo->prepare(
                'SELECT 1 FROM ' . $definition['table'] . ' WHERE ' . $definition['primary'] . ' = ?'
            );
            $check->execute([$id]);
            if (!$check->fetchColumn()) {
                apiError(404, 'Data tidak ditemukan.');
            }
        }
        jsonResponse(['status' => 'sukses', 'pesan' => 'Data berhasil diperbarui.']);
    }
    if ($method === 'DELETE') {
        $stmt = $pdo->prepare(
            'DELETE FROM ' . $definition['table'] . ' WHERE ' . $definition['primary'] . ' = ?'
        );
        try {
            $stmt->execute([$id]);
        } catch (PDOException) {
            apiError(409, 'Data masih digunakan dan tidak dapat dihapus.');
        }
        if ($stmt->rowCount() === 0) {
            apiError(404, 'Data tidak ditemukan.');
        }
        jsonResponse(['status' => 'sukses', 'pesan' => 'Data berhasil dihapus.']);
    }
    apiError(405, 'Method tidak diizinkan.');
}

function handleAutoJournal(array $query): never
{
    requireActor(['admin']);
    $date = (string) ($query['tanggal'] ?? date('Y-m-d'));
    if (!validDate($date)) {
        apiError(422, 'tanggal wajib menggunakan format YYYY-MM-DD.');
    }
    $weekday = weekdayName($date);
    if ($weekday === null) {
        jsonResponse(['status' => 'sukses', 'dibuat' => 0]);
    }
    $stmt = db()->prepare(
        "INSERT IGNORE INTO jurnal_kbm (tanggal, id_jadwal, id_guru, status_guru, catatan_siswa)
         SELECT ?, jk.id_jadwal, jk.id_guru, 'Hadir', ''
         FROM jadwal_kbm jk JOIN jam_pelajaran jp ON jp.id_jam = jk.id_jam
         WHERE jk.hari = ? AND jp.jenis = 'KBM'"
    );
    $stmt->execute([$date, $weekday]);
    jsonResponse(['status' => 'sukses', 'dibuat' => $stmt->rowCount()]);
}
