# Vara/Sails Ecosystem Feedback

Building a starter template with sails-rs 1.0.0-beta.2, @gear-js/api 0.44.2, sails-js 0.5.1.
Environment: macOS, Rust stable 1.91, Node.js 18+, edition 2024, resolver 3.

---

## SAILS FRAMEWORK ISSUES (sails-rs, sails-js, IDL tooling)

### S1. `static mut` pattern + edition 2024 = compiler warning
**Repro**: Create a new Sails program with edition 2024, use `static mut STATE: Option<T> = None;` as shown in all examples.
**Result**: Compiler emits `static_mut_refs` lint warning. Requires `#![allow(static_mut_refs)]` in every file.
**Fix**: Either migrate canonical pattern to `RefCell`/`SyncUnsafeCell`, or document the `allow` prominently in Sails docs. This hits every new project.

### S2. `ReflectHash` derive is undiscoverable
**Repro**: Create a new struct for a service return type, derive `Encode, Decode, TypeInfo` as you'd expect. Try to use it in a `#[service]` method.
**Result**: `the trait bound 'MyType: ReflectHash' is not satisfied` with no hint about what ReflectHash is or where to import it.
**Fix**: Better error message from the `#[service]` macro. Something like: "Types used in service interfaces must derive ReflectHash. Add `#[derive(ReflectHash)]` and `#[reflect_hash(crate = sails_rs::sails_reflect_hash)]`."

### S3. Boilerplate on every type: 4 attribute lines per struct
**Repro**: Every type in a service interface needs:
```rust
#[derive(Clone, Debug, Encode, Decode, TypeInfo, ReflectHash)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
#[reflect_hash(crate = sails_rs::sails_reflect_hash)]
```
**Result**: 4 lines of boilerplate per type. Forgetting any one causes a confusing error.
**Fix**: Provide a `#[sails_type]` attribute macro that auto-adds everything. Or re-export crates at the paths derive macros expect (`parity-scale-codec`, `scale-info`).

### S4. WASM entry point pattern is non-obvious
**Repro**: Create a new Sails program. Add `build.rs` with `sails_rs::build_wasm()`. Run `cargo build --release`.
**Result**: `#[panic_handler] function required, but not found`. No hint about what to do.
**Root cause**: The top-level `src/lib.rs` needs `#[cfg(target_arch = "wasm32")] pub use myapp::wasm::*;` to re-export the panic handler and WASM entry points from the `#[program]` macro.
**Fix**: Document this in a "Project Structure" guide. Or have `build_wasm()` detect the missing re-export and print a helpful error.

### S5. IDL generation requires 3 features enabled simultaneously
**Repro**: Add `sails_rs::generate_idl_to_file::<Program>(None, &path)` to build.rs.
**Result**: Function not found. Need `features = ["wasm-builder", "idl-gen", "std"]` in build-deps.
**Fix**: Either make `idl-gen` auto-enable `std`, or document clearly which features to use.

### S6. `generate_idl_to_file` signature changed between docs and reality
**Repro**: Follow the docstring example `sails_rs::generate_idl_to_file::<Program>(&idl_path)`.
**Result**: Missing argument. Actual signature is `(Option<&str>, &Path)` not `(&Path)`.
**Fix**: Update the doc example to match the real signature.

### S7. Delayed message payload encoding is undocumented
**Repro**: Try to send a delayed message from a program to itself that triggers a Sails method.
**Result**: You need to manually encode `["ServiceName".encode(), "MethodName".encode()].concat()`. This wire format is internal to Sails routing but not documented anywhere.
**Fix**: Provide a helper function: `sails_rs::encode_route("Demo", "HandlePing")`. Or document the encoding format.

### S8. @polkadot/util version conflict between @gear-js/api and sails-js
**Repro**: Install `@gear-js/api@0.44.2` and `sails-js@0.5.1` in the same project.
**Result**: npm peer dependency conflict. @gear-js/api wants @polkadot/util 14.x, sails-js wants 13.x.
**Fix**: Align versions between packages, or document the `--legacy-peer-deps` workaround.

---

## VARA-SKILLS ISSUES (skill definitions, agent workflows)

### V1. Skills reference outdated API patterns
**Context**: vara-skills:sails-gtest references `GTestRemoting` which was renamed to `GtestEnv` in beta.2. The `send_recv(program_id)` pattern was replaced by `.await` on Futures and `.query()` for reads.
**Fix**: Update skill definitions to use beta.2 patterns: `GtestEnv`, `Actor<Program, GtestEnv>`, `.await` for commands, `.query()` for queries.

### V2. Skills don't mention ReflectHash
**Context**: vara-skills:sails-rust-implementer doesn't know that all types need `ReflectHash` derive + `#[reflect_hash(crate = ...)]` attribute.
**Fix**: Add ReflectHash to the type template in the skill definition.

