<?php
header('Content-Type: application/json');

$conn = new mysqli('localhost', 'root', '', 'emergency_stations');
if ($conn->connect_error) {
    echo json_encode(['error' => 'Ошибка подключения к базе данных']);
    exit;
}

$id = $_GET['id'];
if (!$id) {
    echo json_encode(['error' => 'Не указан идентификатор травмпункта']);
    exit;
}

$query = "SELECT 
            AVG(waiting_time) AS waiting_time, 
            AVG(professionalism) AS professionalism, 
            AVG(politeness) AS politeness, 
            AVG(clarity) AS clarity, 
            AVG(cleanliness) AS cleanliness, 
            AVG(visit_time) AS visit_time,
            COUNT(*) AS total_reviews,
            (AVG(waiting_time) + AVG(professionalism) + AVG(politeness) + AVG(clarity) + AVG(cleanliness) + AVG(visit_time)) / 6 AS overall_rating
          FROM service_ratings
          WHERE id = ?";
$stmt = $conn->prepare($query);
$stmt->bind_param('i', $id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    echo json_encode($result->fetch_assoc());
} else {
    echo json_encode(['error' => 'Нет данных для указанного травмпункта']);
}

$stmt->close();
$conn->close();
?>
