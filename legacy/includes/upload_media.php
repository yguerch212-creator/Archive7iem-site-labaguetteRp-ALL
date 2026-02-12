<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';
header('Content-Type: application/json');
session_start();

try {
  if (!isset($_FILES['file'])) throw new Exception('Aucun fichier envoyé.');

  $file = $_FILES['file'];
  $allowed = ['image/png','image/jpeg','image/jpg','image/gif','video/mp4','video/webm'];
  if (!in_array($file['type'], $allowed)) throw new Exception('Type non autorisé.');

  $targetDir = __DIR__ . '/../uploads/rapports/';
  if (!is_dir($targetDir)) mkdir($targetDir, 0775, true);

  $fileName = time().'_'.preg_replace('/[^a-zA-Z0-9_.-]/','',$file['name']);
  $targetPath = $targetDir . $fileName;
  move_uploaded_file($file['tmp_name'], $targetPath);

  echo json_encode(['ok'=>true,'url'=>'/Archives7e/uploads/rapports/'.$fileName]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}
