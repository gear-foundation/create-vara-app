# TODOS

Work remaining to ship vara-ai-starter as a complete, production-quality starter template.

---

## P0 — Ship blockers

### Sync IDL pipeline with new sails-rs output

**What:** `cargo build --release` now generates v2 IDL format (`demo.idl`) but also a stable v1 format (`demo.stable.idl` in target/). The scaffold script and sails-js-parser 0.5.1 only parse v1. Currently requires manual copy from `target/wasm32-gear/release/demo.idl` to `frontend/src/assets/demo.idl`. `build.sh` copies the wrong file.

**Why:** Broken build pipeline. `./scripts/build.sh` fails at the scaffold step because it syncs the v2 IDL which the parser can't read.

**Fix:** Update `build.sh` to copy the stable v1 IDL from the correct target path, or upgrade sails-js-parser when v2 support lands.

**Effort:** S (CC: ~10min)

---

### Update CLAUDE.md and README with new architecture

**What:** CLAUDE.md still documents the old hand-wired pattern ("How to Add a New Command" section with manual ActionsPanel/StatePanel edits). README doesn't mention the scaffold script. Both need to reflect the new workflow: change contract -> rebuild -> run scaffold -> done.

**Why:** A new developer cloning this repo will follow outdated instructions.

**Fix:** Rewrite the "How to Add" sections to reference `scaffold-client.ts`. Add scaffold step to Quick Start.

**Effort:** S (CC: ~15min)

---

## P1 — High value, near-term

### Event subscriptions when sails-js supports v1 IDL events

**What:** The v1 stable IDL now includes an `events {}` block. sails-js 0.5.1 may already support event subscriptions via `sails.services.Demo.events`. The EventsProvider is a placeholder (`status: "idle"`), and EventLog is a compact banner.

**Why:** Events are the #1 missing feature. Users send transactions but never see confirmation events. The event log is permanently empty.

**Fix:** Test if `sails.services.Demo.events` works with current deps. If yes, wire up EventsProvider to subscribe and EventLog to display. If not, wait for sails-js update.

**Depends on:** Testing sails-js 0.5.1 event subscription API.

**Effort:** M (CC: ~30min)

---

### Codegen: emit proper TypeScript types instead of `unknown`

**What:** Generated `sails-client.ts` types all params as `unknown`. `txSendMessage(api, account, text: unknown, signer)` should be `text: string`. `txSchedulePing(api, account, delay: number, signer)`.

**Why:** TypeScript provides zero help. Agents and developers pass wrong types silently.

**Fix:** Map IDL types to TS types in the codegen: str->string, u32->number, u64->bigint|string, bool->boolean, actor_id->string, etc.

**Effort:** S (CC: ~15min)

---

### Codegen: smarter ActionsPanel icons

**What:** All command buttons use the same `ArrowUp` icon. The beta hand-written version used `ChatText` for SendMessage, `Clock` for SchedulePing. The codegen could infer icons from method names or parameter types.

**Why:** Visual polish. All buttons looking identical is confusing.

**Fix:** Simple heuristic in codegen: methods with `str` param get ChatText icon, methods with `delay`/`time` param get Clock icon, methods with no params get ArrowUp. Fallback: generic icon.

**Effort:** S (CC: ~10min)

---

### Custom program ID persistence across page reloads

**What:** When a user enters a custom program ID via NetworkSelector, it's saved to localStorage but `initSails()` always reads `VITE_PROGRAM_ID` from env on first load. The custom ID is only applied after the probe flow.

**Why:** User refreshes the page and is back on the env program, not their custom one.

**Fix:** On app init, check localStorage for custom programId before falling back to env var. Apply it to the Sails instance after init.

**Effort:** S (CC: ~10min)

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
