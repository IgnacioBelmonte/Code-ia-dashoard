#!/usr/bin/env bash
set -euo pipefail

TAG="${1:-}"
if [[ -z "$TAG" ]]; then
  echo "Usage: $0 <image-tag>" >&2
  echo "Example: $0 dev-<sha>" >&2
  exit 1
fi

REPO_DIR="/home/nacho/.openclaw/workspace/code-ia-dashboard"
COMPOSE_FILE="$REPO_DIR/docker-compose.dev.yml"
PROJECT_NAME="codeiadash"

IMAGE="ghcr.io/ignaciobelmonte/code-ia-dashboard:${TAG}"

cd "$REPO_DIR"

export CODE_IA_IMAGE="$IMAGE"
export APP_IMAGE_TAG="$TAG"

# Ensure registry exists on the Pi (mounted by compose)
if [[ ! -f "/home/nacho/.openclaw/state/projects.registry.json" ]]; then
  echo "Registry not found at /home/nacho/.openclaw/state/projects.registry.json" >&2
  exit 1
fi

sudo -E docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" pull app
sudo -E docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d --force-recreate app

url="http://127.0.0.1:4000/"
max_attempts=30
for attempt in $(seq 1 "$max_attempts"); do
  if curl -fsS --max-time 3 "$url" >/dev/null; then
    echo "[deploy] OK ($IMAGE)"
    exit 0
  fi
  echo "[deploy] Waiting... ($attempt/$max_attempts)"
  sleep 2
done

echo "[deploy] ERROR: app did not become ready" >&2
exit 1
