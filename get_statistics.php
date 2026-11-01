<?php
require_once __DIR__ . '/api.php';
requireMethod('GET');
$id = positiveId($_GET['id'] ?? null);
$conn = database();
$stmt = $conn->prepare('SELECT e.id,
    AVG(r.waiting_time) AS waiting_time, AVG(r.professionalism) AS professionalism,
    AVG(r.politeness) AS politeness, AVG(r.clarity) AS clarity,
    AVG(r.cleanliness) AS cleanliness, AVG(r.visit_time) AS visit_time,
    COUNT(r.rating_id) AS total_reviews,
    AVG((r.waiting_time + r.professionalism + r.politeness + r.clarity + r.cleanliness + r.visit_time) / 6) AS overall_rating
    FROM emergency_stations e LEFT JOIN service_ratings r ON e.id = r.id
    WHERE e.id = ? GROUP BY e.id');
$stmt->bind_param('i', $id);
$stmt->execute();
$stats = $stmt->get_result()->fetch_assoc();
if (!$stats) {
    respond(['error' => 'Травмпункт не найден.'], 404);
}
respond($stats);
