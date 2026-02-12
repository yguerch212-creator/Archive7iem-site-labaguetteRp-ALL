<?php
$media = [];
if(!empty($R['fichier_media'])){
  $tmp = json_decode($R['fichier_media'], true);
  if(is_array($tmp)) $media = $tmp;
}
?>

<!-- RAPPORT D'INCIDENT -->
<div class="bloc" style="left:40px;top:40px;width:420px" contenteditable="true">
  <header><span class="title">I. INTRODUCTION</span><span class="tools"><button onclick="shrink(this)">▭</button><button onclick="rm(this)">✖</button></span></header>
  <?= esc($R['intro_nom'] ?? '') ?> — <?= esc($R['intro_grade'] ?? '') ?> — <?= esc($R['intro_unite'] ?? '') ?><br>
  Fonction : <?= esc($R['intro_fonction'] ?? '') ?><br>
  Lieu : <?= esc($R['lieu_incident'] ?? '') ?>
</div>

<div class="bloc" style="left:40px;top:220px;width:420px" contenteditable="true">
  <header><span class="title">II. MISE EN CAUSE</span><span class="tools"><button onclick="shrink(this)">▭</button><button onclick="rm(this)">✖</button></span></header>
  <?= esc($R['mise_en_cause_nom'] ?? '') ?> — <?= esc($R['mise_en_cause_grade'] ?? '') ?> — <?= esc($R['mise_en_cause_unite'] ?? '') ?><br>
  Fonction : <?= esc($R['mise_en_cause_fonction'] ?? '') ?><br>
  <?= nl2br(esc($R['infos_complementaires'] ?? '')) ?>
</div>

<div class="bloc" style="left:40px;top:420px;width:860px" contenteditable="true">
  <header><span class="title">III. COMPTE RENDU</span><span class="tools"><button onclick="shrink(this)">▭</button><button onclick="rm(this)">✖</button></span></header>
  <?= nl2br(esc($R['compte_rendu'] ?? '')) ?>
</div>

<?php $y=640; foreach($media as $m): $url=$m['url']; $leg=$m['legend']??''; $ext=strtolower(pathinfo($url,PATHINFO_EXTENSION)); ?>
  <div class="bloc media" style="left:40px;top:<?= $y ?>px;width:480px" data-type="media">
    <header><span class="title">Média</span><span class="tools">
      <button onclick="shrink(this)">▭</button><button onclick="rm(this)">✖</button></span></header>
    <?php if(in_array($ext,['png','jpg','jpeg','gif'])): ?>
      <img src="<?= esc($url) ?>">
    <?php else: ?>
      <video controls src="<?= esc($url) ?>"></video>
    <?php endif; ?>
    <?php if($leg): ?><div class="legend"><?= esc($leg) ?></div><?php endif; ?>
  </div>
<?php $y+=220; endforeach; ?>
