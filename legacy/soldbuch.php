<?php
declare(strict_types=1);
require_once __DIR__.'/includes/db.php';
session_start();

if (!isset($_GET['id'])) {
  header('Location:/Archives7e/effectifs.php');
  exit;
}
$id = (int)$_GET['id'];

/* === RÉCUPÉRATION DES DONNÉES === */
$sql = "
SELECT e.*, g.nom_complet AS grade_nom, u.nom AS unite_nom, u.code AS unite_code
FROM effectifs e
LEFT JOIN grades g ON g.id = e.grade_id
LEFT JOIN unites u ON u.id = e.unite_id
WHERE e.id = ?";
$st = $pdo->prepare($sql);
$st->execute([$id]);
$E = $st->fetch(PDO::FETCH_ASSOC);
if (!$E) { echo 'Aucun effectif trouvé.'; exit; }

/* === RÉCUPÉRATION DU LAYOUT === */
$st = $pdo->prepare("SELECT layout_json FROM effectif_layouts WHERE effectif_id=?");
$st->execute([$id]);
$layout = json_decode($st->fetchColumn() ?: '{}', true);

function esc($v){ return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }

/* === TRAITEMENT DES DONNÉES === */
$code = trim((string)($E['unite_code'] ?? ''));
$nom  = trim((string)($E['unite_nom'] ?? ''));
$unitTitle = $code ? ($code.' '.$nom) : $nom;

/* === CHEMINS D’IMAGES === */
$photoUrl = !empty($layout['photo']['url']) && str_ends_with($layout['photo']['url'], '.png')
  ? $layout['photo']['url']
  : ($E['photo'] ?? '/Archives7e/assets/uploads/photos/photoidzuss.jpg');

$sigSold = !empty($layout['sig_soldat']['url']) && str_ends_with($layout['sig_soldat']['url'], '.png')
  ? $layout['sig_soldat']['url']
  : ($E['signature_soldat'] ?? '/Archives7e/assets/uploads/signatures/sig_1_1762117057.png');

/* 🧨 Vérif stricte signature officier */
$sigOff = '/Archives7e/assets/uploads/signatures/officier_copie.png';
if (!empty($layout['sig_off']['url']) && preg_match('/\.(png|jpg|jpeg)$/i', $layout['sig_off']['url'])) {
    $sigOff = $layout['sig_off']['url'];
} elseif (!empty($E['signature_referent']) && preg_match('/\.(png|jpg|jpeg)$/i', $E['signature_referent'])) {
    $sigOff = '/Archives7e/assets/uploads/signatures/' . basename($E['signature_referent']);
}

$stampUrl = !empty($layout['stamp']['url']) && str_ends_with($layout['stamp']['url'], '.png')
  ? $layout['stamp']['url']
  : (!empty($E['stamp_path']) ? $E['stamp_path'] : '/Archives7e/assets/uploads/signatures/tempon916.png');


/* === POSITIONS PAR DÉFAUT (identiques au layout) === */
$defaults = [
  'identite'   => ['x'=>40,  'y'=>240, 'w'=>420, 'h'=>170],
  'affectation'=> ['x'=>40,  'y'=>430, 'w'=>420, 'h'=>130],
  'equipement' => ['x'=>40,  'y'=>580, 'w'=>480, 'h'=>120],
  'historique' => ['x'=>40,  'y'=>720, 'w'=>860, 'h'=>160],
  'decorations'=> ['x'=>40,  'y'=>900, 'w'=>420, 'h'=>100],
  'sanctions'  => ['x'=>480, 'y'=>900, 'w'=>420, 'h'=>100],
  'photo'      => ['x'=>700, 'y'=>250, 'w'=>170, 'h'=>220],
  'sig_soldat' => ['x'=>80,  'y'=>1050,'w'=>180, 'h'=>70 ],
  'sig_off'    => ['x'=>380, 'y'=>1050,'w'=>180, 'h'=>70 ],
  'stamp'      => ['x'=>720, 'y'=>1030,'w'=>170, 'h'=>170],
];

