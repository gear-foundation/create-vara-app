#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP_DIR="$(mktemp -d /tmp/create-vara-app-smoke.XXXXXX)"

echo "Smoke workspace: $TMP_DIR"
cp "$REPO_ROOT/frontend/src/assets/demo.idl" "$TMP_DIR/custom-demo.idl"

cd "$REPO_ROOT/create-vara-app"
npm pack --pack-destination "$TMP_DIR"

cd "$TMP_DIR"
npm exec --yes --package "$TMP_DIR/create-vara-app-0.1.0.tgz" -- \
  create-vara-app smoke-app --idl "$TMP_DIR/custom-demo.idl"

cd "$TMP_DIR/smoke-app/frontend"
npm test
npm run build
