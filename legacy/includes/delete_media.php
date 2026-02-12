<?php
declare(strict_types=1);
require_once __DIR__.'/db.php';
session_start();

header('Content-Type: application/json');

// Vérification admin
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    echo json_encode(['ok' => false, 'error' => 'Accès refusé']);
    exit;
}

$id = (int)($_POST['id'] ?? 0);
$url = trim($_POST['url'] ?? '');

if ($id <= 0 || !$url) {
    echo json_encode(['ok' => false, 'error' => 'Paramètres manquants']);
    exit;
}

// Récupère la liste des médias
$stmt = $pdo->prepare("SELECT fichier_media FROM rapports WHERE id = ?");
$stmt->execute([$id]);
$data = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$data) {
    echo json_encode(['ok' => false, 'error' => 'Rapport introuvable']);
    exit;
}

$media = json_decode($data['fichier_media'] ?? '[]', true);
if (!is_array($media)) $media = [];

$newList = [];
foreach ($media as $m) {
    if ($m['url'] !== $url) {
        $newList[] = $m;
    } else {
        // Supprimer le fichier physique
        $path = __DIR__ . '/../' . ltrim($m['url'], '/');
        if (file_exists($path)) {
            @unlink($path);
        }
    }
}

$newJson = json_encode($newList, JSON_UNESCAPED_SLASHES);
$update = $pdo->prepare("UPDATE rapports SET fichier_media = ? WHERE id = ?");
$update->execute([$newJson, $id]);

echo json_encode(['ok' => true]);
