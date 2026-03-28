import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { GearApi } from "@gear-js/api";
import {
  listWallets,
  enableWallet,
  type WalletAccount,
} from "@/lib/wallet";

const STORAGE_SOURCE = "vara-starter.wallet.source";
const STORAGE_ADDR = "vara-starter.wallet.address";

type ApiStatus = "connecting" | "ready" | "error";
type WalletStatus =
  | "loading"
  | "unavailable"
  | "disconnected"
  | "connecting"
  | "connected";

type ChainContextValue = {
  api: GearApi | null;
  apiStatus: ApiStatus;
  apiError: string | null;
  walletStatus: WalletStatus;
  walletError: string | null;
  wallets: string[];
  account: WalletAccount | null;
  accounts: WalletAccount[];
  signer: unknown | null;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const ChainContext = createContext<ChainContextValue | null>(null);

export function ChainProvider({
  endpoint,
  children,
}: {
  endpoint: string;
  children: React.ReactNode;
}) {
  const [api, setApi] = useState<GearApi | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("connecting");
  const [apiError, setApiError] = useState<string | null>(null);
  const [walletStatus, setWalletStatus] =
    useState<WalletStatus>("loading");
  const [walletError, setWalletError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<string[]>([]);
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [signer, setSigner] = useState<unknown | null>(null);

  // Connect to Vara node
  useEffect(() => {
    let cancelled = false;
    setApiStatus("connecting");
    setApiError(null);

    import("@gear-js/api")
      .then(({ GearApi }) => GearApi.create({ providerAddress: endpoint }))
      .then((nextApi) => {
        if (cancelled) {
          (nextApi as unknown as { disconnect: () => Promise<void> }).disconnect().catch(() => undefined);
          return;
        }
        setApi(nextApi);
        setApiStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        setApi(null);
        setApiStatus("error");
        setApiError(
          error instanceof Error ? error.message : "Failed to connect to Vara."
        );
      });

    return () => {
      cancelled = true;
      setApi((prev) => {
        if (prev) (prev as unknown as { disconnect: () => Promise<void> }).disconnect().catch(() => undefined);
        return null;
      });
    };
  }, [endpoint]);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_SOURCE);
    localStorage.removeItem(STORAGE_ADDR);
    setAccount(null);
    setAccounts([]);
    setSigner(null);
    setWalletError(null);
    setWalletStatus(wallets.length === 0 ? "unavailable" : "disconnected");
  }, [wallets.length]);

  const connect = useCallback(async () => {
    const available = await listWallets();
    setWallets(available);

    if (available.length === 0) {
      setWalletStatus("unavailable");
      return;
    }

    setWalletStatus("connecting");
    setWalletError(null);

    const storedSource = localStorage.getItem(STORAGE_SOURCE);
    const storedAddr = localStorage.getItem(STORAGE_ADDR);
    const ordered = storedSource
      ? [storedSource, ...available.filter((s) => s !== storedSource)]
      : available;

    for (const source of ordered) {
      try {
        const enabled = await enableWallet(source);
        const picked =
          enabled.accounts.find((a) => a.address === storedAddr) ??
          enabled.accounts[0];
        if (!picked) continue;

        localStorage.setItem(STORAGE_SOURCE, source);
        localStorage.setItem(STORAGE_ADDR, picked.address);
        setAccounts(enabled.accounts);
        setAccount(picked);
        setSigner(enabled.signer);
        setWalletStatus("connected");
        setWalletError(null);
        return;
      } catch (err) {
        setWalletError(
          err instanceof Error ? err.message : `Failed to connect "${source}".`
        );
      }
    }

    setWalletStatus("disconnected");
  }, []);

  // Auto-connect on mount if previously connected
  useEffect(() => {
    connect().catch(() => undefined);
  }, [connect]);

  const value = useMemo<ChainContextValue>(
    () => ({
      api,
      apiStatus,
      apiError,
      walletStatus,
      walletError,
      wallets,
      account,
      accounts,
      signer,
      connect,
      disconnect,
    }),
    [
      api,
      apiStatus,
      apiError,
      walletStatus,
      walletError,
      wallets,
      account,
      accounts,
      signer,
      connect,
      disconnect,
    ]
  );

  return (
    <ChainContext.Provider value={value}>{children}</ChainContext.Provider>
  );
}

function useChainContext() {
  const ctx = useContext(ChainContext);
  if (!ctx) throw new Error("ChainProvider is required.");
  return ctx;
}

export function useChainApi() {
  const { api, apiError, apiStatus } = useChainContext();
  return { api, apiError, apiStatus };
}

export function useWallet() {
  const {
    account,
    accounts,
    connect,
    disconnect,
    signer,
    walletError,
    walletStatus,
    wallets,
  } = useChainContext();
  return {
    account,
    accounts,
    connect,
    disconnect,
    signer,
    walletError,
    walletStatus,
    wallets,
  };
}
