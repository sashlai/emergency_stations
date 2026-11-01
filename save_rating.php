<?php
require_once __DIR__ . '/api.php';
requireMethod('POST');
if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') {
    respond(['error' => 'Ожидается запрос в формате JSON.'], 415);
}
$raw = file_get_contents('php://input', false, null, 0, 16385);
if (strlen($raw) > 16384) {
    respond(['error' => 'Запрос слишком большой.'], 413);
}
try {
    $data = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
} catch (JsonException $error) {
    respond(['error' => 'Некорректный JSON.'], 400);
}
if (!is_array($data)) {
    respond(['error' => 'Ожидается объект с оценками.'], 422);
}
$id = positiveId($data['id'] ?? null);
$fields = ['waiting_time', 'professionalism', 'politeness', 'clarity', 'cleanliness', 'visit_time'];
$ratings = [];
foreach ($fields as $field) {
    $value = $data[$field] ?? null;
    if ((!is_int($value) && !is_string($value)) ||
        filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 5]]) === false) {
        respond(['error' => 'Все шесть оценок должны быть целыми числами от 1 до 5.'], 422);
    }
    $ratings[] = (int) $value;
}
$conn = database();
$stmt = $conn->prepare('SELECT id FROM emergency_stations WHERE id = ?');
$stmt->bind_param('i', $id);
$stmt->execute();
if (!$stmt->get_result()->fetch_assoc()) {
    respond(['error' => 'Травмпункт не найден.'], 404);
}
$stmt = $conn->prepare('INSERT INTO service_ratings
    (id, waiting_time, professionalism, politeness, clarity, cleanliness, visit_time)
    VALUES (?, ?, ?, ?, ?, ?, ?)');
$stmt->bind_param('iiiiiii', $id, $ratings[0], $ratings[1], $ratings[2], $ratings[3], $ratings[4], $ratings[5]);
$stmt->execute();
respond(['success' => true], 201);
