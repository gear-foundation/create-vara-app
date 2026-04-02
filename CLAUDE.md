# Vara AI Starter Template

## Repository Structure

```
vara-ai-starter/
├── programs/demo/          # Sails program (Rust)
│   ├── app/src/lib.rs      # Business logic: state, service, events, delayed msgs
│   ├── build.rs            # WASM + IDL generation
│   ├── src/lib.rs           # WASM binary re-export
│   ├── client/             # Auto-generated Rust client + build script
│   ├── tests/gtest.rs      # Integration tests
│   └── demo.idl            # Generated IDL (after build)
├── scripts/
│   ├── build.sh            # Build program + sync IDL + scaffold + run tests
│   └── scaffold-client.ts  # IDL-driven codegen: generates sails-client, ActionsPanel, StatePanel
├── frontend/               # Vite + React + TypeScript + Tailwind
│   ├── src/
│   │   ├── lib/wallet.ts           # Wallet detection via window.injectedWeb3
│   │   ├── lib/sails-client.ts     # GENERATED: typed query/tx wrappers
│   │   ├── lib/idl-introspect.ts   # Runtime IDL metadata for DebugPanel
│   │   ├── providers/chain-provider.tsx  # API + wallet context
│   │   ├── components/ActionsPanel.tsx   # GENERATED: command UI
│   │   ├── components/StatePanel.tsx     # GENERATED: query UI
│   │   ├── components/             # Shared UI components
│   │   └── assets/demo.idl         # Bundled IDL for frontend
│   └── .env.example
├── CLAUDE.md               # This file
└── README.md
```

## Quick Start

### Build the Sails program
```bash
cd programs/demo
cargo build --release
```
This generates:
- WASM binary: `target/wasm32-gear/release/demo.opt.wasm`
- IDL file: `demo.idl`

### Run tests
```bash
cd programs/demo
cargo test --release
```

### Run the frontend
```bash
cd frontend
cp .env.example .env
# Edit .env to set VITE_PROGRAM_ID after deploying
npm install --legacy-peer-deps
npm run dev
```

### Regenerate frontend from IDL
```bash
cd frontend
./node_modules/.bin/tsx ../scripts/scaffold-client.ts
```
Reads `src/assets/demo.idl` and regenerates:
- `src/lib/sails-client.ts` (typed query/tx wrappers)
- `src/components/ActionsPanel.tsx` (command UI)
- `src/components/StatePanel.tsx` (query UI)

### Full build pipeline
```bash
./scripts/build.sh
```
Builds program, syncs IDL to frontend, runs scaffold, runs tests.

## Sails Program Architecture

The demo program (`programs/demo/app/src/lib.rs`) demonstrates:

- **Static mut state pattern** with `#![allow(static_mut_refs)]`
- **Commands** (mutating): `increment()`, `send_message()`, `schedule_ping()`, `handle_ping()`, `set_greeting()`
- **Queries** (read-only): `get_state()`, `get_counter()`, `get_messages()`, `get_greeting()`
- **Events**: `Incremented`, `MessageSent`, `PingScheduled`, `PingReceived`, `GreetingSet`
- **Delayed messages**: `schedule_ping()` sends a delayed self-message
- **Input validation**: message length cap, delay minimum
- **Ring buffer**: messages capped at 100, oldest evicted

## How to Add a New Command

1. Add the method to `DemoService` in `app/src/lib.rs`:
```rust
#[export]
pub fn my_command(&mut self, arg: String) -> String {
    let s = state_mut();
    // ... your logic ...
    self.emit_event(DemoEvents::MyEvent { ... }).expect("emit");
    "result".to_string()
}
```

2. Add the event variant to `DemoEvents` enum (if needed).

3. Add a test in `tests/gtest.rs`.

4. Rebuild and regenerate:
```bash
cd programs/demo && cargo build --release && cargo test --release
cp demo.idl ../../frontend/src/assets/demo.idl
cd ../../frontend && ./node_modules/.bin/tsx ../scripts/scaffold-client.ts
```
Or run `./scripts/build.sh` for the full pipeline.

The scaffold auto-generates typed wrappers in `sails-client.ts`, a button in `ActionsPanel.tsx`, and any new query display in `StatePanel.tsx`. Custom code should go in separate files (generated files are overwritten on re-scaffold).

## How to Add a New Query

1. Add to `DemoService`:
```rust
#[export]
pub fn my_query(&self) -> MyReturnType {
    state().my_field.clone()
}
```

2. Rebuild and run scaffold (same as above). The query will appear in `StatePanel.tsx` automatically.

## How to Add State Fields

1. Add field to `DemoState`:
```rust
pub my_field: MyType,
```

2. Update `StateView` if it should be returned by `get_state()`.

3. All types used in service interfaces need these derives:
```rust
#[derive(Clone, Debug, Encode, Decode, TypeInfo, ReflectHash)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
#[reflect_hash(crate = sails_rs::sails_reflect_hash)]
pub struct MyType { ... }
```

## Key Sails Patterns

### Type derives (required for all service-visible types)
```rust
#[derive(Clone, Debug, Encode, Decode, TypeInfo, ReflectHash)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
#[reflect_hash(crate = sails_rs::sails_reflect_hash)]
```

### Event definition
```rust
#[event]
#[derive(Encode, Decode, TypeInfo, ReflectHash)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
#[reflect_hash(crate = sails_rs::sails_reflect_hash)]
pub enum MyEvents { ... }
```

### Delayed self-messaging
```rust
let payload = ["ServiceName".encode(), "MethodName".encode()].concat();
msg::send_bytes_with_gas_delayed(exec::program_id(), payload, gas, 0, delay_blocks);
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_NODE_ENDPOINT` | Vara RPC endpoint (default: `wss://testnet.vara.network`) |
| `VITE_PROGRAM_ID` | Deployed program ID (hex, e.g., `0x...`) |

## Deployment

Use `vara-skills:vara-wallet` to deploy:
1. Build the program: `cargo build --release`
2. The WASM file is at `programs/demo/target/wasm32-gear/release/demo.opt.wasm`
3. Deploy using vara-wallet skill with the WASM file
4. Copy the program ID to `frontend/.env` as `VITE_PROGRAM_ID`

## Dependencies

### Rust (programs/demo)
- `sails-rs` 1.0.0-beta.2 (Sails framework)
- Rust stable toolchain with `wasm32-unknown-unknown` target

### Frontend
- `@gear-js/api` 0.44.2 (Vara API)
- `sails-js` 0.5.1 + `sails-js-parser` 0.5.1 (Sails client)
- React 18, Vite 6, Tailwind 3
- Node.js 18+

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
