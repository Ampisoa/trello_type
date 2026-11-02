# ==============================================================================
# Makefile - Automatisation & Gestion de l'application (Node.js + SQLite)
# ==============================================================================

.PHONY: help install dev build start backup restore clean lint

# Couleur pour l'affichage
GREEN  := \033[0;32m
YELLOW := \033[0;33m
BLUE   := \033[0;34m
RESET  := \033[0m

## Afficher l'aide des commandes
help:
	@echo ""
	@echo "${BLUE}Suivi de Flux & Fiches Cartes - Commandes disponibles :${RESET}"
	@echo ""
	@echo "  ${GREEN}make dev${RESET}       - Lancer l'application en mode développement (http://localhost:3000)"
	@echo "  ${GREEN}make install${RESET}   - Installer les dépendances du projet (npm install)"
	@echo "  ${YELLOW}make build${RESET}     - Compiler le frontend React et le backend Node.js"
	@echo "  ${YELLOW}make start${RESET}     - Lancer le serveur de production compilé"
	@echo "  ${YELLOW}make lint${RESET}      - Vérifier le code TypeScript (tsc --noEmit)"
	@echo ""
	@echo "  ${BLUE}make backup${RESET}    - Sauvegarder la base de données SQLite (dev.db) dans backups/"
	@echo "  ${BLUE}make restore${RESET}   - Restaurer la dernière sauvegarde SQLite depuis backups/"
	@echo "  ${BLUE}make clean${RESET}     - Nettoyer les fichiers de build (dist)"
	@echo ""

## Installer les dépendances
install:
	@npm install

## Lancer le serveur de développement
dev:
	@npm run dev

## Compiler pour la production
build:
	@npm run build

## Lancer le serveur de production
start:
	@npm run start

## Vérifier le typage TypeScript
lint:
	@npm run lint

## Sauvegarder la base de données SQLite
backup:
	@mkdir -p backups
	@echo "${BLUE}Création d'un backup de la base de données SQLite...${RESET}"
	@cp dev.db backups/backup_$$(date +%Y%m%d_%H%M%S).db 2>/dev/null || echo "dev.db introuvable pour copie"
	@echo "${GREEN}Sauvegarde enregistrée avec succès dans le dossier backups/ !${RESET}"

## Restaurer la dernière sauvegarde
restore:
	@LATEST_BACKUP=$$(ls -t backups/backup_*.db 2>/dev/null | head -n 1); \
	if [ -z "$$LATEST_BACKUP" ]; then \
		echo "${YELLOW}Aucun fichier de sauvegarde trouvé dans backups/${RESET}"; \
	else \
		echo "${BLUE}Restauration de $$LATEST_BACKUP vers dev.db...${RESET}"; \
		cp "$$LATEST_BACKUP" dev.db; \
		echo "${GREEN}Restauration terminée avec succès !${RESET}"; \
	fi

## Nettoyer les fichiers de build
clean:
	@npm run clean
	@echo "${GREEN}Nettoyage terminé.${RESET}"
