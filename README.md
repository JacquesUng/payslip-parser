<h1 align="center">Local Payslip Parser</h1>

# Introduction
This local Payslip Parser allows you to better understand the content of your whole payslip history.
It only connects to local models so your payslips do not get exposed on the Internet.
You can query the model to understand
- What each line on a document means
- Your career history

# System architecture

# Running the system
All commands below are run from `payslip-parser-infra/`.

## Development mode
```
docker compose up
```
This builds both services from their `development` target and bind-mounts
the source directories, so `payslip-api` (port 3000) and
`payslip-parser-ui` (port 4200) hot-reload as you edit code.

## Production mode
```
docker compose -f docker-compose.prod.yml up -d
```
This builds both services from their `production` target. The UI is served
by nginx on port 80 and proxies `/payslip-api/` to the API; both containers
restart automatically unless stopped.

# Stopping the system

## Normal stop
```
docker compose down
```
Add `-f docker-compose.prod.yml` when stopping the production stack. This
keeps the `payslip-data` volume and, in development mode, the cached
`node_modules` volumes intact.

## After changing dependencies (development mode)
`docker-compose.yml` protects each service's `node_modules` from the host
bind mount with an anonymous volume. Docker Compose reuses that volume
across `up` runs instead of refreshing it from a rebuilt image, so after
adding or updating a dependency in `payslip-api` or `payslip-parser-ui`,
the running container can keep stale `node_modules` and fail at startup
with an error like `Cannot find module '...'`, even though the image itself
built successfully. Fix it without losing stored data by forcing the
anonymous volumes to be recreated:
```
docker compose up --build -V
```

## Full clean slate
```
docker compose down -v
```
This also removes the `payslip-data` volume, permanently deleting all
stored payslips. Use it only when you want to reset everything.

## Backing up stored payslips
```
docker run --rm -v payslip-parser_payslip-data:/data -v "$PWD":/backup alpine tar czf /backup/payslip-data-backup.tar.gz -C /data .
```

## Wiping only stored payslips
To reset the stored data without also clearing the development
`node_modules` cache, stop the stack first, then remove just that volume:
```
docker compose down
docker volume rm payslip-parser_payslip-data
```