/* === FONCTIONS === */
function sb_pos(array $layout, array $defaults, string $key): array {
  $L = $layout[$key] ?? [];
  $D = $defaults[$key];
  return [
    'x' => (int)($L['x'] ?? $D['x']),
    'y' => (int)($L['y'] ?? $D['y']),
    'w' => (int)($L['w'] ?? $D['w']),
    'h' => (int)($L['h'] ?? $D['h']),
  ];
}
function textOrDefault(array $layout, string $key, string $fallback): string {
  return isset($layout[$key]['text']) && $layout[$key]['text'] !== '' ? $layout[$key]['text'] : $fallback;
}

/* === TEXTES PAR DÉFAUT === */
$taille = isset($E['taille_cm']) && $E['taille_cm'] !== '' ? (int)$E['taille_cm'] : (isset($E['taille']) && $E['taille']!=='' ? (int)$E['taille'] : null);

$txtIdentite = '
  <b>1. IDENTITÉ</b><br>
  Nom : '.esc($E['nom']).'<br>
  Prénom : '.esc($E['prenom']).'<br>
  Surnom : '.esc($E['surnom']).'<br>
  Date de naissance : '.esc($E['date_naissance']).'<br>
  Lieu de naissance : '.esc($E['lieu_naissance']).'<br>
  Nationalité : '.esc($E['nationalite']).'<br>'
  .($taille !== null ? 'Taille : '.esc((string)$taille).' cm' : '');

$txtAffect = '
  <b>2. AFFECTATION</b><br>
  Unité : '.esc($unitTitle).'<br>
  Grade : '.esc($E['grade_nom']).'<br>
  Spécialité : '.esc($E['specialite']).'<br>
  Entrée RP : '.esc($E['date_entree_ig']).' — Entrée IRL : '.esc($E['date_entree_irl']);

$txtEquip = '
  <b>3. ÉQUIPEMENT ATTRIBUÉ</b><br>
  Arme principale : '.esc($E['arme_principale']).'<br>
  Arme secondaire : '.esc($E['arme_secondaire']).'<br>
  Équipement spécial : '.esc($E['equipement_special']).'<br>
  Tenue : '.esc($E['tenue']);

