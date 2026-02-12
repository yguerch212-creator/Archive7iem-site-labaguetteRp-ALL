<?php
require_once __DIR__ . '/includes/db.php';

$stmt = $pdo->query("SELECT * FROM test_connexion");
$result = $stmt->fetchAll();

echo '<pre>';
print_r($result);
echo '</pre>';