### V3. No skill for "common Sails errors → solutions" mapping
**Context**: The most common errors an agent hits are:
- `#[panic_handler] function required` → Add `pub use app::wasm::*`
- `Could not find parity-scale-codec` → Add `#[codec(crate = sails_rs::scale_codec)]`
- `ReflectHash is not satisfied` → Add ReflectHash derive + attribute
- `static_mut_refs` lint → Add `#![allow(static_mut_refs)]`
**Fix**: Add a troubleshooting section to vara-skills or a dedicated error-resolution skill.

### V4. vara-skills:sails-new-app doesn't generate build.rs correctly for beta.2
**Context**: The build.rs pattern changed. Beta.2 needs `features = ["wasm-builder", "idl-gen", "std"]` and the `generate_idl_to_file` has a different signature.
**Fix**: Update the scaffolding template.

### V5. No guidance on sails-js 0.5.1 API for frontend skills
**Context**: vara-skills:sails-frontend likely references older sails-js patterns. The 0.5.1 API uses `SailsIdlParser.new()` + `Sails` constructor, `.services.Demo.queries.GetState().call()` for queries, `.services.Demo.functions.Increment()` for transactions.
**Fix**: Update frontend skill with current sails-js API examples.

---

## WHAT WORKS WELL

### W1. `sails_rs::build_wasm()` is a one-liner
No configuration, no target flags. Just `cargo build --release`. Handles everything internally. This is excellent DX.

### W2. Generated client code is production-quality
`build_client_as_lib` generates complete types, traits, io modules, and events. The generated code is readable and well-structured. No manual wiring needed.

### W3. gtest API is intuitive (once you find the pattern)
`System::new()`, `mint_to()`, `submit_code_file()`, `GtestEnv::new()` — clean and predictable. Auto block execution mode means no manual block management.

### W4. Event system is clean
`#[event]` + `self.emit_event()` is elegant. Generated client includes event types automatically.

### W5. IDL format is human-readable
The generated `.idl` file is clear: services, queries, functions, types, events — all visible in a simple text format that both humans and AI agents can parse.

### W6. Workspace structure (app/client/tests) is a good pattern
Clean separation of concerns. Business logic (app), generated client (client), WASM build (top-level). Dependencies are clear.

### W7. `cargo build` (no --target flag needed)
The wasm-builder handles the wasm32 target internally. Agents don't need to know about cross-compilation.

---

## FRONTEND / JS ECOSYSTEM ISSUES

### F1. @polkadot/util version split across @gear-js/api and sails-js
**Repro**: `npm install @gear-js/api@0.44.2 sails-js@0.5.1` in a fresh project.
**Result**: Peer dependency conflict. `@gear-js/api` depends on `@polkadot/util@^14.0.3`, `sails-js` depends on `@polkadot/util@^13.5.1`. npm refuses to install without `--legacy-peer-deps`.
**Impact**: Every new project hits this on first `npm install`. Agents retry, waste tokens, sometimes add wrong flags.
**Fix**: Align @polkadot/util version between @gear-js/api and sails-js. Or publish a meta-package (`@gear-js/vara-app`) that resolves the conflict.

### F2. @gear-js/api missing `@polkadot/api` as explicit dependency
**Repro**: Install only `@gear-js/api@0.44.2`. Run `vite build`.
**Result**: `Rollup failed to resolve import "@polkadot/api-augment"`. Must also install `@polkadot/api` directly.
**Impact**: Medium. The dependency chain is confusing. Users expect @gear-js/api to bring its own polkadot deps.
**Fix**: Either make @polkadot/api a direct dependency of @gear-js/api (not just peer), or document clearly.

### F3. sails-js-parser loads WASM in the browser, needs polyfill config
**Repro**: Use `SailsIdlParser.new()` in a Vite project. Works in dev mode. Run `vite build`.
**Result**: Production build may fail or silently break because `sails-js-parser` loads a WASM binary internally. Vite's default config doesn't always handle WASM from node_modules correctly.
**Impact**: High. Dev works, prod breaks. The worst kind of bug.
**Fix**: Document the required Vite plugins (`vite-plugin-node-polyfills` is enough for most cases). Or ship sails-js-parser as a pre-compiled JS bundle without WASM.

### F4. sails-js has no TypeScript-safe API surface
**Repro**: Use `sails.services.Demo.queries.GetState().call()` in TypeScript.
**Result**: Everything is `any`. No types for services, methods, query results, or transaction builders. TypeScript provides zero help.
**Impact**: High for AI agents. Without types, agents guess at method names and argument shapes. They can't use IDE completion or type-checking to validate their code.
**Fix**: Generate a TypeScript client from the IDL (like the Rust client). A `sails-js-codegen` that reads the `.idl` file and outputs a typed `.ts` client would be transformative for DX.

