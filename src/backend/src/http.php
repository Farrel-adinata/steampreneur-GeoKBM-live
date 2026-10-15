<?php
declare(strict_types=1);

function jsonResponse(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function apiError(int $status, string $message): never
{
    jsonResponse(['status' => 'gagal', 'pesan' => $message], $status);
}

function jsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    try {
        $body = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        apiError(400, 'Format JSON tidak valid.');
    }
    if (!is_array($body)) {
        apiError(400, 'Body JSON harus berupa object.');
    }
    return $body;
}

function positiveInt(mixed $value, string $field): int
{
    $validated = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($validated === false) {
        apiError(422, "$field harus berupa bilangan bulat positif.");
    }
    return (int) $validated;
}

function currentActor(): ?array
{
    return isset($_SESSION['actor']) && is_array($_SESSION['actor'])
        ? $_SESSION['actor']
        : null;
}

function requireActor(array $roles = []): array
{
    $actor = currentActor();
    if (!$actor) {
        apiError(401, 'Silakan login kembali.');
    }
    if (!actorStillAuthorized($actor)) {
        $_SESSION = [];
        apiError(401, 'Sesi berakhir atau akses akun telah berubah. Silakan login kembali.');
    }
    if ($roles && !in_array($actor['role'], $roles, true)) {
        apiError(403, 'Anda tidak memiliki akses untuk melakukan tindakan ini.');
    }
    return $actor;
}

function requestMethod(): string
{
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function requestPath(): string
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $apiPosition = strpos($path, '/api/');
    if ($apiPosition !== false) {
        return substr($path, $apiPosition);
    }
    return rtrim($path, '/') ?: '/';
}
