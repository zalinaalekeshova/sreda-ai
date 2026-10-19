#!/bin/zsh
cd -- "${0:A:h}"
if command -v node >/dev/null 2>&1; then
  sreda_node="$(command -v node)"
elif [[ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]]; then
  sreda_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
else
  print 'Для запуска установите Node.js 20 или новее: https://nodejs.org'
  read '?Нажмите Enter, чтобы закрыть окно.'
  exit 1
fi
if /usr/bin/curl -fsS http://127.0.0.1:4173/ 2>/dev/null | /usr/bin/grep -q 'sreda.ai'; then
  /usr/bin/open http://localhost:4173
  exit 0
fi
"$sreda_node" server.mjs &
sreda_pid=$!
trap 'kill "$sreda_pid" 2>/dev/null' EXIT INT TERM
for attempt in {1..20}; do
  if /usr/bin/curl -fsS http://127.0.0.1:4173/ >/dev/null 2>&1; then
    /usr/bin/open http://localhost:4173
    break
  fi
  sleep .2
done
print 'Сайт работает. Оставьте это окно открытым. Для остановки нажмите Ctrl+C.'
wait "$sreda_pid"
