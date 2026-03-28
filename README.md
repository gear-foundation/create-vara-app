# Vara AI Starter

A full-stack Vara Network dapp starter template designed for AI agents.

Includes a Sails program (Rust) demonstrating state management, events, delayed messages, and input validation, plus a React frontend with wallet connection, state reading, and transaction signing.

## Prerequisites

- Rust stable (1.91+) with `wasm32-unknown-unknown` target
- Node.js 18+
- A Vara-compatible wallet extension (SubWallet, Polkadot.js)

```bash
rustup target add wasm32-unknown-unknown
```

## Quick Start

### 1. Build the program

```bash
cd programs/demo
cargo build --release
cargo test --release
```

### 2. Run the frontend

```bash
cd frontend
cp .env.example .env
npm install --legacy-peer-deps
npm run dev
```

Open http://localhost:5173

### 3. Deploy and connect

Deploy the WASM file (`programs/demo/target/wasm32-gear/release/demo.opt.wasm`) to Vara testnet, then set `VITE_PROGRAM_ID` in `frontend/.env`.

## What's Included

### Sails Program
- Counter with increment
- Message board (capped at 100, ring buffer)
- Delayed self-messaging (schedule_ping / handle_ping)
- Event emission for all state changes
- Input validation and error handling
- Full gtest suite (10 tests)

### React Frontend
- Wallet detection and connection
- Program state reading with auto-refresh
- Transaction signing with lifecycle feedback
- Event log display
- Debug panel with IDL viewer

## For AI Agents

See `CLAUDE.md` for detailed instructions on how to extend this template: adding commands, queries, events, state fields, and frontend components.

## License

MIT
