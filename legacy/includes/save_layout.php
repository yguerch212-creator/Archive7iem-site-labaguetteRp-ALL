<?php
// C:\laragon\www\Archives7e\includes\save_layout.php
declare(strict_types=1);
require_once __DIR__.'/db.php';
header('Content-Type: application/json');
session_start();

try {
    $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
    $contenu = $_POST['contenu'] ?? '';
    $publish = isset($_POST['publish']) ? 1 : 0;

    if ($id <= 0 || $contenu === '') {
        throw new Exception('Paramètres manquants.');
    }

    if ($publish) {
        $sql = "UPDATE rapports SET contenu_html = ?, published = 1 WHERE id = ?";
    } else {
        $sql = "UPDATE rapports SET contenu_html = ? WHERE id = ?";
    }

    $st = $pdo->prepare($sql);
    $st->execute([$contenu, $id]);

    echo json_encode(['ok' => true]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
