<?php
require_once __DIR__ . '/db.php';
header('Content-Type: application/json');

try {
  $q = $pdo->query("
    SELECT e.id, e.nom, e.prenom, g.nom_complet AS grade_nom
    FROM effectifs e
    LEFT JOIN grades g ON e.grade_id = g.id
    ORDER BY e.nom ASC
  ");
  echo json_encode($q->fetchAll(PDO::FETCH_ASSOC));
} catch (Throwable $e) {
  echo json_encode([]);
}
