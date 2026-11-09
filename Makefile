up-build:
	docker compose -f docker-compose.dev.yml build
up-dev:
	docker compose -f docker-compose.dev.yml up -d
down-dev:
	docker compose -f docker-compose.dev.yml down
desktop-dev:
	sh ./docs/scripts/desktop_dev.sh
desktop-build:
	sh ./docs/scripts/desktop_build.sh
seed-dev:
	cd backend && go run . seed-dev
# The installed desktop app keeps its own database and key (macOS path); quit the app first.
DESKTOP_DATA ?= $(HOME)/Library/Application Support/dbo/storage
seed-dev-desktop:
	cd backend && APP_DATABASE_PATH="$(DESKTOP_DATA)/dbo.db" APP_SECRET_KEY_PATH="$(DESKTOP_DATA)/app_secret.key" go run . seed-dev
