# TODOS

Work remaining to ship vara-ai-starter as a complete, production-quality starter template.

---

## P0 — Ship blockers

(All P0 items resolved.)

---

## P1 — High value, near-term

(All P1 items resolved.)

---

## P2 — Nice to have

### Codegen: generated gtest for new commands

**What:** When scaffold generates frontend components, also generate a basic gtest file (`tests/gtest.rs`) with a test per command.

**Why:** Every new contract needs tests. The pattern is mechanical and the IDL has all the info.

**Effort:** M (CC: ~30min)

---

### Dark/light theme toggle

**What:** Currently hardcoded dark theme (#111113). Add a theme toggle in the header.

**Why:** Some developers prefer light mode. The Tailwind dark: prefix already supports this.

**Effort:** M (CC: ~20min)

---

## Done (this session)

- [x] TypedInput: vec (add/remove list) and enum (dropdown + payload) support
- [x] Responsive polish: mobile-friendly dropdown widths for NetworkSelector + WalletModal
- [x] Codegen snapshot tests: 37 vitest tests for type mapping, icons, helpers
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
