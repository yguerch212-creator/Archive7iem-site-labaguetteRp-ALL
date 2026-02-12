<?php
require_once __DIR__ . '/db.php';
header('Content-Type: application/json');
$unite_id = isset($_GET['unite_id']) ? (int)$_GET['unite_id'] : 0;
if ($unite_id <= 0) { echo json_encode([]); exit; }
$stmt = $pdo->prepare("SELECT id, nom_complet FROM grades WHERE unite_id = ? ORDER BY id");
$stmt->execute([$unite_id]);
echo json_encode($stmt->fetchAll());
