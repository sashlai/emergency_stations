<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(array $body, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

set_exception_handler(function (Throwable $error): void {
    error_log((string) $error);
    respond(['error' => 'Не удалось выполнить запрос. Попробуйте позже.'], 500);
});

function requireMethod(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        header('Allow: ' . $method);
        respond(['error' => 'Метод запроса не поддерживается.'], 405);
    }
}

function positiveId($value): int
{
    if ((!is_int($value) && !is_string($value)) ||
        filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) {
        respond(['error' => 'Укажите корректный идентификатор травмпункта.'], 422);
    }
    return (int) $value;
}

function database(): mysqli
{
    $path = __DIR__ . '/config.local.php';
    if (!is_file($path)) {
        throw new RuntimeException('Create config.local.php using config.example.php.');
    }
    $config = require $path;
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $connection = new mysqli($config['host'], $config['username'], $config['password'],
        $config['database'], (int) ($config['port'] ?? 3306));
    $connection->set_charset('utf8mb4');
    return $connection;
}
