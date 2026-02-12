<?php
declare(strict_types=1);
session_start();
?>
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Nouveau Rapport — Archives Wehrmacht</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root{
  --paper:url('/Archives7e/assets/img/paper.jpg');
  --ink:#1b1b1b;
}
html,body{margin:0;padding:0;height:100%;}
body{
  background:var(--paper) repeat center/512px;
  font-family:"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace;
  color:var(--ink);
}
.wrap{
  max-width:900px;
  margin:60px auto;
  padding:0 20px;
  text-align:center;
}
h1{
  font-size:2.2em;
  font-weight:900;
  margin-bottom:10px;
}
h2{
  opacity:0.85;
  font-weight:400;
  margin-bottom:40px;
}
.grid{
  display:flex;
  flex-wrap:wrap;
  justify-content:center;
  gap:25px;
}
.card{
  width:260px;
  height:200px;
  border:2px solid #222;
  border-radius:12px;
  background:rgba(255,255,255,0.75);
  box-shadow:0 10px 25px rgba(0,0,0,0.25);
  cursor:pointer;
  transition:transform .2s, box-shadow .2s;
}
.card:hover{
  transform:scale(1.04);
  box-shadow:0 12px 30px rgba(0,0,0,0.4);
}
.card h3{
  margin-top:60px;
  font-size:1.3em;
  font-weight:800;
}
.card p{
  opacity:.7;
  font-size:.9em;
}
.back{
  display:inline-block;
  margin-bottom:20px;
  background:#222;
  color:#fff;
  border-radius:8px;
  padding:8px 12px;
  text-decoration:none;
  font-size:14px;
}
</style>
</head>
<body>
<div class="wrap">
  <a href="/Archives7e/rapports_list.php" class="back">← Retour à la liste</a>
  <h1>Nouveau Rapport</h1>
  <h2>Sélectionnez le type de rapport à créer</h2>

  <div class="grid">
    <div class="card" onclick="location.href='rapport_new_rapport.php'">
      <h3>Rapport Journalier</h3>
      <p>Compte rendu d'opération ou activité quotidienne</p>
    </div>
    <div class="card" onclick="location.href='rapport_new_recommandation.php'">
      <h3>Recommandation</h3>
      <p>Proposition de récompense ou promotion</p>
    </div>
    <div class="card" onclick="location.href='rapport_new_incident.php'">
      <h3>Incident</h3>
      <p>Rapport disciplinaire ou événement notable</p>
    </div>
  </div>
</div>
</body>
</html>
