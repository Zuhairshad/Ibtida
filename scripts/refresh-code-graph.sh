#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
graphify_bin=${GRAPHIFY_BIN:-graphify}

if ! command -v "$graphify_bin" >/dev/null 2>&1; then
  fallback_bin="$HOME/.local/share/graphify-venv/bin/graphify"
  if [ -x "$fallback_bin" ]; then
    graphify_bin=$fallback_bin
  else
    echo "Graphify is not installed. Install the official graphifyy package first." >&2
    exit 1
  fi
fi

"$graphify_bin" extract "$repo_root" --code-only
exec "$graphify_bin" cluster-only "$repo_root" --no-label
