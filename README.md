# leuchten-status-server

Pingt regelmäßig einen Host (z.B. ein WLED-Gerät) und stellt den Status als JSON bereit.

## Konfiguration

`.env.example` nach `.env` kopieren und anpassen:

| Variable                 | Standard    | Beschreibung                                  |
| ------------------------ | ----------- | --------------------------------------------- |
| `PING_TARGET`            | `localhost` | Host/IP, der angepingt wird                   |
| `PORT`                   | `3000`      | HTTP-Port                                     |
| `CHECK_INTERVAL_SECONDS` | `60`        | Abstand zwischen zwei Pings                   |
| `RETRY_COUNT`            | `3`         | Wiederholungen, bevor ein Ausfall zählt       |
| `RETRY_DELAY_SECONDS`    | `10`        | Abstand zwischen den Wiederholungen           |
| `SIMULATE_ONLINE`        | –           | `true` meldet immer `on` (zum lokalen Testen) |

## Starten

```sh
npm install
npm run dev   # mit nodemon
npm start
```

## Docker

```sh
docker run -p 3000:3000 -e PING_TARGET=192.168.1.50 ghcr.io/cmgoersch/leuchten-status-server
```

## API

`GET /api/wled-status`

```json
{ "state": "on", "uptimeSeconds": 1234 }
```

`state` ist `on`, `off` oder `unreachable`; `uptimeSeconds` ist `null`, solange der Host nicht `on` ist.
