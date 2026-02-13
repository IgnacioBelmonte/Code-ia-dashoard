# Code IA Dashboard

Simple LAN dashboard (Next.js + Tailwind) to visualize:
- The local AI board state from: `/home/nacho/.openclaw/state/spotify-insights-board.json`
- Basic OpenClaw status via `openclaw status`

## Run locally

```bash
npm install
npm run dev -- --hostname 0.0.0.0 --port 4000
```

## Configuration

- Set `BOARD_PATH` to point to the board JSON path (default is already the OpenClaw board path).

