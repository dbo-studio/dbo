FROM node:20.12.2 as frontend

ARG RELEASE="release"

WORKDIR /frontend

COPY ./frontend .

RUN npm i -g typescript
RUN npm i --force
RUN npm run build

FROM golang:1.22-alpine as backend

ENV APP_PORT=${APP_PORT}
ENV APP_ENV=docker

WORKDIR /backend
COPY ./backend .

ENV CGO_ENABLED=1
RUN apk add --no-cache gcc musl-dev
RUN go mod download

RUN go build -p=8 --tags "release" -ldflags "-w" -o "build/dbo" *.go
COPY --from=frontend /frontend/dist ./out

EXPOSE $APP_PORT

ENTRYPOINT ["build/dbo"]