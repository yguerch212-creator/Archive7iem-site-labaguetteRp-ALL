<?php
declare(strict_types=1);
require_once __DIR__.'/db.php';
session_start();

header('Content-Type: application/json');

$isAdmin = false;

// 🔹 Vérifie d'abord si la session indique un rôle admin
if (isset($_SESSION['role']) && strtolower($_SESSION['role']) === 'admin') {
    $isAdmin = true;
}
// 🔹 Si pas défini, vérifie via la base de données
elseif (isset($_SESSION['user']['id'])) {
    $uid = (int)$_SESSION['user']['id'];
    $check = $pdo->prepare("
        SELECT COUNT(*) 
        FROM user_groups ug
        JOIN `groups` g ON g.id = ug.group_id
        WHERE ug.user_id = ? AND g.name = 'Administration'
    ");
    $check->execute([$uid]);
    $isAdmin = $check->fetchColumn() > 0;
}

// 🔒 Si pas admin → accès refusé
if (!$isAdmin) {
    echo json_encode(['ok' => false, 'error' => 'Accès refusé']);
    exit;
}

// ✅ Si admin, autoriser la suppression
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['id'])) {
    $id = (int) $_POST['id'];
    $stmt = $pdo->prepare("DELETE FROM rapports WHERE id = ?");
    if ($stmt->execute([$id])) {
        echo json_encode(['ok' => true]);
    } else {
        echo json_encode(['ok' => false, 'error' => 'Échec de suppression']);
    }
} else {
    echo json_encode(['ok' => false, 'error' => 'Requête invalide']);
}