### F5. No documented pattern for sails-js transaction lifecycle
**Repro**: Try to show the user "signing... submitted... confirmed..." feedback for a transaction.
**Result**: No documentation on how to observe transaction phases via sails-js. The `tx.signAndSend()` returns a `{ response() }` object, but there's no event emitter or callback for intermediate phases (signature requested, in-block, finalized).
**Fix**: Document the transaction lifecycle. Even a simple example showing how to display loading states would help. Consider adding a callback API: `tx.signAndSend({ onSign, onSubmit, onFinalized })`.

### F6. sails-js event subscription API is undocumented
**Repro**: Try to subscribe to program events via sails-js.
**Result**: No examples or docs for `sails.services.Demo.events`. The API exists in the generated types but usage is unclear. Should you use `sails.services.Demo.events.Incremented.subscribe()`? Or `api.gearEvents.subscribeToGearEvent()` and decode manually?
**Fix**: Document the event subscription pattern with a working example.

### F7. GearApi type doesn't expose `disconnect()` in TypeScript
**Repro**: Import `GearApi` from `@gear-js/api`. Call `api.disconnect()`.
**Result**: TypeScript error: `Property 'disconnect' does not exist on type 'GearApi'`. The method exists at runtime (inherited from @polkadot/api) but the type definition doesn't include it.
**Fix**: Update GearApi type definition to include `disconnect(): Promise<void>`.

---

## DX / DEVELOPER EXPERIENCE ISSUES

### D1. No official "create-vara-app" that works out of the box
**Repro**: Search for a Vara starter template. Find `create-vara-app` in the dapps repo.
**Result**: Uses older sails-rs (pre-beta), different dependency versions, SCSS instead of Tailwind, and doesn't compile without the dapps monorepo context.
**Impact**: Critical. The first 30 minutes of every new Vara project is fighting dependency resolution.
**Fix**: Publish a standalone `create-vara-app` CLI (like `create-react-app` or `create-vite`) that generates a working project with current versions.

### D2. No single-command "new project" flow
**Repro**: Want to start a new Vara dapp from scratch.
**Result**: Must manually create workspace structure, configure 3 Cargo.toml files, write build.rs, set up src/lib.rs with the correct WASM re-export pattern, create client crate with build.rs... 15+ files before you can even compile.
**Impact**: Very high for AI agents. This is where most time is wasted.
**Fix**: `sails-cli new my-app` that generates the full project structure. The sails-cli 0.10.3 exists but doesn't seem to generate the beta.2 patterns.

### D3. No "hello world to deployed" tutorial for current sails version
**Repro**: Search for Sails tutorial.
**Result**: Most results reference pre-1.0 APIs. The official docs at docs.gear.rs are for gstd, not Sails. The Sails repo README has basic examples but not a full walkthrough.
**Fix**: A single page "Build and deploy your first Vara dapp" tutorial with current API versions.

### D4. IDL must be manually copied to frontend
**Repro**: Change a method signature in the Sails program. Rebuild. Run frontend.
**Result**: Frontend still uses the old IDL. Calls fail with cryptic codec errors at runtime. No build-time check.
**Impact**: Medium. The `scripts/build.sh` in this template works around it, but it's a footgun for anyone not using the script.
**Fix**: Either serve IDL from the program on-chain (read from metadata), or provide a build tool that auto-syncs.

### D5. Error messages from Sails macros are often cryptic
**Repro**: Forget `#[export]` on a service method. Or put `#[event]` in the wrong position relative to other derives.
**Result**: Errors like `service attribute requires impl to define at least one public method with #[export] macro` (this one is actually OK) or completely opaque trait bound errors.
**Impact**: Medium. AI agents retry blindly. Humans search GitHub issues.
**Fix**: Invest in proc-macro error quality. The `#[service]` and `#[program]` macros should produce clear, actionable error messages for every common mistake.

---

## FRONTEND DX POSITIVES

### FW1. Vite + vite-plugin-node-polyfills works
Once you install the right packages, the polyfill plugin handles Buffer, crypto, stream, and all other Node.js built-ins that @polkadot/api needs. Dev server starts fast, HMR works.

### FW2. sails-js IDL parsing at runtime is flexible
Loading the IDL as a raw string and parsing it with `SailsIdlParser` is a clean pattern. No code generation step for the frontend. Change the IDL, refresh the page, new methods appear.

### FW3. The custom wallet provider pattern (no @gear-js/react-hooks) is clearer
Using `window.injectedWeb3` directly gives full visibility into wallet detection, connection state, and error handling. No magic. AI agents can read and modify every line.
