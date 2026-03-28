#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROGRAM_DIR="$REPO_ROOT/programs/demo"
FRONTEND_DIR="$REPO_ROOT/frontend"

echo "=== Building Sails program ==="
cd "$PROGRAM_DIR"
cargo build --release

echo ""
echo "=== Syncing IDL to frontend ==="
IDL_SRC="$PROGRAM_DIR/demo.idl"
IDL_DST="$FRONTEND_DIR/src/assets/demo.idl"

if [ ! -f "$IDL_SRC" ]; then
    echo "ERROR: IDL not found at $IDL_SRC"
    echo "Make sure cargo build --release completed successfully."
    exit 1
fi

if [ -f "$IDL_DST" ]; then
    if diff -q "$IDL_SRC" "$IDL_DST" > /dev/null 2>&1; then
        echo "IDL is up to date."
    else
        echo "IDL changed. Updating frontend copy..."
        cp "$IDL_SRC" "$IDL_DST"
    fi
else
    echo "Copying IDL to frontend..."
    cp "$IDL_SRC" "$IDL_DST"
fi

echo ""
echo "=== Running tests ==="
cd "$PROGRAM_DIR"
cargo test --release

echo ""
echo "=== Done ==="
echo "Program WASM: $PROGRAM_DIR/target/wasm32-gear/release/demo.opt.wasm"
echo "IDL: $IDL_DST"
