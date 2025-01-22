<?php
header('Content-Type: application/json');

$conn = new mysqli('localhost', 'root', '', 'emergency_stations');
if ($conn->connect_error) {
    echo json_encode(['error' => 'Ошибка подключения к базе данных: ' . $conn->connect_error], JSON_UNESCAPED_UNICODE);
    exit;
}

$query = "SELECT * FROM emergency_stations";
$result = $conn->query($query);

if (!$result) {
    echo json_encode(['error' => 'Ошибка выполнения запроса: ' . $conn->error], JSON_UNESCAPED_UNICODE);
    exit;
}


$centers = [];
while ($row = $result->fetch_assoc()) {
    $centers[] = $row;
}

echo json_encode($centers, JSON_UNESCAPED_UNICODE);

$conn->close();
?>
