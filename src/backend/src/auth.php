<?php
declare(strict_types=1);

function startAppSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $isHttps = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    session_name('geokbm_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function loginActor(array $actor): void
{
    session_regenerate_id(true);
    $_SESSION['actor'] = $actor;
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

function requireMutationToken(): void
{
    $expected = $_SESSION['csrf_token'] ?? '';
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($expected) || $expected === '' || !is_string($provided)
        || !hash_equals($expected, $provided)) {
        apiError(419, 'Sesi keamanan tidak valid. Muat ulang halaman dan coba kembali.');
    }
}

function requireSameOrigin(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $configuredOrigin = appConfig()['app_origin'];
    if ($origin !== '' && ($configuredOrigin === '' || rtrim($origin, '/') !== $configuredOrigin)) {
        apiError(403, 'Origin tidak diizinkan.');
    }
}

function actorStillAuthorized(array $actor): bool
{
    if ($actor['role'] === 'guru') {
        $stmt = db()->prepare('SELECT 1 FROM guru WHERE id = ? AND status_aktif = 1');
        $stmt->execute([$actor['id_guru'] ?? 0]);
        return (bool) $stmt->fetchColumn();
    }
    $role = (string) ($actor['role'] ?? '');
    $allowed = match ($role) {
        'ketua_kelas' => ['ketua_kelas', 'siswa'],
        'admin' => ['admin'],
        'kepsek' => ['kepsek'],
        'kurikulum' => ['kurikulum'],
        'wali_kelas' => ['wali_kelas'],
        default => [],
    };
    if (!$allowed || empty($actor['id'])) {
        return false;
    }
    $placeholders = implode(',', array_fill(0, count($allowed), '?'));
    $stmt = db()->prepare(
        "SELECT COUNT(*) FROM users u
         JOIN user_roles ur ON ur.id_user = u.id_user
         JOIN roles r ON r.id_role = ur.id_role
         WHERE u.id_user = ? AND u.is_aktif = 1 AND r.kode_role IN ($placeholders)"
    );
    $stmt->execute([(int) $actor['id'], ...$allowed]);
    if ((int) $stmt->fetchColumn() < 1) {
        return false;
    }
    if ($role === 'ketua_kelas') {
        $student = db()->prepare(
            'SELECT 1 FROM users u JOIN siswa s ON s.id_siswa = u.id_siswa
             WHERE u.id_user = ? AND s.is_ketua_kelas = 1'
        );
        $student->execute([(int) $actor['id']]);
        return (bool) $student->fetchColumn();
    }
    return true;
}

function loginUser(string $username, string $password, array $allowedRoles): never
{
    if ($username === '' || $password === '') {
        apiError(422, 'username dan password wajib diisi.');
    }
    $stmt = db()->prepare(
        'SELECT u.id_user, u.username, u.email, u.password_hash, u.id_guru, u.id_siswa, u.is_aktif,
                g.nama AS nama_guru, g.nip, s.nama_siswa, s.nis, s.id_kelas,
                s.is_ketua_kelas, k.nama_kelas, GROUP_CONCAT(r.kode_role) AS role_codes
         FROM users u
         LEFT JOIN guru g ON g.id = u.id_guru
         LEFT JOIN siswa s ON s.id_siswa = u.id_siswa
         LEFT JOIN kelas k ON k.id_kelas = s.id_kelas
         LEFT JOIN user_roles ur ON ur.id_user = u.id_user
         LEFT JOIN roles r ON r.id_role = ur.id_role
         WHERE u.username = ? OR u.email = ?
         GROUP BY u.id_user, u.username, u.email, u.password_hash, u.id_guru, u.id_siswa, u.is_aktif,
                  g.nama, g.nip, s.nama_siswa, s.nis, s.id_kelas, s.is_ketua_kelas, k.nama_kelas'
    );
    $stmt->execute([$username, $username]);
    $row = $stmt->fetch();
    if (!$row || !(int) $row['is_aktif'] || !password_verify($password, (string) $row['password_hash'])) {
        apiError(401, 'Username atau kata sandi salah.');
    }

    $roles = array_filter(explode(',', (string) ($row['role_codes'] ?? '')));
    $role = null;
    foreach ($allowedRoles as $candidate) {
        if (in_array($candidate, $roles, true)) {
            $role = $candidate;
            break;
        }
    }
    if ($role === null && in_array('ketua_kelas', $allowedRoles, true)
        && in_array('siswa', $roles, true) && (int) ($row['is_ketua_kelas'] ?? 0) === 1) {
        $role = 'ketua_kelas';
    }
    if ($role === null) {
        apiError(403, 'Akun tidak memiliki peran untuk portal ini.');
    }
    if ($role === 'ketua_kelas' && (int) ($row['is_ketua_kelas'] ?? 0) !== 1) {
        apiError(403, 'Hanya ketua kelas yang dapat mengakses portal ini.');
    }

    $actor = [
        'id' => (int) $row['id_user'],
        'role' => $role,
        'id_guru' => $row['id_guru'] !== null ? (int) $row['id_guru'] : null,
        'id_siswa' => $row['id_siswa'] !== null ? (int) $row['id_siswa'] : null,
        'id_kelas' => $row['id_kelas'] !== null ? (int) $row['id_kelas'] : null,
        'name' => $row['nama_siswa'] ?: ($row['nama_guru'] ?: $row['username']),
        'nama_kelas' => $row['nama_kelas'],
    ];
    loginActor($actor);
    $result = ['status' => 'sukses', 'pesan' => 'Login berhasil.', 'csrf_token' => $_SESSION['csrf_token']];
    if ($role === 'ketua_kelas') {
        $result['data_siswa'] = [
            'id_user' => $actor['id'],
            'id_siswa' => $actor['id_siswa'],
            'nis' => $row['nis'],
            'nama_siswa' => $row['nama_siswa'],
            'id_kelas' => $actor['id_kelas'],
            'nama_kelas' => $actor['nama_kelas'],
            'is_ketua_kelas' => 1,
        ];
    } else {
        $result['data_user'] = ['id_user' => $actor['id'], 'username' => $row['username'], 'role' => $role];
    }
    jsonResponse($result);
}

function handleTeacherLogin(array $body): never
{
    $nip = trim((string) ($body['nip'] ?? ''));
    $password = (string) ($body['password_polos'] ?? '');
    if ($nip === '' || $password === '') {
        apiError(422, 'nip dan password_polos wajib diisi.');
    }
    $stmt = db()->prepare(
        'SELECT id, nip, nama, password_hash, status_aktif FROM guru WHERE nip = ? LIMIT 1'
    );
    $stmt->execute([$nip]);
    $row = $stmt->fetch();
    if (!$row || !(int) $row['status_aktif'] || !is_string($row['password_hash'])
        || !password_verify($password, $row['password_hash'])) {
        apiError(401, 'NIP atau kata sandi salah, atau akun belum diaktifkan.');
    }
    $actor = [
        'id' => (int) $row['id'],
        'role' => 'guru',
        'nip' => $row['nip'],
        'name' => $row['nama'],
        'id_guru' => (int) $row['id'],
        'id_siswa' => null,
        'id_kelas' => null,
    ];
    loginActor($actor);
    jsonResponse([
        'status' => 'sukses',
        'pesan' => 'Login berhasil.',
        'csrf_token' => $_SESSION['csrf_token'],
        'data_guru' => ['id' => $actor['id'], 'nama' => $actor['name']],
    ]);
}

function logoutActor(): never
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $params['path'],
            'domain' => $params['domain'],
            'secure' => $params['secure'],
            'httponly' => $params['httponly'],
            'samesite' => 'Strict',
        ]);
    }
    session_destroy();
    jsonResponse(['status' => 'sukses', 'pesan' => 'Anda telah keluar.']);
}
