#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync, copyFileSync } from "fs";
import { resolve, basename, dirname } from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = resolve(__dirname, "template");

// --- Arg parsing ---

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log(`
  create-vara-app - Bootstrap a typed Vara dApp frontend

  Usage:
    npx create-vara-app <project-name> [--idl <path-to-idl>]

  Options:
    --idl <path>   Path to a Sails IDL file. If omitted, uses a demo IDL.

  Examples:
    npx create-vara-app my-dapp
    npx create-vara-app my-dapp --idl ./my-service.idl
`);
  process.exit(0);
}

const projectName = args[0];
const idlFlagIdx = args.indexOf("--idl");
const idlPath = idlFlagIdx !== -1 ? args[idlFlagIdx + 1] : null;

if (idlPath && !existsSync(idlPath)) {
  console.error(`Error: IDL file not found: ${idlPath}`);
  process.exit(1);
}

const projectDir = resolve(process.cwd(), projectName);

if (existsSync(projectDir)) {
  console.error(`Error: Directory "${projectName}" already exists.`);
  process.exit(1);
}

// --- Copy template ---

console.log(`\n  Creating ${projectName}...\n`);
mkdirSync(projectDir, { recursive: true });
cpSync(TEMPLATE_DIR, projectDir, { recursive: true });

// --- Copy IDL ---

const frontendAssetsDir = resolve(projectDir, "frontend/src/assets");
const idlFilename = idlPath ? basename(idlPath) : "demo.idl";

if (idlPath) {
  mkdirSync(frontendAssetsDir, { recursive: true });
  copyFileSync(resolve(idlPath), resolve(frontendAssetsDir, idlFilename));
  console.log(`  IDL: ${idlFilename} (from ${idlPath})`);
} else {
  console.log(`  IDL: demo.idl (built-in demo contract)`);
}

// --- Extract service name from IDL ---

const idlText = readFileSync(resolve(frontendAssetsDir, idlFilename), "utf-8");
const serviceMatch = idlText.match(/^service\s+(\w+)\s*\{/m);
const serviceName = serviceMatch ? serviceMatch[1] : "Demo";
console.log(`  Service: ${serviceName}`);

// --- Template replacements ---

function replaceInFile(filePath, replacements) {
  if (!existsSync(filePath)) return;
  let content = readFileSync(filePath, "utf-8");
  for (const [search, replace] of replacements) {
    content = content.replaceAll(search, replace);
  }
  writeFileSync(filePath, content);
}

// Update IDL import path if not demo.idl
if (idlFilename !== "demo.idl") {
  replaceInFile(resolve(projectDir, "scripts/scaffold-client.ts"), [
    ["demo.idl", idlFilename],
  ]);
}

// Update NetworkSelector service name probe
replaceInFile(resolve(projectDir, "frontend/src/components/NetworkSelector.tsx"), [
  ["probeSails.services?.Demo", `probeSails.services?.${serviceName}`],
  [`probeSails.services?.demo`, `probeSails.services?.${serviceName.toLowerCase()}`],
  ["this demo program", "this program"],
]);

// Update page title
replaceInFile(resolve(projectDir, "frontend/index.html"), [
  ["Vara Starter", projectName],
]);

// Update localStorage keys to be project-scoped
replaceInFile(resolve(projectDir, "frontend/src/providers/chain-provider.tsx"), [
  ["vara-starter.", `${projectName}.`],
]);

// --- Install dependencies ---

console.log(`\n  Installing dependencies...\n`);
try {
  execSync("npm install --legacy-peer-deps", {
    cwd: resolve(projectDir, "frontend"),
    stdio: "inherit",
  });
} catch {
  console.error("\n  npm install failed. You can retry manually:");
  console.error(`  cd ${projectName}/frontend && npm install --legacy-peer-deps\n`);
}

// --- Run scaffold ---

console.log(`\n  Generating typed client from IDL...\n`);
try {
  execSync(`./node_modules/.bin/tsx ../scripts/scaffold-client.ts ${idlFilename !== "demo.idl" ? `src/assets/${idlFilename}` : ""}`, {
    cwd: resolve(projectDir, "frontend"),
    stdio: "inherit",
  });
} catch {
  console.error("\n  Scaffold failed. You can retry manually:");
  console.error(`  cd ${projectName}/frontend && npx tsx ../scripts/scaffold-client.ts\n`);
}

// --- Done ---

console.log(`
  Done! Your Vara dApp is ready.

  Next steps:
    cd ${projectName}/frontend
    cp .env.example .env
    # Set VITE_PROGRAM_ID to your deployed program address
    npm run dev

  To rebuild after contract changes:
    cd ${projectName}/scripts
    # Copy updated IDL to frontend/src/assets/
    cd ../frontend && npx tsx ../scripts/scaffold-client.ts
`);
