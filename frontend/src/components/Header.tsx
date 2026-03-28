import { useChainApi, useWallet } from "@/providers/chain-provider";

function truncateAddress(addr: string) {
  return addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-6)}` : addr;
}

export function Header() {
  const { apiStatus, apiError } = useChainApi();
  const { account, walletStatus, connect, disconnect } = useWallet();

  const statusDot =
    apiStatus === "ready"
      ? "bg-green-500"
      : apiStatus === "error"
        ? "bg-red-500"
        : "bg-amber-500";

  const statusText =
    apiStatus === "ready"
      ? "Connected"
      : apiStatus === "error"
        ? apiError ?? "Error"
        : "Connecting...";

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700">
      <h1 className="text-xl font-bold text-indigo-400">Vara Starter</h1>

      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span className={`w-2 h-2 rounded-full ${statusDot}`} />
        <span>{statusText}</span>
      </div>

      <div>
        {walletStatus === "connected" && account ? (
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-slate-300">
              {account.meta.name ?? truncateAddress(account.address)}
            </span>
            <button
              onClick={disconnect}
              className="px-3 py-1.5 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300"
            >
              Disconnect
            </button>
          </div>
        ) : walletStatus === "unavailable" ? (
          <a
            href="https://www.subwallet.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-1.5 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            Install Wallet
          </a>
        ) : (
          <button
            onClick={connect}
            disabled={walletStatus === "connecting"}
            className="px-4 py-1.5 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
          >
            {walletStatus === "connecting" ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>
    </header>
  );
}
