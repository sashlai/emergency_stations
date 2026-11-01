<?php
require_once __DIR__ . '/api.php';
requireMethod('GET');
$conn = database();
$result = $conn->query('SELECT e.id, e.ShortName, e.Category,
    AVG((r.waiting_time + r.professionalism + r.politeness + r.clarity + r.cleanliness + r.visit_time) / 6) AS overall_rating,
    COUNT(r.rating_id) AS total_reviews
    FROM emergency_stations e LEFT JOIN service_ratings r ON e.id = r.id
    GROUP BY e.id, e.ShortName, e.Category
    ORDER BY overall_rating DESC, e.ShortName ASC');
respond($result->fetch_all(MYSQLI_ASSOC));
