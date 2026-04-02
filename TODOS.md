# TODOS

Work remaining to ship vara-ai-starter as a complete, production-quality starter template.

---

## P0 — Ship blockers

(All P0 items resolved.)

---

## P1 — High value, near-term

---

### Codegen: snapshot tests

**What:** The scaffold script has no automated tests. Changes to type mapping or icon heuristics are verified manually.

**Why:** Regressions in the codegen are caught late (at build time or visually). Fixture IDLs with expected output would catch them immediately.

**Fix:** Add a test file with 2-3 fixture IDLs (primitive-heavy, struct-heavy, enum with payloads) and snapshot the generated output.

**Effort:** M (CC: ~30min)

---

## P2 — Nice to have

### Codegen: generated gtest for new commands

**What:** When scaffold generates frontend components, also generate a basic gtest file (`tests/gtest.rs`) with a test per command.

**Why:** Every new contract needs tests. The pattern is mechanical and the IDL has all the info.

**Effort:** M (CC: ~30min)

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

- [x] create-vara-app CLI: npx create-vara-app my-dapp --idl service.idl
- [x] Client-side input validation: empty-string and min-1 checks in codegen
- [x] ManualCallTab: resolve UserDefined types via sails.getTypeByName
- [x] Rename DemoEvent to ContractEvent for generic reuse
- [x] Event subscriptions: wired EventsProvider + EventLog using sails-js 0.5.1 subscribe API
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
