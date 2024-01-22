build:
	cd ./server && go build .

up-server:
	make build &&  cd ./server && ./dbo

up-front:
	next dev