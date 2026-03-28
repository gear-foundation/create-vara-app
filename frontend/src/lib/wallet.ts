const APP_NAME = "Vara Starter";
const POLL_INTERVAL_MS = 200;
const POLL_MAX_ATTEMPTS = 15; // 3 seconds total

type InjectedAccount = {
  address: string;
  genesisHash?: string | null;
  name?: string;
  type?: string;
};

type Injected = {
  accounts: { get: (anyType?: boolean) => Promise<InjectedAccount[]> };
  signer?: unknown;
};

type InjectedWindowProvider = {
  connect?: (origin: string) => Promise<Injected>;
  enable?: (origin: string) => Promise<Injected>;
  version?: string;
};

declare global {
  interface Window {
    injectedWeb3?: Record<string, InjectedWindowProvider>;
  }
}

export type WalletAccount = {
  address: string;
  meta: { genesisHash?: string | null; name?: string; source: string };
  type?: string;
};

export type EnabledWallet = {
  accounts: WalletAccount[];
  signer: unknown | null;
  source: string;
};

function injectedRegistry(): Record<string, InjectedWindowProvider> {
  if (typeof window === "undefined") return {};
  return window.injectedWeb3 ?? {};
}

function normalizeAccount(
  source: string,
  account: InjectedAccount
): WalletAccount {
  return {
    address: account.address,
    meta: {
      genesisHash: account.genesisHash ?? null,
      name: account.name,
      source,
    },
    type: account.type,
  };
}

/** List all available wallet extensions. Polls for async injection. */
export async function listWallets(): Promise<string[]> {
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    const sources = Object.entries(injectedRegistry())
      .filter(([, p]) => Boolean(p.enable || p.connect))
      .map(([source]) => source);
    if (sources.length > 0) return sources;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return Object.entries(injectedRegistry())
    .filter(([, p]) => Boolean(p.enable || p.connect))
    .map(([source]) => source);
}

/** Enable a specific wallet and get its accounts. */
export async function enableWallet(source: string): Promise<EnabledWallet> {
  const provider = injectedRegistry()[source];
  if (!provider) throw new Error(`Wallet "${source}" is not available.`);

  const injected = provider.enable
    ? await provider.enable(APP_NAME)
    : provider.connect
      ? await provider.connect(APP_NAME)
      : (() => {
          throw new Error(`Wallet "${source}" has no enable/connect method.`);
        })();

  const accounts = (await injected.accounts.get()).map((a) =>
    normalizeAccount(source, a)
  );

  return { accounts, signer: injected.signer ?? null, source };
}
