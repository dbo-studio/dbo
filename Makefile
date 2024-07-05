up-build:
	docker compose -f docker-compose.dev.yml build
up-dev:
	docker compose -f docker-compose.dev.yml up -d
down-dev:
	docker compose -f docker-compose.dev.yml down
build:
	sh ./docs/scripts/build_all_in_one.sh
desktop-dev:
	sh ./docs/scripts/desktop_dev.sh
desktop-build:
	sh ./docs/scripts/desktop_build.sh