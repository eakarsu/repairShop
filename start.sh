#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="${RUNTIME_PROJECT_SOURCE:-$SCRIPT_DIR}"
PORT="${PORT:-}"
export PORT
[[ "$PORT" =~ ^[0-9]+$ ]] && (( PORT >= 1024 && PORT <= 65535 )) || { echo "PORT must be an explicitly assigned numeric port" >&2; exit 1; }
if [[ "${NODE_ENV:-production}" != production ]]; then
  export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-${NEXTAUTH_URL:-http://127.0.0.1:$PORT}}"
fi
for name in DATABASE_URL JWT_SECRET NEXT_PUBLIC_APP_URL; do
  [[ -n "${!name:-}" ]] || { echo "Missing required environment variable: $name" >&2; exit 1; }
done
(( ${#JWT_SECRET} >= 32 )) || { echo "JWT_SECRET must be at least 32 characters" >&2; exit 1; }
lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 && { echo "Port $PORT is already in use; refusing to stop an unrelated process" >&2; exit 1; }
[[ -d "$PROJECT_DIR/node_modules" ]] || { echo "Run npm ci first" >&2; exit 1; }
if [[ "${NODE_ENV:-production}" == production ]]; then
  [[ -f "$PROJECT_DIR/.next/BUILD_ID" ]] || { echo "Run npm run build first" >&2; exit 1; }
fi

cleanup() { local status=$?; trap - EXIT INT TERM; [[ -n "${app_pid:-}" ]] && kill "$app_pid" 2>/dev/null || true; wait "${app_pid:-}" 2>/dev/null || true; exit "$status"; }
trap cleanup EXIT INT TERM
if [[ "${NODE_ENV:-production}" == production ]]; then
  (cd "$PROJECT_DIR" && exec node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port "$PORT") & app_pid=$!
else
  (cd "$PROJECT_DIR" && exec node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port "$PORT") & app_pid=$!
fi
for _ in {1..40}; do
  kill -0 "$app_pid" 2>/dev/null || { echo "Application exited before readiness" >&2; wait "$app_pid"; exit 1; }
  curl -fsS "http://127.0.0.1:$PORT/" >/dev/null && break
  sleep 1
done
curl -fsS "http://127.0.0.1:$PORT/" >/dev/null || { echo "Application readiness timed out" >&2; exit 1; }
echo "RepairShop ready at http://127.0.0.1:$PORT"
wait "$app_pid"
