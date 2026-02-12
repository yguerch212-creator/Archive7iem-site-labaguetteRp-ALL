<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/db.php';
session_start();

/* --- Vérifie si l'utilisateur est déjà connecté --- */
if (isset($_SESSION['user'])) {
    header('Location: /Archives7e/dashboard.php');
    exit;
}

$error = null;

/* --- Gestion du cookie "Se souvenir de moi" --- */
if (!isset($_SESSION['user']) && isset($_COOKIE['remember_user'])) {
    $token = $_COOKIE['remember_user'];
    $stmt = $pdo->prepare("SELECT * FROM users WHERE remember_token = ?");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($user) {
        $_SESSION['user'] = [
            'id' => (int)$user['id'],
            'nom' => $user['nom'],
            'prenom' => $user['prenom'],
            'role_level' => (int)$user['role_level'],
            'must_change' => (int)$user['must_change_password']
        ];
        $_SESSION['role'] = 'user';
        header('Location: /Archives7e/dashboard.php');
        exit;
    }
}

/* --- Traitement du formulaire --- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nom = trim($_POST['nom'] ?? '');
    $password = $_POST['password'] ?? '';
    $remember = isset($_POST['remember']);

    if (!$nom || !$password) {
        $error = "Veuillez saisir votre nom et votre mot de passe.";
    } else {
        $stmt = $pdo->prepare("
            SELECT u.*, g.nom_complet AS grade_nom, un.nom AS unite_nom
            FROM users u
            LEFT JOIN grades g ON g.id = u.grade_id
            LEFT JOIN unites un ON un.id = u.unite_id
            WHERE u.nom = ?
        ");
        $stmt->execute([$nom]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || !password_verify($password, $user['password_hash'])) {
            $error = "Nom ou mot de passe incorrect.";
        } else {
            // Vérifie s'il appartient au groupe Administration
            $checkGroup = $pdo->prepare("
    SELECT COUNT(*) 
    FROM user_groups ug
    JOIN `groups` gp ON gp.id = ug.group_id
    WHERE ug.user_id = ? AND gp.name = 'Administration'
");

            $checkGroup->execute([$user['id']]);
            $isAdmin = $checkGroup->fetchColumn() > 0;

            // Stockage session
            $_SESSION['user'] = [
                'id' => (int)$user['id'],
                'nom' => $user['nom'],
                'prenom' => $user['prenom'],
                'grade_nom' => $user['grade_nom'],
                'unite_nom' => $user['unite_nom'],
                'must_change' => (int)$user['must_change_password']
            ];
            $_SESSION['role'] = $isAdmin ? 'admin' : 'user';

            // Gérer le cookie "se souvenir de moi"
            if ($remember) {
                $token = bin2hex(random_bytes(32));
                setcookie('remember_user', $token, time() + (86400 * 30), "/"); // 30 jours
                $pdo->prepare("UPDATE users SET remember_token = ? WHERE id = ?")->execute([$token, $user['id']]);
            }

            // Redirection selon l’état
            if ((int)$user['must_change_password'] === 1) {
                header('Location: /Archives7e/change_password.php');
            } else {
                header('Location: /Archives7e/dashboard.php');
            }
            exit;
        }
    }
}
?>

<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Connexion — Archives7e</title>
<style>
body {
  background: url('assets/img/paper.jpg') repeat center center fixed;
  background-size: cover;
  font-family: 'IBM Plex Mono', monospace;
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
  box-shadow: 0 5px 20px rgba(0,0,0,0.25);
  width: 380px;
}
h1 {
  text-align: center;
  margin-bottom: 25px;
  font-size: 24px;
  font-weight: bold;
  color: #222;
}
input[type=text], input[type=password] {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border-radius: 6px;
  border: 1px solid #aaa;
  background-color: #faf8f2;
  font-family: inherit;
}
label.remember {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  margin: 10px 0;
}
button {
  width: 100%;
  background-color: #2b2b2b;
  color: white;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
}
button:hover { background-color: #444; }
.error { color: red; text-align: center; margin-bottom: 10px; }
</style>
</head>
<body>
<div class="form-box">
  <h1>Connexion</h1>

  <?php if ($error): ?><div class="error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

  <form method="post">
    <label>Nom de famille :</label>
    <input type="text" name="nom" required placeholder="Ex : Zussman">

    <label>Mot de passe :</label>
    <input type="password" name="password" required placeholder="********">

    <label class="remember">
      <input type="checkbox" name="remember"> Se souvenir de moi
    </label>

    <button type="submit">Se connecter</button>
  </form>
</div>
</body>
</html>
