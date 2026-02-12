<?php
// C:\laragon\www\Archives7e\includes\get_unites.php
declare(strict_types=1);
require_once __DIR__ . '/db.php';
header('Content-Type: application/json; charset=utf-8');

try {
  $stmt = $pdo->query("SELECT id, code, nom FROM unites ORDER BY id ASC");
  $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
  echo json_encode($rows);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => 'DB error', 'details' => $e->getMessage()]);
}
