up-build:
	docker compose -f docker-compose.dev.yml build
up-dev:
	docker compose -f docker-compose.dev.yml up -d
down-dev:
	docker compose -f docker-compose.dev.yml down

build:
	sh ./docs/scripts/build_all_in_one.sh