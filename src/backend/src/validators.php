<?php
declare(strict_types=1);

function haversineMeters(float $lat1, float $lon1, float $lat2, float $lon2): int
{
    $radius = 6371000.0;
    $phi1 = deg2rad($lat1);
    $phi2 = deg2rad($lat2);
    $deltaPhi = deg2rad($lat2 - $lat1);
    $deltaLambda = deg2rad($lon2 - $lon1);
    $a = sin($deltaPhi / 2) ** 2
        + cos($phi1) * cos($phi2) * sin($deltaLambda / 2) ** 2;
    $a = min(1.0, max(0.0, $a));
    return (int) round(2 * $radius * atan2(sqrt($a), sqrt(1 - $a)));
}

function cosineSimilarity(array $left, array $right): float
{
    if ($left === [] || count($left) !== count($right)) {
        throw new InvalidArgumentException('Embedding dimensions must match and be non-empty.');
    }
    $dot = 0.0;
    $normLeft = 0.0;
    $normRight = 0.0;
    foreach ($left as $index => $value) {
        if (!is_numeric($value) || !is_numeric($right[$index] ?? null)) {
            throw new InvalidArgumentException('Embedding values must be numeric.');
        }
        $a = (float) $value;
        $b = (float) $right[$index];
        if (!is_finite($a) || !is_finite($b)) {
            throw new InvalidArgumentException('Embedding values must be finite.');
        }
        $dot += $a * $b;
        $normLeft += $a * $a;
        $normRight += $b * $b;
    }
    if ($normLeft <= 1.0e-10 || $normRight <= 1.0e-10) {
        throw new InvalidArgumentException('Embedding vectors must be non-zero.');
    }
    return $dot / (sqrt($normLeft) * sqrt($normRight));
}

function embeddingIsValid(mixed $embedding, array $allowedDimensions = [128, 512]): bool
{
    if (!is_array($embedding) || !in_array(count($embedding), $allowedDimensions, true)) {
        return false;
    }
    $norm = 0.0;
    foreach ($embedding as $value) {
        if (!is_numeric($value) || !is_finite((float) $value)) {
            return false;
        }
        $norm += (float) $value ** 2;
    }
    return $norm > 1.0e-10;
}

function validDate(string $date): bool
{
    $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
    return $parsed !== false && $parsed->format('Y-m-d') === $date;
}

function weekdayName(string $date): ?string
{
    if (!validDate($date)) {
        return null;
    }
    $names = [1 => 'Senin', 2 => 'Selasa', 3 => 'Rabu', 4 => 'Kamis', 5 => 'Jumat', 6 => 'Sabtu'];
    return $names[(int) (new DateTimeImmutable($date))->format('N')] ?? null;
}

function allowedJournalStatus(string $status): bool
{
    return in_array($status, ['Hadir', 'Tidak Hadir', 'Izin', 'Sakit', 'Diganti'], true);
}
