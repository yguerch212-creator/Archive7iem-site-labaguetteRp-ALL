<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/db.php';
session_start();

// Vérification de session
if (!isset($_SESSION['user'])) {
    header('Location: /index.php');
    exit;
}

$user = $_SESSION['user'];
$error = null;
$success = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $old_pass = $_POST['old_pass'] ?? '';
    $new_pass = $_POST['new_pass'] ?? '';
    $confirm_pass = $_POST['confirm_pass'] ?? '';

    if (!$old_pass || !$new_pass || !$confirm_pass) {
        $error = "Tous les champs sont obligatoires.";
    } elseif ($new_pass !== $confirm_pass) {
        $error = "Les nouveaux mots de passe ne correspondent pas.";
    } elseif (strlen($new_pass) < 6) {
        $error = "Le mot de passe doit contenir au moins 6 caractères.";
    } else {
        $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = ?");
        $stmt->execute([$user['id']]);
        $dbUser = $stmt->fetch();

        if (!$dbUser || !password_verify($old_pass, $dbUser['password_hash'])) {
            $error = "Ancien mot de passe incorrect.";
        } else {
            $hash = password_hash($new_pass, PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("UPDATE users SET password_hash=?, must_change_password=0 WHERE id=?");
            $stmt->execute([$hash, $user['id']]);
            $_SESSION['user']['must_change'] = 0;
            $success = "Mot de passe mis à jour avec succès.";
        }
    }
}
?>
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Changement du mot de passe — Archives7e</title>
<style>
body {
  background: url('assets/img/paper.jpg') repeat center center fixed;
  background-size: cover;
  font-family: 'Segoe UI', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  margin: 0;
}
.form-box {
  background: rgba(255,255,255,0.92);
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.3);
  width: 400px;
}
h1 {
  text-align: center;
  margin-bottom: 25px;
  font-size: 24px;
  font-weight: bold;
  color: #222;
}
input {
  width: 100%;
  padding: 10px;
  margin: 8px 0;
  border-radius: 6px;
  border: 1px solid #aaa;
  background-color: #faf8f2;
}
button {
  width: 100%;
  background-color: #3c3b37;
  color: white;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
}
button:hover {
  background-color: #5a5853;
}
.error { color: red; text-align: center; margin-bottom: 10px; }
.success { color: green; text-align: center; margin-bottom: 10px; }
.user-info {
  text-align: center;
  font-size: 14px;
  margin-bottom: 10px;
  color: #333;
}
</style>
</head>
<body>
<div class="form-box">
  <h1>Changement du mot de passe</h1>
  <div class="user-info">
    <?= htmlspecialchars($user['prenom'].' '.$user['nom']) ?> — <?= htmlspecialchars($user['unite_nom'] ?? 'Unité inconnue') ?>
  </div>
  <?php if ($error): ?><div class="error"><?= htmlspecialchars($error) ?></div><?php endif; ?>
  <?php if ($success): ?><div class="success"><?= htmlspecialchars($success) ?></div><?php endif; ?>

  <form method="post">
    <label>Ancien mot de passe :</label>
    <input type="password" name="old_pass" required>

    <label>Nouveau mot de passe :</label>
    <input type="password" name="new_pass" required>

    <label>Confirmer le nouveau mot de passe :</label>
    <input type="password" name="confirm_pass" required>

    <button type="submit">Mettre à jour</button>
  </form>

  <?php if ($success): ?>
    <div style="text-align:center; margin-top:15px;">
      <a href="dashboard.php" style="text-decoration:none; color:#333; font-weight:bold;">→ Accéder au tableau de bord</a>
    </div>
  <?php endif; ?>
</div>
</body>
</html>
