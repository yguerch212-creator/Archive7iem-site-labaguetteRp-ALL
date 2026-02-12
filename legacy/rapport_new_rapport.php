<?php
// C:\laragon\www\Archives7e\rapport_new_rapport.php
declare(strict_types=1);
require_once __DIR__.'/includes/db.php';
session_start();

// unites & effectifs pour selects
$unites = $pdo->query("SELECT id, code, nom FROM unites ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
$effectifs = $pdo->query("SELECT e.id, e.nom, e.prenom, e.unite_id FROM effectifs e ORDER BY e.nom, e.prenom")->fetchAll(PDO::FETCH_ASSOC);
?>
<!doctype html><html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nouveau Rapport Journalier</title>
<style>
:root{--paper:url('/Archives7e/assets/img/paper.jpg');--ink:#1b1b1b}
body{margin:0;background:var(--paper) repeat center/512px;font-family:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;color:var(--ink)}
.wrap{max-width:980px;margin:32px auto;padding:0 18px}
h1{margin:0 0 4px;text-align:center;font-weight:900} h2{text-align:center;margin:0 0 22px;font-weight:600;opacity:.9}
label{font-weight:700;display:block;margin-top:14px}
input,select,textarea{width:100%;padding:10px;margin-top:4px;background:rgba(255,255,255,.85);border:1px solid #333;border-radius:8px;font-family:inherit}
small.help{opacity:.8}
.btn{background:#222;color:#fff;border:0;border-radius:8px;padding:10px 16px;font-weight:700;cursor:pointer} .btn:hover{background:#444}
a.back{display:inline-block;background:#222;color:#fff;border-radius:8px;padding:8px 12px;text-decoration:none;font-weight:700}
fieldset{border:1px solid #222;border-radius:10px;padding:14px;margin-top:16px;background:rgba(255,255,255,.55)}
legend{font-weight:800;padding:0 8px}
.media-list{margin-top:10px}.media-item{display:flex;gap:8px;align-items:center;margin-bottom:8px}
.media-item input[type="text"]{flex:1}.media-remove{background:#a00}.media-remove:hover{background:#d00}
.flex{display:flex;gap:10px;align-items:center}
.hidden{display:none}
</style></head><body>
<div class="wrap">
  <a href="/Archives7e/rapports_list.php" class="back">← Retour</a>
  <h1>Nouveau Rapport Journalier</h1><h2>Brouillon</h2>

  <form id="form" method="post" enctype="multipart/form-data" action="/Archives7e/save_rapport.php">
    <input type="hidden" name="type" value="rapport">

    <label>Date RP :</label><input type="text" name="date_rp" placeholder="xx/xx/1944" required>
    <label>Date IRL :</label><input type="text" name="date_irl" placeholder="xx/xx/202x" required>
    <label>Titre :</label><input type="text" name="titre" placeholder="Ex : Patrouille du 14/05 à Dunkerque" required>

    <!-- Auteur -->
    <fieldset>
      <legend>Auteur</legend>
      <div class="flex">
        <select name="auteur_id" id="auteurId">
          <option value="">— Sélectionner un effectif —</option>
          <?php foreach($effectifs as $e): ?>
            <option value="<?= (int)$e['id'] ?>" data-unite="<?= (int)$e['unite_id'] ?>">
              <?= htmlspecialchars($e['prenom'].' '.$e['nom']) ?>
            </option>
          <?php endforeach; ?>
        </select>
        <span>ou</span>
        <input type="text" name="auteur_nom" id="auteurNom" placeholder="Nom Prénom (manuel)">
      </div>
      <small class="help">Si l’auteur n’existe pas encore dans les effectifs, renseigne le nom manuellement.</small>
    </fieldset>

    <!-- Personne renseignée (optionnel sur rapport) -->
    <fieldset>
      <legend>Personne renseignée (facultatif)</legend>
      <div class="flex">
        <select name="personne_renseignee_id" id="persId">
          <option value="">— Sélectionner un effectif —</option>
          <?php foreach($effectifs as $e): ?>
            <option value="<?= (int)$e['id'] ?>" data-unite="<?= (int)$e['unite_id'] ?>">
              <?= htmlspecialchars($e['prenom'].' '.$e['nom']) ?>
            </option>
          <?php endforeach; ?>
        </select>
        <span>ou</span>
        <input type="text" name="personne_renseignee_nom" id="persNom" placeholder="Nom Prénom (manuel)">
      </div>
    </fieldset>

    <!-- Unité & grade -->
    <label>Unité :</label>
    <select name="unite_id" id="uniteSelect" required>
      <option value="">— Sélectionnez une unité —</option>
      <?php foreach($unites as $u): ?>
        <option value="<?= (int)$u['id'] ?>"><?= htmlspecialchars(($u['code']? $u['code'].' ':'').$u['nom']) ?></option>
      <?php endforeach; ?>
    </select>

    <label>Grade :</label>
    <select name="grade_id" id="gradeSelect" disabled required>
      <option value="">— Sélectionnez un grade —</option>
    </select>

    <fieldset>
      <legend>Contexte</legend>
      <textarea name="contexte" rows="3" placeholder="Ex : Construction d’un camp ; attaque d’un avant-poste…"></textarea>
    </fieldset>

    <fieldset>
      <legend>Résumé (chronologique)</legend>
      <small class="help">Seul le champ 1 est obligatoire.</small>
      <textarea name="resume_1" rows="3" placeholder="1" required></textarea>
      <textarea name="resume_2" rows="3" placeholder="2"></textarea>
      <textarea name="resume_3" rows="3" placeholder="3"></textarea>
      <textarea name="resume_4" rows="3" placeholder="4"></textarea>
      <textarea name="resume_5" rows="3" placeholder="5"></textarea>
    </fieldset>

    <fieldset>
      <legend>Médias (photos / vidéos)</legend>
      <small class="help">Jusqu’à 5 fichiers. Ajoute une légende pour chacun.</small>
      <input type="file" id="mediaInput" accept="image/*,video/*" multiple>
      <div id="mediaList" class="media-list"></div>
      <input type="file" id="mediaSubmit" name="medias[]" accept="image/*,video/*" multiple class="hidden">
      <div id="legendContainer"></div>
    </fieldset>

    <fieldset>
      <legend>Bilan</legend>
      <textarea name="bilan" rows="3" placeholder="Ex : Réussite totale de l’opération, peu de pertes"></textarea>
    </fieldset>

    <fieldset>
      <legend>Remarques</legend>
      <textarea name="remarques" rows="3" placeholder="Ajoutez toute information ou recommandation pertinente."></textarea>
    </fieldset>

    <fieldset>
      <legend>Signature</legend>
      <input type="text" name="signature_nom" placeholder="Nom Prénom" required>
      <input type="text" name="signature_grade" placeholder="Grade" required>
      <label>Signature (image .png) :</label>
      <input type="file" name="signature_image" accept="image/png">
    </fieldset>

    <div style="text-align:center;margin-top:20px">
      <button class="btn" type="submit">Générer la mise en page</button>
    </div>
  </form>
</div>

<script>
// Unité -> grades
const uniteSelect=document.getElementById('uniteSelect');
const gradeSelect=document.getElementById('gradeSelect');
uniteSelect.addEventListener('change', ()=>{
  const id=uniteSelect.value;
  gradeSelect.innerHTML='<option>Chargement…</option>'; gradeSelect.disabled=true;
  if(!id){ gradeSelect.innerHTML='<option value="">— Sélectionnez une unité d’abord —</option>'; return; }
  fetch('/Archives7e/includes/get_grades.php?unite_id='+encodeURIComponent(id))
    .then(r=>r.json()).then(rows=>{
      gradeSelect.innerHTML='<option value="">— Sélectionnez un grade —</option>';
      rows.forEach(g=>{
        const o=document.createElement('option');
        o.value=g.id; o.textContent=g.nom_complet; gradeSelect.appendChild(o);
      }); gradeSelect.disabled=false;
    }).catch(()=>{gradeSelect.innerHTML='<option value="">Erreur</option>'});
});

// Médias max 5 avec légendes
const mediaInput=document.getElementById('mediaInput');
const mediaSubmit=document.getElementById('mediaSubmit');
const mediaList=document.getElementById('mediaList');
const legendContainer=document.getElementById('legendContainer');
let mediaFiles=[], mediaLegends=[];
function refreshMediaUI(){
  mediaList.innerHTML=''; legendContainer.innerHTML=''; const dt=new DataTransfer();
  mediaFiles.forEach((f,i)=>{
    const row=document.createElement('div'); row.className='media-item';
    const name=document.createElement('span'); name.textContent=f.name;
    const legend=document.createElement('input'); legend.type='text'; legend.placeholder='Légende'; legend.value=mediaLegends[i]||'';
    legend.oninput=e=>mediaLegends[i]=e.target.value;
    const rm=document.createElement('button'); rm.type='button'; rm.className='btn media-remove'; rm.textContent='✖';
    rm.onclick=()=>{mediaFiles.splice(i,1); mediaLegends.splice(i,1); refreshMediaUI();};
    row.append(name,legend,rm); mediaList.appendChild(row);
    dt.items.add(f);
    const hid=document.createElement('input'); hid.type='hidden'; hid.name='media_legend[]'; hid.value=mediaLegends[i]||''; legendContainer.appendChild(hid);
  });
  mediaSubmit.files=dt.files;
}
mediaInput.onchange=e=>{
  const sel=[...(e.target.files||[])]; if(!sel.length) return;
  sel.forEach(f=>{ if(mediaFiles.length<5){ mediaFiles.push(f); mediaLegends.push(''); }});
  mediaInput.value=''; refreshMediaUI();
};
</script>
</body></html>
