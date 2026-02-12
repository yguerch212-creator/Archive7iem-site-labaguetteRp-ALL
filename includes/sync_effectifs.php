<?php
require_once __DIR__.'/db.php';

/**
 * Synchronise les rapports avec les effectifs existants.
 * Associe un rapport à un effectif si leur nom/prénom correspondent.
 */
function syncEffectifsRapports(PDO $pdo): void {
    $effectifs = $pdo->query("SELECT id, nom, prenom FROM effectifs")->fetchAll(PDO::FETCH_ASSOC);
    if (!$effectifs) return;

    $stmt = $pdo->prepare("UPDATE rapports SET auteur_id = ? WHERE id = ?");

    // On récupère tous les rapports sans auteur_id
    $rapports = $pdo->query("SELECT id, auteur_nom, auteur_id FROM rapports WHERE auteur_id IS NULL OR auteur_id = 0")->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rapports as $r) {
        $auteur_nom = trim(strtolower($r['auteur_nom'] ?? ''));
        if (!$auteur_nom) continue;

        foreach ($effectifs as $e) {
            $nomComplet = trim(strtolower($e['prenom'].' '.$e['nom']));
            $nomInverse = trim(strtolower($e['nom'].' '.$e['prenom']));
            if ($auteur_nom === $nomComplet || $auteur_nom === $nomInverse) {
                $stmt->execute([$e['id'], $r['id']]);
                break;
            }
        }
    }
}
?>
