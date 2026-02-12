<?php
declare(strict_types=1);
require_once __DIR__.'/includes/db.php';
session_start();

$data = json_decode(file_get_contents('php://input'), true);
if(!$data || empty($data['id']) || empty($data['layout'])){
  http_response_code(400);
  echo "Requête invalide.";
  exit;
}

$id = (int)$data['id'];
$json = json_encode($data['layout'], JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);

$stmt = $pdo->prepare("UPDATE effectif_layouts SET layout_json=? WHERE effectif_id=?");
$stmt->execute([$json,$id]);

echo "OK";
