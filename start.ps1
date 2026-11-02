# Script PowerShell de gestion de l'application Suivi de Flux
param (
    [string]$Action = "dev"
)

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Suivi de Flux & Fiches Cartes - Gestionnaire" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Node.js est installé
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "[ERREUR] Node.js n'est pas détecté dans votre environnement." -ForegroundColor Red
    Write-Host "Téléchargez et installez Node.js : https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

switch ($Action.ToLower()) {
    "dev" {
        if (-not (Test-Path "node_modules")) {
            Write-Host "Installation des dépendances..." -ForegroundColor Yellow
            npm install
        }
        Write-Host "Lancement de l'application en mode développement..." -ForegroundColor Green
        Write-Host "👉 Application accessible sur : http://localhost:3000" -ForegroundColor Green
        npm run dev
    }
    "build" {
        Write-Host "Compilation de l'application..." -ForegroundColor Yellow
        npm run build
        Write-Host "Compilation terminée avec succès !" -ForegroundColor Green
    }
    "start" {
        Write-Host "Lancement de la version compilée (production)..." -ForegroundColor Green
        npm run start
    }
    "backup" {
        if (-not (Test-Path "backups")) { New-Item -ItemType Directory -Path "backups" | Out-Null }
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupFile = "backups\backup_$timestamp.db"
        Write-Host "Sauvegarde de la base SQLite dans $backupFile..." -ForegroundColor Cyan
        if (Test-Path "dev.db") {
            Copy-Item -Path "dev.db" -Destination $backupFile
            Write-Host "Sauvegarde terminée !" -ForegroundColor Green
        } else {
            Write-Host "Fichier dev.db introuvable à la racine." -ForegroundColor Yellow
        }
    }
    Default {
        Write-Host "Usage: .\start.ps1 [dev | build | start | backup]" -ForegroundColor Yellow
    }
}
