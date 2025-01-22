<?php
header('Content-Type: application/json');

$conn = new mysqli('localhost', 'root', '', 'emergency_stations');
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'error' => 'Ошибка подключения к базе данных']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$id = $conn->real_escape_string($data['id']);
$waiting_time = $conn->real_escape_string($data['waiting_time']);
$professionalism = $conn->real_escape_string($data['professionalism']);
$politeness = $conn->real_escape_string($data['politeness']);
$clarity = $conn->real_escape_string($data['clarity']);
$cleanliness = $conn->real_escape_string($data['cleanliness']);
$visit_time = $conn->real_escape_string($data['visit_time']);

$query = "INSERT INTO service_ratings (id, waiting_time, professionalism, politeness, clarity, cleanliness, visit_time)
          VALUES ('$id', '$waiting_time', '$professionalism', '$politeness', '$clarity', '$cleanliness', '$visit_time')";

if ($conn->query($query)) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => $conn->error]);
}

$conn->close();
?>
