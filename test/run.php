<?php
declare(strict_types=1);

foreach (glob(__DIR__ . '/../src/backend/src/*.php') as $backendFile) {
    require_once $backendFile;
}

$tests = 0;
$failures = [];

$assert = static function (bool $condition, string $message) use (&$tests, &$failures): void {
    $tests++;
    if (!$condition) {
        $failures[] = $message;
    }
};

$assert(haversineMeters(0, 0, 0, 0) === 0, 'Same-point distance should be zero.');
$assert(haversineMeters(0, 0, 0, 0.001) > 100, 'Haversine distance should use meters.');
$assert(abs(cosineSimilarity([1, 0], [1, 0]) - 1.0) < 1.0e-12, 'Identical vectors should score one.');
$assert(abs(cosineSimilarity([1, 0], [0, 1])) < 1.0e-12, 'Orthogonal vectors should score zero.');
$assert(abs(cosineSimilarity([1, 0], [-1, 0]) + 1.0) < 1.0e-12, 'Opposite vectors should score minus one.');
$assert(embeddingIsValid(array_fill(0, 128, 0.25)), 'Non-zero 128D embedding should be valid.');
$assert(embeddingIsValid(array_fill(0, 512, 0.25)), 'Non-zero 512D embedding should be valid.');
$assert(!embeddingIsValid(array_fill(0, 128, 0.0)), 'Zero embedding should be rejected.');
$assert(!embeddingIsValid(['not-a-number']), 'Non-numeric embedding should be rejected.');
$assert(!embeddingIsValid([NAN]), 'Non-finite embedding should be rejected.');
$assert(!embeddingIsValid(array_fill(0, 127, 0.25)), 'Unsupported embedding dimension should be rejected.');
$assert(allowedJournalStatus('Hadir'), 'Hadir status should be allowed.');
$assert(allowedJournalStatus('Diganti'), 'Diganti status should be allowed.');
$assert(!allowedJournalStatus('Hadir Sekali'), 'Unknown journal status should be rejected.');
$assert(count(adminResourceDefinitions()) >= 14, 'Admin CRUD should cover the declared master data resources.');
$assert(!in_array('face_embedding', adminResourceDefinitions()['guru']['fields'], true), 'Admin listings must not expose stored face embeddings.');
$assert(validDate('2026-10-16'), 'Valid ISO date should be accepted.');
$assert(!validDate('2026-02-30'), 'Impossible calendar date should be rejected.');
$assert(weekdayName('2026-10-16') === 'Jumat', 'Weekday should use Indonesian labels.');
$assert(weekdayName('2026-10-18') === null, 'Sunday should have no KBM weekday.');

$schemaPath = __DIR__ . '/../src/backend/db/schema.sql';
$schema = file_get_contents($schemaPath);
$assert(is_string($schema), 'Schema-only SQL should be readable.');
if (is_string($schema)) {
    $assert(substr_count($schema, 'CREATE TABLE') === 18, 'Schema-only SQL should define all 18 source tables.');
    $assert(!preg_match('/^\s*INSERT\s+INTO\b/im', $schema), 'Schema-only SQL must not contain seed records.');
    $assert(str_contains($schema, 'FOREIGN KEY'), 'Schema-only SQL should preserve foreign keys.');
    $assert(str_contains($schema, 'UNIQUE KEY `uq_jurnal` (`tanggal`,`id_jadwal`)'), 'Journal uniqueness must be preserved.');
}

$migrationPath = __DIR__ . '/../src/backend/db/migrations/001_guru_enrollment_tokens.sql';
$migration = file_get_contents($migrationPath);
$assert(is_string($migration) && str_contains($migration, 'token_hash'), 'Enrollment migration should store token hashes.');
$assert(is_string($migration) && str_contains($migration, 'expires_at'), 'Enrollment migration should expire enrollment tokens.');
$assert(is_string($migration) && str_contains($migration, 'consumed_at'), 'Enrollment migration should support one-time tokens.');

if ($failures) {
    foreach ($failures as $failure) {
        fwrite(STDERR, "FAIL: $failure\n");
    }
    fwrite(STDERR, sprintf("%d checks, %d failed.\n", $tests, count($failures)));
    exit(1);
}

fwrite(STDOUT, sprintf("PASS: %d checks.\n", $tests));
