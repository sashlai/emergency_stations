<?php
header('Content-Type: application/json');

$conn = new mysqli('localhost', 'root', '', 'emergency_stations');
if ($conn->connect_error) {
    echo json_encode(['error' => 'Ошибка подключения к базе данных']);
    exit;
}

$id = $conn->real_escape_string($_GET['id']);

$query = "SELECT 
            AVG(waiting_time) AS waiting_time,
            AVG(professionalism) AS professionalism,
            AVG(politeness) AS politeness,
            AVG(clarity) AS clarity,
            AVG(cleanliness) AS cleanliness,
            AVG(visit_time) AS visit_time
          FROM service_ratings
          WHERE id = '$id'";

$result = $conn->query($query);

if ($result) {
    echo json_encode($result->fetch_assoc());
} else {
    echo json_encode(['error' => $conn->error]);
}

$conn->close();
?>
