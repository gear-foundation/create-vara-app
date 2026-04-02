# TODOS

Work remaining to ship vara-ai-starter as a complete, production-quality starter template.

---

## P0 — Ship blockers

(All P0 items resolved.)

---

## P1 — High value, near-term

### Event subscriptions when sails-js supports v1 IDL events

**What:** The v1 stable IDL now includes an `events {}` block. sails-js 0.5.1 may already support event subscriptions via `sails.services.Demo.events`. The EventsProvider is a placeholder (`status: "idle"`), and EventLog is a compact banner.

**Why:** Events are the #1 missing feature. Users send transactions but never see confirmation events. The event log is permanently empty.

**Fix:** Test if `sails.services.Demo.events` works with current deps. If yes, wire up EventsProvider to subscribe and EventLog to display. If not, wait for sails-js update.

**Depends on:** Testing sails-js 0.5.1 event subscription API.

**Effort:** M (CC: ~30min)

---

### Codegen: snapshot tests

**What:** The scaffold script has no automated tests. Changes to type mapping or icon heuristics are verified manually.

**Why:** Regressions in the codegen are caught late (at build time or visually). Fixture IDLs with expected output would catch them immediately.

**Fix:** Add a test file with 2-3 fixture IDLs (primitive-heavy, struct-heavy, enum with payloads) and snapshot the generated output.

**Effort:** M (CC: ~30min)

---

### Client-side input validation

**What:** The Rust contract rejects empty messages, overlong messages (>256 chars), zero delay, and empty greetings. The generated UI lets users submit these, resulting in on-chain errors with cryptic messages.

**Why:** Deterministic failures are a first-class path in the starter. Bad UX for new developers testing the template.

**Fix:** Generate validation rules from IDL metadata or hardcode basic checks (non-empty required fields, min/max for numeric fields, BigInt format validation for u64+).

**Effort:** M (CC: ~30min)

---

## P2 — Nice to have

### `create-vara-app` CLI

**What:** A standalone CLI that scaffolds a complete Vara dApp from any IDL file.

```bash
npx create-vara-app my-dapp --idl path/to/service.idl
```

**Why:** The scaffold-client.ts + shared components already make this possible. The CLI just packages the template files + scaffold step into a single command.

**What it does:**
1. Copy template files (package.json, vite.config, tailwind, tsconfig)
2. Copy shared components (Header, NetworkSelector, WalletModal, CopyAddress, DebugPanel, ManualCallTab, TypedInput, EventLog)
3. Copy providers (chain-provider, events-provider)
4. Copy lib (idl-introspect, wallet)
5. Copy IDL to assets
6. Run scaffold-client.ts -> generates sails-client.ts + ActionsPanel + StatePanel
7. `npm install && npm run dev`

**Effort:** L (CC: ~1hr)

---

### Codegen: generated gtest for new commands

**What:** When scaffold generates frontend components, also generate a basic gtest file (`tests/gtest.rs`) with a test per command.

**Why:** Every new contract needs tests. The pattern is mechanical and the IDL has all the info.

**Effort:** M (CC: ~30min)

---

### ManualCallTab: resolve UserDefined types

**What:** TypedInput falls back to JSON textarea for UserDefined types because it doesn't have access to the Sails type registry. Pass `sails.getTypeDef(name)` as the resolver.

**Why:** Struct arguments (like sending a full `StoredMessage`) require raw JSON input instead of getting nice field-by-field inputs.

**Fix:** Thread `sails.getTypeDef` through as the `resolveType` prop in TypedInput.

**Effort:** S (CC: ~10min)

---

### TypedInput: vec, enum, map support

**What:** TypedInput MVP only handles primitives + struct + optional. Add vec (add/remove list), enum (dropdown + payload), map (key-value pairs).

**Why:** More complex contracts use these types. Currently they fall back to JSON textarea.

**Effort:** M (CC: ~30min)

---

### Dark/light theme toggle

**What:** Currently hardcoded dark theme (#111113). Add a theme toggle in the header.

**Why:** Some developers prefer light mode. The Tailwind dark: prefix already supports this.

**Effort:** M (CC: ~20min)

---

### Responsive polish

**What:** Mobile layout stacks columns but NetworkSelector dropdown and WalletModal need mobile-specific sizing (full-width on small screens).

**Why:** The app technically works on mobile but feels cramped.

**Effort:** S (CC: ~15min)

---

## Done (this session)

- [x] Codegen: typed return values (Promise<string>, Promise<null>, etc. for queries and txs)
- [x] Fix signing state: split calculateGas/signAndSend so users see signing -> submitted -> confirmed
- [x] Codegen: proper TypeScript types for params (str->string, u32->number, u64->string, etc.)
- [x] Codegen: smarter ActionsPanel icons (ChatText, Clock, PencilSimple, PlusCircle by method name)
- [x] CLAUDE.md + README updated to reflect scaffold workflow
- [x] Sync IDL pipeline: verified working (demo.idl and frontend copy are identical)
- [x] Custom program ID persistence: already implemented in chain-provider.tsx
- [x] IDL-to-frontend codegen: scaffold-client.ts generates sails-client.ts + ActionsPanel.tsx + StatePanel.tsx
- [x] ManualCallTab runtime IDL explorer in DebugPanel
- [x] TypedInput recursive form renderer (primitives + struct + optional)
- [x] idl-introspect.ts utilities (extractMethods, getTypeLabel, coerceValue, defaultValue)
- [x] useSails hook with stale cache fix
- [x] Port beta UX: NetworkSelector, WalletModal, CopyAddress, redesigned panels
- [x] Framer Motion animations, Geist Mono + Inter fonts, zinc palette
- [x] EventLog compact banner (placeholder for v2 events)
- [x] EventsProvider placeholder
- [x] SetGreeting command + GetGreeting query added to contract
- [x] StatePanel deduplication (skip scalar queries covered by struct queries)
- [x] CopyAddress for actor_id fields in generated StatePanel
- [x] NetworkSelector probe uses separate Sails instance (no race condition)
- [x] Deploy updated program to testnet
