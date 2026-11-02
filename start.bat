@echo off
chcp 65001 > nul
echo ===================================================
echo   Démarrage de Suivi de Flux & Fiches Cartes
echo ===================================================
echo.

echo [1/3] Vérification de Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas détecté sur votre système.
    echo Veuillez installer Node.js (version 20 ou supérieure) : https://nodejs.org/
    pause
    exit /b 1
)

if not exist node_modules (
    echo [2/3] Installation des dépendances...
    call npm install
) else (
    echo [2/3] Dépendances déjà installées.
)

echo.
echo [3/3] Lancement de l'application...
echo 👉 Application accessible sur : http://localhost:3000
echo.
npm run dev
