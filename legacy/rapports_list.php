<?php
declare(strict_types=1);
require_once __DIR__.'/includes/db.php';
session_start();

$isAdmin = isset($_SESSION['role']) && $_SESSION['role'] === 'admin';

$isAdmin = false;
if (isset($_SESSION['user'])) {
    $uid = $_SESSION['user']['id'] ?? 0;
    $check = $pdo->prepare("
        SELECT COUNT(*) 
        FROM user_groups ug
        JOIN `groups` g ON g.id = ug.group_id
        WHERE ug.user_id = ? AND g.name = 'Administration'
    ");
    $check->execute([$uid]);
    $isAdmin = $check->fetchColumn() > 0;
}


/* === RÉCUP === */
$sql = "SELECT id, titre, auteur_nom, personne_renseignee_nom, type, date_rp, date_irl
        FROM rapports
        ORDER BY STR_TO_DATE(COALESCE(NULLIF(date_irl,''), date_rp), '%d/%m/%Y') DESC, id DESC";
$rapports = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

function esc($v): string{ return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }
?>
<!doctype html><html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>📜 Rapports — Archives Wehrmacht</title>
<style>
:root{--paper:url('/Archives7e/assets/img/paper.jpg');--ink:#1b1b1b}
html,body{margin:0;height:100%}
body{background:var(--paper) repeat center/512px;font-family:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;color:var(--ink)}
.wrap{max-width:1200px;margin:50px auto;padding:0 20px}
h1{text-align:center;font-weight:900;font-size:2em;margin:0 0 25px}
a.back,a.add{display:inline-block;background:#222;color:#fff;border-radius:8px;padding:8px 12px;text-decoration:none}
a.add{float:right;padding:10px 16px;font-weight:700}
.filters{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin:20px 0 25px}
.filters input,.filters select{background:rgba(255,255,255,0.7);border:1px solid #333;border-radius:8px;padding:8px 12px;font-family:inherit;font-size:15px}
table{border-collapse:collapse;width:100%;font-size:15px}
th,td{border:1px solid #333;padding:10px 8px;text-align:center}
th{background:rgba(0,0,0,0.08);font-weight:800;cursor:pointer}
tr:nth-child(even){background:rgba(255,255,255,0.2)}
tr:hover{background:rgba(0,0,0,0.05)}
.type-tag{display:inline-block;padding:2px 8px;border-radius:5px;font-size:13px;font-weight:bold;color:#fff}
.type-rapport{background:#3a7}.type-recommandation{background:#27a}.type-incident{background:#c33}

/* bouton suppression admin */
button.del{
  background:#a00;
  color:#fff;
  border:0;
  border-radius:6px;
  font-weight:bold;
  cursor:pointer;
  padding:4px 8px;
  transition:0.2s;
}
button.del:hover{background:#d00; transform:scale(1.1);}
</style>

<script>
// préremplir filtre auteur via ?auteur=
document.addEventListener('DOMContentLoaded', ()=>{
  const p=new URLSearchParams(location.search);
  const a=p.get('auteur');
  if(a){
    const inp=document.getElementById('filtreAuteur');
    if(inp){inp.value=a; filtrer();}
  }
});

function filtrer(){
  const titre = (document.getElementById('filtreTitre').value||'').toLowerCase();
  const auteur = (document.getElementById('filtreAuteur').value||'').toLowerCase();
  const type = document.getElementById('filtreType').value;
  const dateType = document.getElementById('dateType').value;
  const dateVal = document.getElementById('filtreDate').value;

  document.querySelectorAll('tbody tr[data-row]').forEach(tr=>{
    const tTitre = tr.dataset.titre.toLowerCase();
    const tAuteur = tr.dataset.auteur.toLowerCase();
    const tPers  = (tr.dataset.personne||'').toLowerCase();
    const tType = tr.dataset.type;
    const dateRP = tr.dataset.dateRp||'';
    const dateIRL = tr.dataset.dateIrl||'';
    let ok = true;

    if(titre && !tTitre.includes(titre)) ok=false;
    if(auteur && !(tAuteur.includes(auteur) || tPers.includes(auteur))) ok=false;
    if(type && tType!==type) ok=false;
    if(dateVal){
      const check = (dateType==='RP')?dateRP:dateIRL;
      if(!check.includes(dateVal)) ok=false;
    }
    tr.style.display = ok?'':'none';
  });
}

function sortTable(n){
  const table=document.querySelector("table");
  let switching=true,dir="asc",switchcount=0;
  while(switching){
    switching=false;
    const rows=table.rows;
    for(let i=1;i<(rows.length-1);i++){
      let should=false;
      const x=rows[i].getElementsByTagName("TD")[n];
      const y=rows[i+1].getElementsByTagName("TD")[n];
      if(dir==="asc" && x.innerText.toLowerCase()>y.innerText.toLowerCase()){should=true;break;}
      if(dir==="desc"&& x.innerText.toLowerCase()<y.innerText.toLowerCase()){should=true;break;}
    }
    if(should){
      rows[i].parentNode.insertBefore(rows[i+1],rows[i]);
      switching=true; switchcount++;
    }else if(switchcount===0 && dir==="asc"){ dir="desc"; switching=true; }
  }
}

function deleteRapport(id){
  if(!confirm("❌ Supprimer définitivement ce rapport ?")) return;
  fetch('/Archives7e/includes/delete_rapport.php',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:'id='+encodeURIComponent(id)
  })
  .then(r=>r.json())
  .then(res=>{
    if(res.ok){
      document.getElementById('row-'+id)?.remove();
      alert('✅ Rapport supprimé');
    }else alert('❌ '+res.error);
  })
  .catch(e=>alert('⚠️ '+e));
}
</script>
</head><body>
<div class="wrap">
  <a href="/Archives7e/index.php" class="back">← Retour</a>
  <a href="/Archives7e/rapport_new.php" class="add">➕ Ajouter</a>

  <h1>📜 Rapports</h1>

  <div class="filters">
    <input type="text" id="filtreTitre" placeholder="Titre..." onkeyup="filtrer()">
    <input type="text" id="filtreAuteur" placeholder="Auteur / Personne renseignée..." onkeyup="filtrer()">
    <select id="filtreType" onchange="filtrer()">
      <option value="">— Type —</option>
      <option value="rapport">Rapport journalier</option>
      <option value="recommandation">Recommandation</option>
      <option value="incident">Incident</option>
    </select>
    <select id="dateType" onchange="filtrer()">
      <option value="RP">Date RP</option>
      <option value="IRL">Date IRL</option>
    </select>
    <input type="date" id="filtreDate" onchange="filtrer()">
  </div>

  <table>
    <thead>
      <tr>
        <th onclick="sortTable(0)">Titre</th>
        <th onclick="sortTable(1)">Date RP</th>
        <th onclick="sortTable(2)">Date IRL</th>
        <th onclick="sortTable(3)">Auteur</th>
        <th onclick="sortTable(4)">Personne renseignée</th>
        <th onclick="sortTable(5)">Type</th>
        <?php if($isAdmin): ?><th>🗑️</th><?php endif; ?>
      </tr>
    </thead>
    <tbody>
      <?php if(empty($rapports)): ?>
        <tr><td colspan="<?= $isAdmin?7:6 ?>" style="text-align:center;opacity:.8;">Aucun rapport enregistré.</td></tr>
      <?php else: foreach($rapports as $r):
        $auteur = $r['auteur_nom'] ?: 'Inconnu';
        $pers   = $r['personne_renseignee_nom'] ?: '';
      ?>
        <tr id="row-<?= (int)$r['id'] ?>"
            data-row
            data-titre="<?= esc($r['titre']) ?>"
            data-auteur="<?= esc($auteur) ?>"
            data-personne="<?= esc($pers) ?>"
            data-type="<?= esc($r['type']) ?>"
            data-date-rp="<?= esc($r['date_rp'] ?? '') ?>"
            data-date-irl="<?= esc($r['date_irl'] ?? '') ?>"
            style="cursor:pointer;"
            onclick="location.href='/Archives7e/rapport.php?id=<?= (int)$r['id'] ?>'">
          <td><?= esc($r['titre']) ?></td>
          <td><?= esc($r['date_rp'] ?? '-') ?></td>
          <td><?= esc($r['date_irl'] ?? '-') ?></td>
          <td><?= esc($auteur) ?></td>
          <td><?= esc($pers ?: '—') ?></td>
          <td><span class="type-tag type-<?= esc($r['type']) ?>"><?= ucfirst($r['type']) ?></span></td>
          <?php if($isAdmin): ?>
          <td onclick="event.stopPropagation();">
            <button class="del" onclick="deleteRapport(<?= (int)$r['id'] ?>)">✖</button>
          </td>
          <?php endif; ?>
        </tr>
      <?php endforeach; endif; ?>
    </tbody>
  </table>
</div>
</body></html>