$txtHist = '<b>4. HISTORIQUE DU SOLDAT</b><br>'.nl2br(esc($E['historique']));
$txtDeco = '<b>5. DÉCORATIONS REÇUES</b><br>'.nl2br(esc($E['decorations']));
$txtSanc = '<b>6. SANCTIONS OU REMARQUES</b><br>'.nl2br(esc($E['sanctions']));
?>
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title><?= esc($unitTitle) ?> — Soldbuch</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root{
  --paper:url('/Archives7e/assets/img/paper.jpg');
  --ink:#1b1b1b;
}
html,body{margin:0;padding:0;height:100%}
body{
  background:var(--paper) repeat center/512px;
  font-family:"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace;
  color:var(--ink);
}
.wrap{max-width:1000px;margin:24px auto;padding:0 16px}
.btn{display:inline-block;background:#222;color:#fff;border-radius:8px;padding:8px 12px;text-decoration:none;font-weight:700}
.paper{
  position:relative;
  background:rgba(255,255,255,0.88);
  background-image:var(--paper);
  background-blend-mode:lighten;
  border:1px solid #222; border-radius:12px;
  box-shadow:0 10px 40px rgba(0,0,0,.28);
  padding:28px; min-height:1200px;
}
.header{text-align:center;margin-bottom:18px}
.header h2{margin:0 0 6px; font-size:26px; letter-spacing:.4px}
.subtitle{opacity:.85}
.lead{line-height:1.35; margin-top:10px}
.canvas{position:relative; min-height:1000px}
.block{position:absolute;padding:6px;}
.imgAbs{position:absolute;border:2px solid #444;border-radius:6px;object-fit:cover;}
</style>
</head>
<body>
<div class="wrap">
  <div style="display:flex;justify-content:space-between;margin-bottom:12px">
    <a href="/Archives7e/effectifs_list.php?unite_id=<?= (int)$E['unite_id'] ?>" class="btn">← Retour liste</a>
    <a href="/Archives7e/soldbuch_layout.php?id=<?= $id ?>" class="btn">🖋️ Modifier mise en page</a>
  </div>

  <div class="paper">
    <div class="header">
      <h2>📘 SOLDBUCH – LIVRET PERSONNEL DU SOLDAT</h2>
      <div class="subtitle"><?= esc($unitTitle) ?></div>
      <div class="lead">
        Dieses Soldbuch ist ein offizielles Dokument der Wehrmacht. Es ist ständig mitzuführen und auf Verlangen vorzuzeigen.<br>
        Ce livret doit rester constamment en possession du soldat.<br>
        En cas de perte, falsification ou refus de présentation lors d’un contrôle, des sanctions disciplinaires seront appliquées.
      </div>
    </div>

    <div class="canvas">
      <?php
        // === BLOCS TEXTE ===
        $b = sb_pos($layout,$defaults,'identite');
        echo '<div class="block" style="left:'.$b['x'].'px;top:'.$b['y'].'px;width:'.$b['w'].'px;height:'.$b['h'].'px;">'.textOrDefault($layout,'identite',$txtIdentite).'</div>';

        $b = sb_pos($layout,$defaults,'affectation');
        echo '<div class="block" style="left:'.$b['x'].'px;top:'.$b['y'].'px;width:'.$b['w'].'px;height:'.$b['h'].'px;">'.textOrDefault($layout,'affectation',$txtAffect).'</div>';

        $b = sb_pos($layout,$defaults,'equipement');
        echo '<div class="block" style="left:'.$b['x'].'px;top:'.$b['y'].'px;width:'.$b['w'].'px;height:'.$b['h'].'px;">'.textOrDefault($layout,'equipement',$txtEquip).'</div>';

        $b = sb_pos($layout,$defaults,'historique');
        echo '<div class="block" style="left:'.$b['x'].'px;top:'.$b['y'].'px;width:'.$b['w'].'px;height:'.$b['h'].'px;">'.textOrDefault($layout,'historique',$txtHist).'</div>';

        $b = sb_pos($layout,$defaults,'decorations');
        echo '<div class="block" style="left:'.$b['x'].'px;top:'.$b['y'].'px;width:'.$b['w'].'px;height:'.$b['h'].'px;">'.textOrDefault($layout,'decorations',$txtDeco).'</div>';

        $b = sb_pos($layout,$defaults,'sanctions');
        echo '<div class="block" style="left:'.$b['x'].'px;top:'.$b['y'].'px;width:'.$b['w'].'px;height:'.$b['h'].'px;">'.textOrDefault($layout,'sanctions',$txtSanc).'</div>';

        // === IMAGES ===
        $b = sb_pos($layout,$defaults,'photo');
        echo '<img class="imgAbs" src="'.esc($photoUrl).'" style="left:'.$b['x'].'px;top:'.$b['y'].'px;width:'.$b['w'].'px;height:'.$b['h'].'px;">';

        $b = sb_pos($layout,$defaults,'sig_soldat');
        echo '<img class="imgAbs" src="'.esc($sigSold).'" style="left:'.$b['x'].'px;top:'.$b['y'].'px;width:'.$b['w'].'px;height:'.$b['h'].'px;">';

        $b = sb_pos($layout,$defaults,'sig_off');
        echo '<img class="imgAbs" src="'.esc($sigOff).'" style="left:'.$b['x'].'px;top:'.$b['y'].'px;width:'.$b['w'].'px;height:'.$b['h'].'px;">';

        $b = sb_pos($layout,$defaults,'stamp');
        echo '<img class="imgAbs" src="'.esc($stampUrl).'" style="left:'.$b['x'].'px;top:'.$b['y'].'px;width:'.$b['w'].'px;height:'.$b['h'].'px;">';
      ?>
    </div>
  </div>
</div>
<!-- Barre de téléchargement -->
<div style="text-align:center; margin:20px 0;">
  <button class="btn" onclick="downloadImage()">🖼️ Télécharger en Image</button>
  <button class="btn" onclick="downloadPDF()">📄 Télécharger en PDF</button>
</div>

<!-- Librairies externes -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

<script>
async function downloadImage(){
  const paper = document.querySelector('.paper');
  const canvas = await html2canvas(paper, {scale:2});
  const link = document.createElement('a');
  link.download = "soldbuch_<?= (int)$id ?>.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

async function downloadPDF(){
  const { jsPDF } = window.jspdf;
  const paper = document.querySelector('.paper');
  const canvas = await html2canvas(paper, {scale:2});
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = (canvas.height * pageWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
  pdf.save("soldbuch_<?= (int)$id ?>.pdf");
}
</script>

</body>
</html>
