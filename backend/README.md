# Leaderboard Backend

Minimal username-based leaderboard API for Zevia 2048.

## Run locally

```bash
cd backend
npm install
npm run start
```

Server starts at `http://localhost:8787` by default.

## Environment variables

- `PORT` (default: `8787`)
- `ALLOWED_ORIGIN` (default: `*`)

Example:

```bash
PORT=8787 ALLOWED_ORIGIN=https://isaiah-dietrich.github.io npm run start
```

## API

### `GET /health`

Returns:

```json
{ "ok": true }
```

### `GET /api/leaderboard?limit=20`

Returns top scores sorted by:
1. `score` descending
2. `moves` ascending
3. `createdAt` ascending

Response:

```json
{
  "entries": [
    {
      "rank": 1,
      "username": "Isaiah",
      "score": 4096,
      "moves": 232,
      "maxTile": 11,
      "createdAt": 1739480000000
    }
  ]
}
```

### `POST /api/leaderboard`

Request body:

```json
{
  "username": "Isaiah",
  "score": 4096,
  "moves": 232,
  "maxTile": 11
}
```

Validation:
- `username`: 3-16 chars, letters/numbers/space/`_`/`.`/`-`
- `score`: integer `0..10000000`
- `moves`: integer `0..100000`
- `maxTile`: optional integer `0..20`

Response:

```json
{ "ok": true }
```

## Storage

Data is stored in `backend/data/leaderboard.json`.

Notes:
- File is written atomically (`.tmp` + rename).
- Simple in-memory rate limit: 15 writes/minute per IP.
