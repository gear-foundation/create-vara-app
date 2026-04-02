import { NetworkSelector } from "@/components/NetworkSelector";
import { WalletButton } from "@/components/WalletModal";

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 lg:px-8 py-5 border-b border-zinc-800/50">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-emerald-500/70">
          vara
        </h1>
        <NetworkSelector />
      </div>

      <WalletButton />
    </header>
  );
}
