<?php
require_once __DIR__ . '/api.php';
requireMethod('GET');
$conn = database();
$result = $conn->query('SELECT id, ShortName, Category, ChiefName, ChiefPosition, ChiefGender,
    CloseFlag, Extrainfo, ClarificationWorkingHours, AgeRestriction, geoData
    FROM emergency_stations ORDER BY ShortName');
respond($result->fetch_all(MYSQLI_ASSOC));
