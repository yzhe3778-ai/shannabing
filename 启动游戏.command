#!/bin/bash
set -u

cd "$(dirname "$0")"

PORT="${PORT:-8081}"
HOST="${HOST:-127.0.0.1}"
URL="http://${HOST}:${PORT}/"

echo "山那边 · 九学期"
echo "工作目录: $(pwd)"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "未检测到 Node.js。"
  echo "请先安装 Node.js 18 或更高版本: https://nodejs.org/"
  echo
  read -r -p "按回车关闭..."
  exit 1
fi

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "当前 Node.js 版本过低: $(node -v)"
  echo "请安装 Node.js 18 或更高版本。"
  echo
  read -r -p "按回车关闭..."
  exit 1
fi

if [ ! -f ".env.local" ]; then
  echo "未找到 .env.local。"
  echo "游戏仍可启动；AI 私聊/家访会降级为本地模板。"
  echo "如需启用 AI，请复制 .env.example 为 .env.local，并填入云雾 Key。"
  echo
fi

echo "启动本地服务: ${URL}"
echo "关闭这个终端窗口即可停止服务。"
echo

( sleep 1; open "${URL}" >/dev/null 2>&1 || true ) &
HOST="${HOST}" PORT="${PORT}" node dev-server.js "${PORT}"

echo
read -r -p "服务已停止，按回车关闭..."
