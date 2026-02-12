<?php
// C:\laragon\www\Archives7e\rapport.php
declare(strict_types=1);
require_once __DIR__.'/includes/db.php';
session_start();

$id = isset($_GET['id'])?(int)$_GET['id']:0;
if($id<=0){ echo "Rapport invalide."; exit; }

$st=$pdo->prepare("SELECT * FROM rapports WHERE id=?");
$st->execute([$id]);
$R=$st->fetch(PDO::FETCH_ASSOC);
if(!$R){ echo "Rapport introuvable."; exit; }

function esc($v){ return htmlspecialchars((string)$v, ENT_QUOTES,'UTF-8'); }

// liens vers effectifs_list
function effectif_link(?int $effId, ?string $nom, ?int $uniteId, ?string $uniteNom): string{
  if(!$nom) $nom='Inconnu';
  if($effId && $uniteId){
    return '<a href="/Archives7e/effectifs_list.php?unite_id='.$uniteId.'#eff-'.$effId.'">'.esc($nom).'</a>';
  }
  return esc($nom);
}

$media = [];
if(!empty($R['fichier_media'])){
  $dec = json_decode($R['fichier_media'], true);
  if(is_array($dec)) $media=$dec;
}

?><!doctype html><html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>📜 Rapport — <?= esc($R['titre']) ?></title>
<style>
:root{--paper:url('/Archives7e/assets/img/paper.jpg');--ink:#1b1b1b}
html,body{margin:0;height:100%}
body{background:var(--paper) repeat center/512px;font-family:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;color:var(--ink)}
.wrap{max-width:980px;margin:24px auto;padding:0 18px}
.paper{position:relative;background:rgba(255,255,255,0.88);background-image:var(--paper);background-blend-mode:lighten;border:1px solid #222;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.28);padding:28px}
.header{text-align:center;margin-bottom:18px}
.header h2{margin:0 0 6px;font-size:26px}
.subtitle{opacity:.85}
.block{margin-top:12px}
.media img,.media video{max-width:100%;border-radius:8px;margin:6px 0}
.btn{display:inline-block;background:#222;color:#fff;border-radius:8px;padding:8px 12px;text-decoration:none;font-weight:700;margin:0 4px}
.tools{text-align:center;margin:14px 0}
.legend{opacity:.8;font-style:italic}
</style>
<!-- libs export -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</head><body>
<div class="wrap">
  <div style="display:flex;justify-content:space-between;margin-bottom:12px">
    <a href="/Archives7e/rapports_list.php" class="btn">← Retour liste</a>
    <?php if(!$R['published']): ?>
      <a href="/Archives7e/layouts/rapport_layout.php?id=<?= (int)$R['id'] ?>" class="btn">🖋️ Mise en page</a>
    <?php endif; ?>
  </div>

  <div class="paper" id="paper">
    <div class="header">
      <h2>📜 RAPPORT : <?= esc($R['titre']) ?></h2>
      <div class="subtitle">
        Rédigé par <?= effectif_link($R['auteur_id'],$R['auteur_nom'],$R['unite_id'],$R['unite_nom']) ?>
        <?php if(!empty($R['personne_renseignee_nom'])): ?>
          — Personne renseignée : <?= effectif_link($R['personne_renseignee_id'],$R['personne_renseignee_nom'],$R['unite_id'],$R['unite_nom']) ?>
        <?php endif; ?><br>
        Date RP : <?= esc($R['date_rp'] ?? '') ?> — Date IRL : <?= esc($R['date_irl'] ?? '') ?>
      </div>
    </div>

    <?php
    // si contenu_html publié, on affiche tel quel, sinon fallback brut
    if(!empty($R['contenu_html'])){
      echo $R['contenu_html'];
    }else{
      echo '<div class="block"><b>I. CONTEXTE</b><br>'.nl2br(esc($R['contexte']??'')).'</div>';
      echo '<div class="block"><b>II. RÉSUMÉ</b><br>'.nl2br(esc($R['resume']??'')).'</div>';
      echo '<div class="block"><b>III. BILAN</b><br>'.nl2br(esc($R['bilan']??'')).'</div>';
      echo '<div class="block"><b>IV. REMARQUES</b><br>'.nl2br(esc($R['remarques']??'')).'</div>';
      if($media){
        echo '<div class="block media"><b>Médias</b><br>';
        foreach($media as $m){
          $url=$m['url']; $leg=$m['legend']??'';
          $ext=strtolower(pathinfo($url,PATHINFO_EXTENSION));
          if(in_array($ext,['png','jpg','jpeg','gif'])){
            echo '<div><img src="'.esc($url).'"><div class="legend">'.esc($leg).'</div></div>';
          } elseif(in_array($ext,['mp4','webm'])) {
            echo '<div><video controls src="'.esc($url).'"></video><div class="legend">'.esc($leg).'</div></div>';
          }
        }
        echo '</div>';
      }
    }
    ?>

    <?php if(!empty($R['signature_nom']) || !empty($R['signature_image'])): ?>
      <div class="block" style="text-align:right;margin-top:20px">
        <?= esc($R['signature_nom'] ?? '') ?><?= !empty($R['signature_grade']) ? ' — '.esc($R['signature_grade']) : '' ?><br>
        <?php if(!empty($R['signature_image'])): ?>
          <img src="<?= esc($R['signature_image']) ?>" style="max-height:100px">
        <?php endif; ?>
      </div>
    <?php endif; ?>
  </div>

  <div class="tools">
    <a class="btn" onclick="downloadImage()">🖼️ Télécharger Image</a>
    <a class="btn" onclick="downloadPDF()">📄 Télécharger PDF</a>
    <?php if(array_filter($media, fn($m)=>preg_match('~\.(mp4|webm)$~i',$m['url']??''))): ?>
      <a class="btn" href="#videos">▶️ Aller aux vidéos</a>
    <?php endif; ?>
  </div>
</div>

<script>
async function downloadImage(){
  const el=document.getElementById('paper');
  const canvas=await html2canvas(el,{scale:2});
  const link=document.createElement('a');
  link.download="rapport_<?= (int)$R['id'] ?>.png";
  link.href=canvas.toDataURL("image/png"); link.click();
}
async function downloadPDF(){
  const { jsPDF } = window.jspdf;
  const el=document.getElementById('paper');
  const canvas=await html2canvas(el,{scale:2});
  const img=canvas.toDataURL("image/png");
  const pdf=new jsPDF("p","mm","a4");
  const w=pdf.internal.pageSize.getWidth();
  const h=(canvas.height*w)/canvas.width;
  pdf.addImage(img,"PNG",0,0,w,h); pdf.save("rapport_<?= (int)$R['id'] ?>.pdf");
}
</script>
</body></html>
