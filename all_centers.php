<?php
header('Content-Type: application/json');

$conn = new mysqli('localhost', 'root', '', 'emergency_stations');
if ($conn->connect_error) {
    echo json_encode(['error' => 'Ошибка подключения к базе данных']);
    exit;
}

$query = "SELECT 
            e.id, 
            e.ShortName, 
            e.Category, 
            AVG(r.waiting_time + r.professionalism + r.politeness + r.clarity + r.cleanliness + r.visit_time) / 6 AS overall_rating,
            COUNT(r.rating_id) AS total_reviews
          FROM emergency_stations e
          LEFT JOIN service_ratings r ON e.id = r.id
          GROUP BY e.id
          ORDER BY overall_rating DESC";

$result = $conn->query($query);

$centers = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $centers[] = $row;
    }
    echo json_encode($centers, JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode(['error' => 'Ошибка выполнения запроса: ' . $conn->error]);
}

$conn->close();
?>
