<?php
// Test fixtures are available only from the command line, never over HTTP.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/api.php';
$conn = database();
$action = $argv[1] ?? '';
if ($action === 'create') {
    $conn->query("INSERT INTO emergency_stations (ShortName, Category) VALUES ('__integration_test__', 'Тест')");
    echo $conn->insert_id;
} elseif ($action === 'delete') {
    $id = (int) ($argv[2] ?? 0);
    $stmt = $conn->prepare("DELETE FROM emergency_stations WHERE id = ? AND ShortName = '__integration_test__'");
    $stmt->bind_param('i', $id);
    $stmt->execute();
} else { exit(1); }
