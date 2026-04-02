# create-vara-app

Bootstrap a typed Vara Network dApp frontend from any Sails IDL.

## Usage

```bash
npm exec --yes -- create-vara-app my-dapp
npm exec --yes -- create-vara-app my-dapp --idl path/to/service.idl
```

Without `--idl`, creates a project with a demo contract (counter, messages, ping, greeting).

With `--idl`, generates typed React components from your contract's IDL file.

## What you get

- Typed query/transaction wrappers generated from IDL
- React UI with wallet connection, state display, and transaction signing
- Live event subscriptions
- Debug panel with runtime IDL explorer
- Client-side input validation
- Dark theme with Framer Motion animations

## After creation

```bash
cd my-dapp/frontend
cp .env.example .env
# Set VITE_PROGRAM_ID to your deployed program address
npm run dev
```

## Rebuilding after contract changes

```bash
# Copy new IDL to frontend/src/assets/
cd frontend && npx tsx ../scripts/scaffold-client.ts
```

The scaffold regenerates `sails-client.ts`, `ActionsPanel.tsx`, and `StatePanel.tsx`. Custom code should go in separate files.

## License

MIT
