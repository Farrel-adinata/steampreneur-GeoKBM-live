<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/config.php';
require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/http.php';
require_once __DIR__ . '/../src/validators.php';
require_once __DIR__ . '/../src/auth.php';
require_once __DIR__ . '/../src/teacher.php';
require_once __DIR__ . '/../src/student.php';
require_once __DIR__ . '/../src/monitor.php';
require_once __DIR__ . '/../src/admin.php';

date_default_timezone_set(appConfig()['timezone']);
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigin = appConfig()['app_origin'];
if ($origin !== '' && $allowedOrigin !== '' && rtrim($origin, '/') === $allowedOrigin) {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');

if (requestMethod() === 'OPTIONS') {
    if ($origin !== '' && ($allowedOrigin === '' || rtrim($origin, '/') !== $allowedOrigin)) {
        http_response_code(403);
        exit;
    }
    http_response_code(204);
    exit;
}

startAppSession();
requireSameOrigin();
$method = requestMethod();
$path = requestPath();
$query = $_GET;
$body = in_array($method, ['POST', 'PUT'], true) ? jsonBody() : [];

try {
    if ($path === '/api/auth/me' && $method === 'GET') {
        jsonResponse([
            'status' => 'sukses',
            'authenticated' => currentActor() !== null,
            'actor' => currentActor(),
            'csrf_token' => $_SESSION['csrf_token'] ?? null,
        ]);
    }
    if ($path === '/api/auth/csrf' && $method === 'GET') {
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        jsonResponse(['status' => 'sukses', 'csrf_token' => $_SESSION['csrf_token']]);
    }
    if ($path === '/api/auth/logout' && $method === 'POST') {
        requireActor();
        requireCsrf();
        logoutActor();
    }

    if ($path === '/api/guru/login' && $method === 'POST') {
        handleTeacherLogin($body);
    }
    if ($path === '/api/siswa/login' && $method === 'POST') {
        loginUser((string) ($body['username'] ?? ''), (string) ($body['password'] ?? ''), ['ketua_kelas', 'siswa']);
    }
    if ($path === '/api/admin/login' && $method === 'POST') {
        loginUser((string) ($body['username'] ?? ''), (string) ($body['password'] ?? ''), ['admin']);
    }
    if ($path === '/api/monitor/login' && $method === 'POST') {
        loginUser((string) ($body['username'] ?? ''), (string) ($body['password'] ?? ''), ['kepsek', 'kurikulum', 'wali_kelas']);
    }

    if ($path === '/api/guru/cek-nip' && $method === 'GET') {
        handleCheckNip($query);
    }
    if ($path === '/api/guru/register' && in_array($method, ['POST', 'PUT'], true)) {
        requireCsrf();
        handleTeacherEnrollment($body);
    }
    if ($path === '/api/guru/absen' && $method === 'POST') {
        handleTeacherAttendance($body);
    }
    if ($path === '/api/guru/riwayat' && $method === 'GET') {
        handleTeacherHistory($query);
    }
    if ($path === '/api/guru/jurnal' && $method === 'GET') {
        handleTeacherJournal($query);
    }
    if ($path === '/api/guru/jurnal' && $method === 'PUT') {
        handleSaveTeacherJournal($body, $query);
    }

    if ($path === '/api/siswa/jadwal' && $method === 'GET') {
        handleStudentSchedule($query);
    }
    if ($path === '/api/siswa/jurnal' && $method === 'GET') {
        handleStudentJournal($query);
    }
    if ($path === '/api/siswa/jurnal' && $method === 'POST') {
        handleSaveStudentJournal($body);
    }
    if ($path === '/api/siswa/laporan' && $method === 'GET') {
        handleStudentReport($query);
    }

    if (str_starts_with($path, '/api/monitor/')) {
        if ($method !== 'GET') {
            apiError(405, 'Method tidak diizinkan.');
        }
        $resource = substr($path, strlen('/api/monitor/'));
        match ($resource) {
            'kelas' => handleMonitorClasses(),
            'dashboard' => handleMonitorDashboard($query),
            'absensi-guru' => handleMonitorAttendance($query),
            'jurnal-kelas' => handleMonitorJournal($query),
            'laporan' => handleMonitorReport($query),
            default => apiError(404, 'Resource monitor tidak ditemukan.'),
        };
    }

    if (str_starts_with($path, '/api/admin/')) {
        $resource = substr($path, strlen('/api/admin/'));
        if (str_contains($resource, '/')) {
            apiError(404, 'Resource admin tidak ditemukan.');
        }
        handleAdminResource($resource, $method, $query, $body);
    }

    apiError(404, 'Endpoint tidak ditemukan.');
} catch (PDOException $exception) {
    error_log('GeoKBM database error: ' . $exception->getCode());
    apiError(500, 'Terjadi kesalahan saat mengakses data. Silakan coba lagi.');
} catch (Throwable $exception) {
    error_log('GeoKBM server error: ' . get_class($exception));
    apiError(500, 'Terjadi kesalahan pada server.');
}
