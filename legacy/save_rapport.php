<?php
declare(strict_types=1);
require_once __DIR__.'/includes/db.php';
session_start();

header('Content-Type: text/html; charset=utf-8');

// ─────────────────────────────
//  Vérif basique
// ─────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    exit('Méthode invalide.');
}

$type = $_POST['type'] ?? 'rapport';
$titre = trim($_POST['titre'] ?? '');
$date_rp = trim($_POST['date_rp'] ?? '');
$date_irl = trim($_POST['date_irl'] ?? '');
$auteur_nom = $_SESSION['user']['prenom'].' '.$_SESSION['user']['nom'] ?? ($_POST['auteur_nom'] ?? 'Inconnu');

// ─────────────────────────────
//  Gestion des fichiers média
// ─────────────────────────────
$media_list = [];

if (!empty($_FILES['media_files']['name'][0])) {
    $uploadDir = __DIR__ . '/assets/uploads/media/';
    @mkdir($uploadDir, 0777, true);

    foreach ($_FILES['media_files']['name'] as $i => $name) {
        $tmp = $_FILES['media_files']['tmp_name'][$i];
        if (!is_uploaded_file($tmp)) continue;
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg','jpeg','png','gif','mp4','webm','mov'])) continue;
        $newName = uniqid('media_', true).'.'.$ext;
        $dest = $uploadDir.$newName;
        if (move_uploaded_file($tmp, $dest)) {
            $media_list[] = [
                'url' => '/Archives7e/assets/uploads/media/'.$newName,
                'legend' => ''
            ];
        }
    }
}

$jsonMedia = !empty($media_list) ? json_encode($media_list, JSON_UNESCAPED_SLASHES) : null;

// ─────────────────────────────
//  Champs communs
// ─────────────────────────────
$personne_renseignee_nom = $_POST['personne_renseignee_nom'] ?? null;

$contexte  = $_POST['contexte'] ?? null;
$resume    = $_POST['resume'] ?? null;
$bilan     = $_POST['bilan'] ?? null;
$remarques = $_POST['remarques'] ?? null;

// ─────────────────────────────
//  Champs spécifiques
// ─────────────────────────────
$recommande_nom    = $_POST['recommande_nom']    ?? null;
$recommande_grade  = $_POST['recommande_grade']  ?? null;
$recommande_unite  = $_POST['recommande_unite']  ?? null;
$raison_1          = $_POST['raison_1']          ?? null;
$raison_2          = $_POST['raison_2']          ?? null;
$recompense        = $_POST['recompense']        ?? null;

$intro_nom         = $_POST['intro_nom']         ?? null;
$intro_grade       = $_POST['intro_grade']       ?? null;
$intro_fonction    = $_POST['intro_fonction']    ?? null;
$intro_unite       = $_POST['intro_unite']       ?? null;

$mise_en_cause_nom       = $_POST['mise_en_cause_nom']       ?? null;
$mise_en_cause_grade     = $_POST['mise_en_cause_grade']     ?? null;
$mise_en_cause_fonction  = $_POST['mise_en_cause_fonction']  ?? null;
$mise_en_cause_unite     = $_POST['mise_en_cause_unite']     ?? null;

// ─────────────────────────────
//  Insertion en base
// ─────────────────────────────
$sql = "
INSERT INTO rapports (
  type, titre, auteur_nom, personne_renseignee_nom,
  contexte, resume, bilan, remarques,
  fichier_media,
  recommande_nom, recommande_grade, recommande_unite,
  raison_1, raison_2, recompense,
  intro_nom, intro_grade, intro_fonction, intro_unite,
  mise_en_cause_nom, mise_en_cause_grade, mise_en_cause_fonction, mise_en_cause_unite,
  date_rp, date_irl, created_at
)
VALUES (
  :type, :titre, :auteur_nom, :personne_renseignee_nom,
  :contexte, :resume, :bilan, :remarques,
  :fichier_media,
  :recommande_nom, :recommande_grade, :recommande_unite,
  :raison_1, :raison_2, :recompense,
  :intro_nom, :intro_grade, :intro_fonction, :intro_unite,
  :mise_en_cause_nom, :mise_en_cause_grade, :mise_en_cause_fonction, :mise_en_cause_unite,
  :date_rp, :date_irl, NOW()
)
";

$stmt = $pdo->prepare($sql);
$stmt->execute([
  ':type' => $type,
  ':titre' => $titre ?: 'Sans titre',
  ':auteur_nom' => $auteur_nom,
  ':personne_renseignee_nom' => $personne_renseignee_nom,
  ':contexte' => $contexte,
  ':resume' => $resume,
  ':bilan' => $bilan,
  ':remarques' => $remarques,
  ':fichier_media' => $jsonMedia,
  ':recommande_nom' => $recommande_nom,
  ':recommande_grade' => $recommande_grade,
  ':recommande_unite' => $recommande_unite,
  ':raison_1' => $raison_1,
  ':raison_2' => $raison_2,
  ':recompense' => $recompense,
  ':intro_nom' => $intro_nom,
  ':intro_grade' => $intro_grade,
  ':intro_fonction' => $intro_fonction,
  ':intro_unite' => $intro_unite,
  ':mise_en_cause_nom' => $mise_en_cause_nom,
  ':mise_en_cause_grade' => $mise_en_cause_grade,
  ':mise_en_cause_fonction' => $mise_en_cause_fonction,
  ':mise_en_cause_unite' => $mise_en_cause_unite,
  ':date_rp' => $date_rp,
  ':date_irl' => $date_irl
]);

$id = (int)$pdo->lastInsertId();

// ─────────────────────────────
//  Redirection
// ─────────────────────────────
header("Location: /Archives7e/layouts/rapport_layout.php?id=".$id);
exit;
