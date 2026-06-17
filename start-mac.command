#!/bin/bash
set -u

cd "$(dirname "$0")"

PORT="${PORT:-8081}"
HOST="${HOST:-127.0.0.1}"
URL="http://${HOST}:${PORT}/"

echo "Shan Na Bian - local launcher"
echo "Working directory: $(pwd)"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found."
  echo "Please install Node.js 18 or later: https://nodejs.org/"
  echo
  read -r -p "Press Enter to close..."
  exit 1
fi

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Current Node.js version is too old: $(node -v)"
  echo "Please install Node.js 18 or later."
  echo
  read -r -p "Press Enter to close..."
  exit 1
fi

if [ ! -f ".env.local" ]; then
  echo ".env.local was not found."
  echo "The game can still start, but AI chat will use local fallback templates."
  echo "To enable AI, copy .env.example to .env.local and fill in the API key."
  echo
fi

echo "Starting local server: ${URL}"
echo "Close this terminal window to stop the server."
echo

( sleep 1; open "${URL}" >/dev/null 2>&1 || true ) &
HOST="${HOST}" PORT="${PORT}" node dev-server.js "${PORT}"

echo
read -r -p "Server stopped. Press Enter to close..."
