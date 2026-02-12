<?php
declare(strict_types=1);
require_once __DIR__.'/includes/db.php';
session_start();

if (!isset($_GET['id'])) {
  header('Location:/Archives7e/effectifs.php'); exit;
}
$id = (int)$_GET['id'];

// Données
$sql = "
SELECT e.*, g.nom_complet AS grade_nom, u.nom AS unite_nom, u.code AS unite_code
FROM effectifs e
LEFT JOIN grades g ON g.id = e.grade_id
LEFT JOIN unites u ON u.id = e.unite_id
WHERE e.id = ?";
$st = $pdo->prepare($sql);
$st->execute([$id]);
$E = $st->fetch();
if (!$E) { echo 'Aucun effectif trouvé.'; exit; }

// Layout JSON
$st = $pdo->prepare("SELECT layout_json FROM effectif_layouts WHERE effectif_id=?");
$st->execute([$id]);
$layout = json_decode($st->fetchColumn() ?: '{}', true);

function esc($v){ return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }

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


$unitTitle = trim((string)$E['unite_code']) ? ($E['unite_code'].' '.$E['unite_nom']) : $E['unite_nom'];
?>
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Modifier la mise en page — Soldbuch</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root{
    --paper:url('/Archives7e/assets/img/paper.jpg');
    --ink:#1b1b1b;
  }
  html,body{margin:0;padding:0;height:100%}
  body{
    background:var(--paper) repeat center/512px;
    font-family:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;
    color:var(--ink);
  }

  .topbar{
    position:sticky; top:0; z-index:20;
    display:flex; justify-content:space-between; align-items:center;
    gap:10px; padding:10px 16px;
    background:rgba(0,0,0,.75); color:#fff;
  }
  .btn{background:#222;color:#fff;border:0;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer;text-decoration:none}

  .wrap{max-width:1000px;margin:18px auto;padding:0 16px;}
  .paper{
    position:relative;
    background:rgba(255,255,255,0.88);
    background-image:var(--paper);
    background-blend-mode:lighten;
    border:1px solid #222; border-radius:12px;
    box-shadow:0 10px 40px rgba(0,0,0,.28);
    padding:28px; min-height:1200px;
  }

  .header{text-align:center;margin-bottom:12px} /* Réduit la marge ici */
  .header h1{margin:0 0 6px; font-size:26px; letter-spacing:.4px}
  .subtitle{opacity:.85}
  .lead{line-height:1.35; margin-top:8px}

  .canvas{position:relative; min-height:1000px}
  .bloc{
    position:absolute; left:0; top:0;
    padding:8px; background:rgba(255,255,240,0.5);
    border:1px dashed #555; border-radius:6px;
    resize:both; overflow:auto; cursor:move;
  }
  .bloc[contenteditable="true"]:focus{outline:2px solid #000; background:rgba(255,255,255,0.8)}
  img.dr{position:absolute; left:0; top:0; cursor:move; border:2px solid #444; border-radius:6px; object-fit:cover}

  /* zone signature manuelle */
  .signature-box{
    margin:60px auto 20px;
    text-align:center;
    background:rgba(255,255,255,0.9);
    border:2px dashed #555;
    border-radius:8px;
    padding:12px;
    width:480px;
  }
  canvas#sigCanvas{
    background:#fff;
    border:1px solid #222;
    border-radius:4px;
    width:100%;
    height:150px;
  }
  .tools{margin-top:8px;display:flex;justify-content:center;gap:8px;}
</style>
</head>
<body>

<div class="topbar">
  <a class="btn" href="/Archives7e/soldbuch.php?id=<?= $id ?>">← Retour au Soldbuch</a>
  <div>
    <button class="btn" onclick="saveLayout()">💾 Enregistrer</button>
    <button class="btn" onclick="resetLayout()">🖼️ Réinitialiser</button>
  </div>
</div>

<div class="wrap">
  <div class="paper">
    <div class="header">
      <h1>📘 SOLDBUCH – LIVRET PERSONNEL DU SOLDAT</h1>
      <div class="subtitle"><?= esc($unitTitle) ?></div>
      <div class="lead">
        Dieses Soldbuch ist ein offizielles Dokument der Wehrmacht. Es ist ständig mitzuführen und auf Verlangen vorzuzeigen.<br>
        Ce livret doit rester constamment en possession du soldat.<br>
        En cas de perte, falsification ou refus de présentation lors d’un contrôle, des sanctions disciplinaires seront appliquées.
      </div>
    </div>

    <div class="canvas" id="canvas">
      <!-- Blocs texte -->
      <div class="bloc" id="identite" data-type="identite" contenteditable="true"
           style="left:40px;top:180px;width:420px;height:170px;"> <!-- top réduit -->
        <b>1. IDENTITÉ</b><br>
        Nom : <?= esc($E['nom']) ?><br>
        Prénom : <?= esc($E['prenom']) ?><br>
        Surnom : <?= esc($E['surnom']) ?><br>
        Date de naissance : <?= esc($E['date_naissance']) ?><br>
        Lieu de naissance : <?= esc($E['lieu_naissance']) ?><br>
        Nationalité : <?= esc($E['nationalite']) ?><br>
        Taille : <?= esc((string)($E['taille_cm'] ?? $E['taille'] ?? '')) ?> cm
      </div>

      <div class="bloc" id="affectation" data-type="affectation" contenteditable="true"
           style="left:40px;top:380px;width:420px;height:130px;">
        <b>2. AFFECTATION</b><br>
        Unité : <?= esc($unitTitle) ?><br>
        Grade : <?= esc($E['grade_nom']) ?><br>
        Spécialité : <?= esc($E['specialite']) ?><br>
        Entrée RP : <?= esc($E['date_entree_ig']) ?> — Entrée IRL : <?= esc($E['date_entree_irl']) ?>
      </div>

      <div class="bloc" id="equipement" data-type="equipement" contenteditable="true"
           style="left:40px;top:530px;width:480px;height:120px;">
        <b>3. ÉQUIPEMENT ATTRIBUÉ</b><br>
        Arme principale : <?= esc($E['arme_principale']) ?><br>
        Arme secondaire : <?= esc($E['arme_secondaire']) ?><br>
        Équipement spécial : <?= esc($E['equipement_special']) ?><br>
        Tenue : <?= esc($E['tenue']) ?>
      </div>

      <div class="bloc" id="historique" data-type="historique" contenteditable="true"
           style="left:40px;top:670px;width:860px;height:160px;">
        <b>4. HISTORIQUE DU SOLDAT</b><br><?= nl2br(esc($E['historique'])) ?>
      </div>

      <div class="bloc" id="decorations" data-type="decorations" contenteditable="true"
           style="left:40px;top:850px;width:420px;height:100px;">
        <b>5. DÉCORATIONS REÇUES</b><br><?= nl2br(esc($E['decorations'])) ?>
      </div>

      <div class="bloc" id="sanctions" data-type="sanctions" contenteditable="true"
           style="left:480px;top:850px;width:420px;height:100px;">
        <b>6. SANCTIONS OU REMARQUES</b><br><?= nl2br(esc($E['sanctions'])) ?>
      </div>

      <!-- Images -->
<!-- Photo + bouton modifier (draggable container; img is static inside) -->
<div id="photoWrap" class="dr" data-type="photo"
     style="position:absolute;left:700px;top:190px;width:170px;text-align:center;">
  <img id="photo"
       src="<?= esc($layout['photo']['url'] ?? $photoUrl) ?>"
       alt="Photo identité"
       style="width:170px;height:220px;display:block;border:2px solid #444;border-radius:6px;object-fit:cover;">
  <button id="btnPhoto" class="btn" style="margin-top:6px;padding:4px 8px;font-size:13px;">
    📸 Modifier la photo
  </button>
</div>
      <img src="<?= esc($layout['sig_soldat']['url'] ?? $sigSold) ?>"
           id="sig_soldat" class="dr" data-type="sig_soldat"
           style="left:80px;top:1010px;width:180px;height:70px;">
      <img src="<?= esc($layout['sig_off']['url'] ?? $sigOff) ?>"
           id="sig_off" class="dr" data-type="sig_off"
           style="left:380px;top:1010px;width:180px;height:70px;">
      <img src="<?= esc($layout['stamp']['url'] ?? $stampUrl) ?>"
           id="stamp" class="dr" data-type="stamp"
           style="left:720px;top:990px;width:170px;height:170px;">
    </div>
  </div>

  <!-- Zone dessin signature en dessous -->
  <div class="signature-box">
    <h3>✍️ Dessiner ou importer votre signature</h3>
    <canvas id="sigCanvas" width="480" height="150"></canvas>
    <div class="tools">
      <button onclick="clearSig()">🧹 Effacer</button>
      <button onclick="saveSig()">💾 Sauver</button>
      <label style="cursor:pointer;">📤 Importer
        <input type="file" id="sigImport" accept="image/*" hidden>
      </label>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js"></script>
<script>
  // DRAG/RESIZE
  document.querySelectorAll('.bloc, .dr').forEach(el=>{
    if(!el.style.left) el.style.left='0px';
    if(!el.style.top)  el.style.top='0px';
    interact(el).draggable({
      listeners:{
        move(ev){
          const x=parseFloat(el.style.left||0)+ev.dx;
          const y=parseFloat(el.style.top||0)+ev.dy;
          el.style.left=x+'px';
          el.style.top=y+'px';
        }
      }
    }).resizable({edges:{left:true,right:true,bottom:true,top:true}})
    .on('resizemove',ev=>{
      el.style.width=ev.rect.width+'px';
      el.style.height=ev.rect.height+'px';
      el.style.left=(parseFloat(el.style.left||0)+ev.deltaRect.left)+'px';
      el.style.top=(parseFloat(el.style.top||0)+ev.deltaRect.top)+'px';
    });
  });

  // Signature dessin
  const canvas=document.getElementById('sigCanvas');
  const ctx=canvas.getContext('2d');
  let draw=false;
  canvas.addEventListener('mousedown',e=>{draw=true;ctx.beginPath();ctx.moveTo(e.offsetX,e.offsetY);});
  canvas.addEventListener('mousemove',e=>{if(!draw)return;ctx.lineTo(e.offsetX,e.offsetY);ctx.stroke();});
  ['mouseup','mouseleave'].forEach(ev=>canvas.addEventListener(ev,()=>draw=false));
  function clearSig(){ctx.clearRect(0,0,canvas.width,canvas.height);}
  function saveSig(){
    const data=canvas.toDataURL('image/png');
    document.getElementById('sig_soldat').src=data;
    alert('✅ Signature dessinée ajoutée à la mise en page (non sauvegardée tant que vous ne cliquez pas sur "Enregistrer").');
  }
  document.getElementById('sigImport').addEventListener('change',e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=ev=>{
      document.getElementById('sig_soldat').src=ev.target.result;
      alert('✅ Signature importée ajoutée à la mise en page.');
    }; r.readAsDataURL(f);
  });

  async function saveLayout(){
    const items={};
    document.querySelectorAll('.bloc, .dr').forEach(el=>{
      const type=el.dataset.type;
     items[type] = {
  x: Math.round(parseFloat(el.style.left||'0')),
  y: Math.round(parseFloat(el.style.top ||'0')),
  w: Math.round(parseFloat(el.style.width||el.offsetWidth)),
  h: Math.round(parseFloat(el.style.height||el.offsetHeight)),
  text: el.contentEditable==='true' ? el.innerHTML : undefined,
  // if it's the photo wrapper, save the inner image src; otherwise keep IMG src logic
  url: (el.dataset.type === 'photo')
        ? document.getElementById('photo').src
        : (el.tagName === 'IMG' ? el.src : undefined)
};

    });
    const res=await fetch('layout_save.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:<?= $id ?>,layout:items})});
    const msg=await res.text();
    alert(msg.includes('OK')?'✅ Mise en page enregistrée.':msg);
  }

  function resetLayout(){if(confirm('Réinitialiser ?'))location.reload();}
  // Bouton "Modifier la photo"
document.getElementById('btnPhoto').addEventListener('click', ()=>{
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = e=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev=>{
      document.getElementById('photo').src = ev.target.result;
      alert('✅ Photo mise à jour (pense à cliquer sur "Enregistrer").');
    };
    reader.readAsDataURL(file);
  };
  input.click();
});

</script>
</body>
</html>
