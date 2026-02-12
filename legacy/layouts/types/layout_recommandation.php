<?php
$media = [];
if(!empty($R['fichier_media'])){
  $tmp = json_decode($R['fichier_media'], true);
  if(is_array($tmp)) $media = $tmp;
}
?>

<!-- RAPPORT DE RECOMMANDATION -->
<div class="bloc" style="left:40px;top:40px;width:420px" contenteditable="true">
  <header><span class="title">I. PERSONNE RECOMMANDÉE</span><span class="tools"><button onclick="shrink(this)">▭</button><button onclick="rm(this)">✖</button></span></header>
  <?= esc($R['recommande_nom'] ?? '') ?> — <?= esc($R['recommande_grade'] ?? '') ?><br>
  <?= esc($R['unite_nom'] ?? '') ?>
</div>

<div class="bloc" style="left:40px;top:220px;width:420px" contenteditable="true">
  <header><span class="title">II. MOTIFS</span><span class="tools"><button onclick="shrink(this)">▭</button><button onclick="rm(this)">✖</button></span></header>
  <?= nl2br(esc(($R['raison_1'] ?? '')."\n".$R['raison_2']."\n".$R['raison_3']."\n".$R['raison_4'])) ?>
</div>

<div class="bloc" style="left:40px;top:420px;width:420px" contenteditable="true">
  <header><span class="title">III. RÉCOMPENSE PROPOSÉE</span><span class="tools"><button onclick="shrink(this)">▭</button><button onclick="rm(this)">✖</button></span></header>
  <?= nl2br(esc($R['recompense'] ?? '')) ?>
</div>

<div class="bloc" style="left:500px;top:420px;width:420px" contenteditable="true">
  <header><span class="title">IV. CONCLUSION</span><span class="tools"><button onclick="shrink(this)">▭</button><button onclick="rm(this)">✖</button></span></header>
  <?= nl2br(esc($R['conclusion'] ?? '')) ?>
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
