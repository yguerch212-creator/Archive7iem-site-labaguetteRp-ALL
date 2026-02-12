<?php
declare(strict_types=1);
require_once __DIR__.'/includes/db.php';
session_start();

// Récupération des unités
$units = $pdo->query("SELECT id, code, nom FROM unites ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
?>
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Effectifs – Choisir une unité</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root{
    --paper:url('/Archives7e/assets/img/paper.jpg');
    --ink:#1b1b1b;
  }
  html,body{height:100%;margin:0;padding:0}
  body{
    background:var(--paper) repeat center/512px;
    font-family:"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color:var(--ink);
  }

  .wrap{
    max-width:800px;
    margin:70px auto;
    padding:0 20px;
  }

  h1{
    text-align:center;
    font-weight:900;
    font-size:2.3em;
    letter-spacing:1px;
    margin:0;
  }
  .subtitle{
    text-align:center;
    margin:10px 0 30px;
    opacity:0.75;
  }

  a.back{
    display:inline-block;
    background:#2f2e2a;
    color:#fff;
    border-radius:8px;
    padding:8px 12px;
    text-decoration:none;
    font-size:14px;
    margin-bottom:25px;
  }

  .list{
    display:flex;
    flex-direction:column;
    gap:18px;
  }

  .unit{
    font-size:28px;
    font-weight:800;
    text-decoration:none;
    display:inline-block;
    width:max-content;
    transition:transform .1s ease-in-out;
  }

  .unit:hover{transform:translateX(5px);}

  .sep{height:1px;background:rgba(0,0,0,.12);width:100%;}

  /* Couleurs fixes par corps */
  .c-916  { color:#dcdcdc; text-shadow:0 0 3px #000; }     /* Infanterie / 84. Armeekorps */
  .c-413  { color:#ff9500; }                               /* Feldgendarmerie */
  .c-916S { color:#3da9fc; }                               /* Sanitäts-Abteilung */
  .c-001  { color:#222; }                                  /* Marine Pionier */
  .c-130  { color:#8a2be2; }                               /* Panzer Lehr */
  .c-009  { color:#e4c21c; }                               /* Fallschirmjäger */
</style>
</head>
<body>
  <div class="wrap">
    <a href="dashboard.php" class="back">← Retour</a>
    <h1>Effectifs</h1>
    <div class="subtitle">Choisis une unité pour afficher le tableau des effectifs.</div>

    <div class="list">
      <?php
      foreach ($units as $u):
        $code = strtoupper(trim($u['code']));
        // Définir la classe couleur selon le code
        $class = 'c-'.preg_replace('/[^A-Z0-9]/','',$code);
        // Corriger les doublons type "916 916." → "916. ..."
        $nomAffiche = trim(preg_replace('/^(\d+)\s+\1[.\s]*/', '$1. ', ($u['code'].' '.$u['nom'])));
      ?>
        <a class="unit <?=$class?>" href="/Archives7e/effectifs_list.php?unite_id=<?= (int)$u['id'] ?>">
          <?= htmlspecialchars($nomAffiche, ENT_QUOTES, 'UTF-8') ?>
        </a>
        <div class="sep"></div>
      <?php endforeach; ?>

      <?php if (!$units): ?>
        <div>Aucune unité n’est définie.</div>
      <?php endif; ?>
    </div>
  </div>
</body>
</html>
