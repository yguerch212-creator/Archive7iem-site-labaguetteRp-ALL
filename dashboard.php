<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/db.php';
session_start();

if (!isset($_SESSION['user'])) {
    header('Location: /Archives7e/index.php');
    exit;
}

$user = $_SESSION['user'];

// ✅ Nouvelle détection admin cohérente avec le login
$isAdmin = false;

// 1. Si le rôle est stocké directement
if (isset($_SESSION['role']) && $_SESSION['role'] === 'admin') {
    $isAdmin = true;
}
// 2. Sinon on fait une vérif SQL (sécurité + compat compatibilité)
else {
    $check = $pdo->prepare("
        SELECT COUNT(*) 
        FROM user_groups ug
        JOIN `groups` g ON g.id = ug.group_id
        WHERE ug.user_id = ? AND g.name = 'Administration'
    ");
    $check->execute([$user['id']]);
    $isAdmin = $check->fetchColumn() > 0;
}
?>
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Archives7e — Tableau de bord</title>
<style>
body {
  background: url('assets/img/paper.jpg') repeat center center fixed;
  background-size: cover;
  font-family: 'Segoe UI', sans-serif;
  margin: 0;
  padding: 0;
  color: #1b1b1b;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.header {
  margin-top: 30px;
  text-align: center;
  background: rgba(255,255,255,0.9);
  padding: 20px 40px;
  border-radius: 12px;
  box-shadow: 0 3px 10px rgba(0,0,0,0.25);
  width: fit-content;
}
.header h1 {
  margin: 0;
  font-size: 26px;
  font-weight: bold;
}
.header p {
  margin: 5px 0 0;
  font-size: 15px;
  color: #333;
}
.search-bar {
  margin-top: 40px;
  background: rgba(255,255,255,0.95);
  padding: 15px 25px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  gap: 10px;
  width: 60%;
  max-width: 700px;
}
.search-bar input {
  flex: 1;
  padding: 10px;
  border: 1px solid #aaa;
  border-radius: 6px;
  font-size: 15px;
}
.search-bar select {
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #aaa;
}
.search-bar button {
  background-color: #3c3b37;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
}
.search-bar button:hover {
  background-color: #5a5853;
}
.grid {
  margin-top: 60px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 25px;
  width: 80%;
  max-width: 1000px;
}
.card {
  background: rgba(255,255,255,0.92);
  border-radius: 12px;
  padding: 35px 20px;
  text-align: center;
  box-shadow: 0 3px 12px rgba(0,0,0,0.3);
  text-decoration: none;
  color: #222;
  font-weight: bold;
  font-size: 18px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 18px rgba(0,0,0,0.4);
  background: rgba(245, 240, 230, 0.95);
}
.logout {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #3c3b37;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}
.logout:hover { background: #5a5853; }
.footer {
  margin-top: auto;
  margin-bottom: 20px;
  font-size: 12px;
  color: #555;
  text-align: center;
}
</style>
</head>
<body>

<button class="logout" onclick="window.location='logout.php'">Déconnexion</button>

<div class="header">
  <h1>Archives 7e Armeekorps</h1>
  <p><?= htmlspecialchars(($user['grade_nom'] ?? '') . ' ' . ($user['prenom'] ?? '') . ' ' . ($user['nom'] ?? '')) ?> — <?= htmlspecialchars($user['unite_nom'] ?? '') ?></p>
</div>

<div class="search-bar">
  <form action="search.php" method="get" style="display:flex; width:100%; gap:10px;">
    <input type="text" name="q" placeholder="Rechercher un nom, rapport, dossier, ou casier..." required>
    <select name="filter">
      <option value="all">Tous</option>
      <option value="personne">Personne</option>
      <option value="rapport">Rapport</option>
      <option value="dossier">Dossier</option>
      <option value="casier">Casier</option>
    </select>
    <button type="submit">🔍</button>
  </form>
</div>

<div class="grid">
  <a href="effectifs.php" class="card">📋 Effectifs</a>
  <a href="rapports_list.php" class="card">📝 Rapports</a>
  <a href="dossiers.php" class="card">📁 Dossiers</a>
  <a href="casiers.php" class="card">⚖️ Casiers judiciaires</a>
  <a href="search.php" class="card">🔎 Recherches</a>

  <?php if ($isAdmin): ?>
  <a href="admin/users.php" class="card" style="background:rgba(255,240,200,0.92);border:1px solid #c7a86b;">
    ⚙️ Administration
  </a>
  <?php endif; ?>
</div>

<div class="footer">
  Archives du 7e Armeekorps — Commandement de la 916. Grenadier-Regiment<br>
  Accès réservé aux personnels autorisés
</div>

</body>
</html>
