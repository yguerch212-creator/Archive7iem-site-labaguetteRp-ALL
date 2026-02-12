<?php
// includes/db.php
// Connexion à la base MySQL du projet Archives7e

$DB_HOST = 'localhost';       // tu peux tester 127.0.0.1 si ça échoue
$DB_NAME = 'archives7e';
$DB_USER = 'archives_user';
$DB_PASS = 'Admin123';        // ton mot de passe

$dsn = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $options);
} catch (Throwable $e) {
    exit('Erreur de connexion à la base de données : ' . $e->getMessage());
}