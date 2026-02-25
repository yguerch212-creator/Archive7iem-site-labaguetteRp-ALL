<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';
header('Content-Type: application/json');
session_start();

try {
  // Session check
  if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['ok'=>false,'error'=>'Non authentifié']);
    exit;
  }

  if (!isset($_FILES['file'])) throw new Exception('Aucun fichier envoyé.');

  $file = $_FILES['file'];
  $allowed = ['image/png','image/jpeg','image/jpg','image/gif','video/mp4','video/webm'];
  // Server-side MIME check using finfo (not trusting client)
  $finfo = new finfo(FILEINFO_MIME_TYPE);
  $realMime = $finfo->file($file['tmp_name']);
  if (!in_array($realMime, $allowed)) throw new Exception('Type non autorisé.');

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
