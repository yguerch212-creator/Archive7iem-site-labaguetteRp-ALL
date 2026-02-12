<?php
require_once __DIR__ . '/includes/db.php';
session_start();

if (!isset($_SESSION['user'])) { header('Location: /Archives7e/index.php'); exit; }

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['publish']) && isset($_SESSION['draft_effectif'])) {
  $d = $_SESSION['draft_effectif'];

  // décorations multi-select → CSV d’IDs (si tu utilises decorations_ref)
  $decorations_csv = '';
  if (!empty($d['decorations']) && is_array($d['decorations'])) {
    $ids = array_map('intval', $d['decorations']);
    $decorations_csv = implode(',', $ids);
  }

  // 1) insert effectif
  $stmt = $pdo->prepare("
    INSERT INTO effectifs
    (nom, prenom, surnom, date_naissance, lieu_naissance, nationalite, taille_cm, yeux, groupe_sanguin,
     unite_id, grade_id, qualification_id, specialite, date_entree_ig, date_entree_irl, officier_referent,
     arme_principale, arme_secondaire, equipement_special, tenue, historique, decorations, sanctions)
    VALUES
    (:nom, :prenom, :surnom, :date_naissance, :lieu_naissance, :nationalite, :taille_cm, :yeux, :groupe_sanguin,
     :unite_id, :grade_id, :qualification_id, :specialite, :date_entree_ig, :date_entree_irl, :officier_referent,
     :arme_principale, :arme_secondaire, :equipement_special, :tenue, :historique, :decorations, :sanctions)
  ");
  $stmt->execute([
    ':nom' => $d['nom'] ?? '',
    ':prenom' => $d['prenom'] ?? '',
    ':surnom' => $d['surnom'] ?? '',
    ':date_naissance' => $d['date_naissance'] ?: null,
    ':lieu_naissance' => $d['lieu_naissance'] ?? '',
    ':nationalite' => $d['nationalite'] ?? '',
    ':taille_cm' => $d['taille_cm'] ?: null,
    ':yeux' => $d['yeux'] ?? '',
    ':groupe_sanguin' => $d['groupe_sanguin'] ?? '',
    ':unite_id' => (int)($d['unite_id'] ?? 0),
    ':grade_id' => (int)($d['grade_id'] ?? 0),
    ':qualification_id' => !empty($d['qualification_id']) ? (int)$d['qualification_id'] : null,
    ':specialite' => $d['specialite'] ?? '',
    ':date_entree_ig' => $d['date_entree_ig'] ?: null,
    ':date_entree_irl' => $d['date_entree_irl'] ?: null,
    ':officier_referent' => $d['officier_referent'] ?? '',
    ':arme_principale' => $d['arme_principale'] ?? '',
    ':arme_secondaire' => $d['arme_secondaire'] ?? '',
    ':equipement_special' => $d['equipement_special'] ?? '',
    ':tenue' => $d['tenue'] ?? '',
    ':historique' => $d['historique'] ?? '',
    ':decorations' => $decorations_csv,
    ':sanctions' => $d['sanctions'] ?? '',
  ]);

  $new_id = (int)$pdo->lastInsertId();

  // 2) save layout JSON
  $layout_json = $_POST['layout_json'] ?? '{}';
  $pdo->prepare("INSERT INTO effectif_layouts (effectif_id, layout_json) VALUES (?, ?)")->execute([$new_id, $layout_json]);

  // 3) create blank casier
  $pdo->prepare("INSERT INTO casiers (effectif_id, contenu, created_at) VALUES (?, '', NOW())")->execute([$new_id]);

  $unite_id = (int)$d['unite_id'];
  unset($_SESSION['draft_effectif']);

  header("Location: /Archives7e/effectifs_list.php?unite_id={$unite_id}");
  exit;
}

// fallback
header('Location: /Archives7e/effectifs.php');
