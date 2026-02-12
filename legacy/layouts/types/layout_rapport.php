<?php
$media = [];
if(!empty($R['fichier_media'])){
  $tmp = json_decode($R['fichier_media'], true);
  if(is_array($tmp)) $media = $tmp;
}
?>

<!-- RAPPORT JOURNALIER -->
<div class="bloc" style="left:40px;top:40px;width:420px" contenteditable="true" data-type="text">
  <header><span class="title">I. CONTEXTE</span><span class="tools">
    <button onclick="shrink(this)">▭</button><button onclick="rm(this)">✖</button></span></header>
  <?= nl2br(esc($R['contexte'] ?? '')) ?>
</div>

<div class="bloc" style="left:40px;top:220px;width:860px" contenteditable="true" data-type="text">
  <header><span class="title">II. RÉSUMÉ</span><span class="tools">
    <button onclick="shrink(this)">▭</button><button onclick="rm(this)">✖</button></span></header>
  <?= nl2br(esc($R['resume'] ?? '')) ?>
</div>

<div class="bloc" style="left:40px;top:420px;width:420px" contenteditable="true" data-type="text">
  <header><span class="title">III. BILAN</span><span class="tools">
    <button onclick="shrink(this)">▭</button><button onclick="rm(this)">✖</button></span></header>
  <?= nl2br(esc($R['bilan'] ?? '')) ?>
</div>

<div class="bloc" style="left:500px;top:420px;width:420px" contenteditable="true" data-type="text">
  <header><span class="title">IV. REMARQUES</span><span class="tools">
    <button onclick="shrink(this)">▭</button><button onclick="rm(this)">✖</button></span></header>
  <?= nl2br(esc($R['remarques'] ?? '')) ?>
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
