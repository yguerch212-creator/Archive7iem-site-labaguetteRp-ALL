<?php
declare(strict_types=1);
require_once __DIR__ . '/../includes/db.php';
session_start();

/* =========================
   VÉRIFICATION D’ACCÈS ADMIN
   ========================= */
if (!isset($_SESSION['user'])) {
    header('Location: /Archives7e/index.php');
    exit;
}

$user = $_SESSION['user'];
$isAdmin = false;

// 1️⃣ Vérifie si déjà admin dans la session
if (isset($_SESSION['role']) && $_SESSION['role'] === 'admin') {
    $isAdmin = true;
} else {
    // 2️⃣ Vérifie dans la base (sécurité complémentaire)
    $check = $pdo->prepare("
        SELECT COUNT(*) 
        FROM user_groups ug
        JOIN `groups` g ON g.id = ug.group_id
        WHERE ug.user_id = ? AND g.name = 'Administration'
    ");
    $check->execute([$user['id']]);
    $isAdmin = $check->fetchColumn() > 0;
}

// Si non admin → redirection
if (!$isAdmin) {
    header('Location: /Archives7e/dashboard.php');
    exit;
}

/* =========================
   INITIALISATIONS
   ========================= */
$message = null;
$error = null;

/* =========================
   FONCTIONS UTILITAIRES
   ========================= */
function getAdminGroupId(PDO $pdo): ?int {
    $stmt = $pdo->query("SELECT id FROM `groups` WHERE name = 'Administration' LIMIT 1");
    $gid = $stmt->fetchColumn();
    return $gid ? (int)$gid : null;
}
function isUserInAdmin(PDO $pdo, int $uid, int $gid): bool {
    $q = $pdo->prepare("SELECT 1 FROM user_groups WHERE user_id = ? AND group_id = ? LIMIT 1");
    $q->execute([$uid, $gid]);
    return (bool)$q->fetchColumn();
}

/* =========================
   ACTIONS ADMIN
   ========================= */

// 1️⃣ Création d’un compte utilisateur depuis un effectif
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['create_from_effectif'])) {
    $effectif_id = (int)($_POST['effectif_id'] ?? 0);
    $password = trim($_POST['password'] ?? 'Wehrmacht123');

    if ($effectif_id <= 0) {
        $error = "Aucun effectif sélectionné.";
    } else {
        $stmt = $pdo->prepare("
            SELECT e.id, e.nom, e.prenom, e.unite_id, e.grade_id,
                   u.nom AS unite_nom, g.nom_complet AS grade_nom
            FROM effectifs e
            LEFT JOIN unites u ON e.unite_id = u.id
            LEFT JOIN grades g ON e.grade_id = g.id
            WHERE e.id = ?
        ");
        $stmt->execute([$effectif_id]);
        $eff = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$eff) {
            $error = "Effectif introuvable.";
        } else {
            $check = $pdo->prepare("SELECT id FROM users WHERE nom=? AND prenom=? AND unite_id=? LIMIT 1");
            $check->execute([$eff['nom'], $eff['prenom'], $eff['unite_id']]);
            if ($check->fetch()) {
                $error = "Cet effectif possède déjà un compte.";
            } else {
                $hash = password_hash($password, PASSWORD_BCRYPT);
                $insert = $pdo->prepare("
                    INSERT INTO users (unite_id, nom, prenom, grade_id, password_hash, must_change_password, role_level, created_by)
                    VALUES (?, ?, ?, ?, ?, 1, 1, ?)
                ");
                $insert->execute([
                    $eff['unite_id'], $eff['nom'], $eff['prenom'], $eff['grade_id'],
                    $hash, $user['id']
                ]);
                $message = "Compte créé pour {$eff['prenom']} {$eff['nom']} — mot de passe par défaut : {$password}";
            }
        }
    }
}

// 2️⃣ Mise à jour du rôle (1–5)
if (isset($_POST['update_role'])) {
    $uid = (int)$_POST['uid'];
    $role = max(1, min(5, (int)$_POST['role_level']));
    $stmt = $pdo->prepare("UPDATE users SET role_level = ? WHERE id = ?");
    $stmt->execute([$role, $uid]);
    $message = "Rôle utilisateur mis à jour.";
}

// 3️⃣ Ajout au groupe Administration
if (isset($_POST['add_admin'])) {
    $uid = (int)$_POST['uid'];
    $gid = getAdminGroupId($pdo);
    if ($gid === null) {
        $error = "Le groupe Administration n'existe pas.";
    } else {
        if (isUserInAdmin($pdo, $uid, $gid)) {
            $error = "Cet utilisateur est déjà dans le groupe Administration.";
        } else {
            $ins = $pdo->prepare("INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)");
            $ins->execute([$uid, $gid]);
            $message = "Utilisateur ajouté au groupe Administration.";
        }
    }
}

// 4️⃣ Retrait du groupe Administration
if (isset($_POST['remove_admin'])) {
    $uid = (int)$_POST['uid'];
    $gid = getAdminGroupId($pdo);
    if ($gid === null) {
        $error = "Le groupe Administration n'existe pas.";
    } else {
        $del = $pdo->prepare("DELETE FROM user_groups WHERE user_id = ? AND group_id = ?");
        $del->execute([$uid, $gid]);
        $message = "Utilisateur retiré du groupe Administration.";
    }
}

/* =========================
   CHARGEMENT DES DONNÉES
   ========================= */
$effectifs_sans_compte = $pdo->query("
    SELECT e.id, e.nom, e.prenom, g.nom_complet AS grade_nom, u.nom AS unite_nom
    FROM effectifs e
    LEFT JOIN grades g ON e.grade_id = g.id
    LEFT JOIN unites u ON e.unite_id = u.id
    WHERE NOT EXISTS (
        SELECT 1 FROM users us
        WHERE us.nom = e.nom AND us.prenom = e.prenom AND us.unite_id = e.unite_id
    )
    ORDER BY e.nom ASC, e.prenom ASC
")->fetchAll(PDO::FETCH_ASSOC);

$users = $pdo->query("
    SELECT us.id, us.nom, us.prenom, us.role_level, us.must_change_password,
           g.nom_complet AS grade_nom, u.nom AS unite_nom
    FROM users us
    LEFT JOIN grades g ON us.grade_id = g.id
    LEFT JOIN unites u ON us.unite_id = u.id
    ORDER BY us.role_level DESC, us.nom ASC, us.prenom ASC
")->fetchAll(PDO::FETCH_ASSOC);

$ADMIN_GID = getAdminGroupId($pdo);
?>
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Administration — Gestion des utilisateurs</title>
<style>
body {
  background: url('../assets/img/paper.jpg') repeat center center fixed;
  background-size: cover;
  font-family: 'Segoe UI', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px;
  margin: 0;
}
h1 {
  text-align: center;
  margin-bottom: 20px;
  font-size: 26px;
}
.form-box, .list-box {
  background: rgba(255,255,255,0.92);
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 3px 15px rgba(0,0,0,0.3);
  width: 900px;
  margin-bottom: 25px;
}
label { display:block; margin-top:8px; }
select, input[type="text"] {
  width: 100%;
  padding: 10px;
  margin: 6px 0 12px 0;
  border: 1px solid #aaa;
  border-radius: 6px;
  background-color: #faf8f2;
}
button {
  background-color: #3c3b37;
  color: white;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
button:hover { background-color: #5a5853; }
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  padding: 10px;
  border-bottom: 1px solid #ccc;
  text-align: left;
  vertical-align: middle;
}
tr:hover { background-color: #f8f5ef; }
.message { color: green; text-align:center; margin-bottom:10px; }
.error { color: red; text-align:center; margin-bottom:10px; }
.back { text-decoration:none; color:#333; font-weight:bold; }
.inline { display:inline-block; margin-right:8px; }
.badge { padding:2px 8px; border-radius:999px; font-size:12px; }
.badge-ok { background:#d9f7d9; border:1px solid #8bc48b; }
.badge-no { background:#ffe0e0; border:1px solid #e29a9a; }
.role-select { width: 80px; }
</style>
</head>
<body>

<h1>Administration — Création & Gestion des utilisateurs</h1>

<div class="form-box">
  <?php if ($message): ?><div class="message"><?= htmlspecialchars($message) ?></div><?php endif; ?>
  <?php if ($error): ?><div class="error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

  <form method="post">
    <input type="hidden" name="create_from_effectif" value="1">
    <label>Sélectionner un effectif :</label>
    <select name="effectif_id" required>
      <option value="">— Choisir un effectif —</option>
      <?php foreach ($effectifs_sans_compte as $r): ?>
        <option value="<?= (int)$r['id'] ?>">
          <?= htmlspecialchars($r['grade_nom'].' '.$r['prenom'].' '.$r['nom'].' — '.$r['unite_nom']) ?>
        </option>
      <?php endforeach; ?>
    </select>

    <label>Mot de passe par défaut :</label>
    <input type="text" name="password" value="Wehrmacht123">

    <button type="submit">Créer le compte</button>
  </form>
</div>

<div class="list-box">
  <h2>Utilisateurs existants</h2>
  <table>
    <tr>
      <th>Nom</th>
      <th>Grade</th>
      <th>Unité</th>
      <th>Niveau (1–5)</th>
      <th>Mot de passe changé</th>
      <th>Groupe Admin</th>
      <th>Actions</th>
    </tr>
    <?php foreach ($users as $u): ?>
      <?php
        $in_admin = ($ADMIN_GID !== null) ? isUserInAdmin($pdo, (int)$u['id'], $ADMIN_GID) : false;
      ?>
      <tr>
        <td><?= htmlspecialchars($u['prenom'].' '.$u['nom']) ?></td>
        <td><?= htmlspecialchars($u['grade_nom'] ?? '') ?></td>
        <td><?= htmlspecialchars($u['unite_nom'] ?? '') ?></td>
        <td>
          <form method="post" class="inline">
            <input type="hidden" name="uid" value="<?= (int)$u['id'] ?>">
            <select name="role_level" class="role-select">
              <?php for ($i=1; $i<=5; $i++): ?>
                <option value="<?= $i ?>" <?= ($u['role_level']==$i?'selected':'') ?>><?= $i ?></option>
              <?php endfor; ?>
            </select>
            <button type="submit" name="update_role">Enregistrer</button>
          </form>
        </td>
        <td>
          <?php if ((int)$u['must_change_password'] === 0): ?>
            <span class="badge badge-ok">✔️ Oui</span>
          <?php else: ?>
            <span class="badge badge-no">❌ Non</span>
          <?php endif; ?>
        </td>
        <td>
          <?php if ($in_admin): ?>
            <span class="badge badge-ok">✅ Admin</span>
          <?php else: ?>
            <span class="badge badge-no">—</span>
          <?php endif; ?>
        </td>
        <td>
          <?php if ($in_admin): ?>
            <form method="post" class="inline">
              <input type="hidden" name="uid" value="<?= (int)$u['id'] ?>">
              <button type="submit" name="remove_admin">Retirer du groupe Admin</button>
            </form>
          <?php else: ?>
            <form method="post" class="inline">
              <input type="hidden" name="uid" value="<?= (int)$u['id'] ?>">
              <button type="submit" name="add_admin">Ajouter au groupe Admin</button>
            </form>
          <?php endif; ?>
        </td>
      </tr>
    <?php endforeach; ?>
  </table>
</div>

<a href="../dashboard.php" class="back">← Retour au tableau de bord</a>

</body>
</html>
