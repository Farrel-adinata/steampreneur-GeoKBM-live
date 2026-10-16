<?php
declare(strict_types=1);

function appConfig(): array
{
    return [
        'db_host' => getenv('DB_HOST') ?: '127.0.0.1',
        'db_name' => getenv('DB_NAME') ?: 'sekolah_absensi',
        'db_user' => getenv('DB_USER') ?: 'root',
        'db_pass' => getenv('DB_PASS') !== false ? (string) getenv('DB_PASS') : '',
        'app_origin' => rtrim(
            (string) (getenv('APP_ORIGIN') ?: 'http://127.0.0.1:5500'),
            '/'
        ),
        'timezone' => getenv('APP_TIMEZONE') ?: 'Asia/Makassar',
        'debug' => getenv('APP_DEBUG') === '1',
    ];
}
