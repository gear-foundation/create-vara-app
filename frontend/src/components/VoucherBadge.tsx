import { Lightning } from "@phosphor-icons/react";
import { useVoucher } from "@/hooks/use-voucher";
import { useChainApi, useWallet } from "@/providers/chain-provider";
import { blocksToHumanTime } from "@/lib/block-time";

/**
 * Small pill badge showing "Gasless" when an active voucher exists.
 * Renders nothing while loading or when no voucher is available.
 */
export function VoucherBadge() {
  const { programId, blockNumber } = useChainApi();
  const { account } = useWallet();
  const { hasVoucher, voucherDetails, loading } = useVoucher(
    account?.address ?? null,
    programId || null,
  );

  if (loading || !hasVoucher || !voucherDetails) return null;

  const remainingBlocks = blockNumber
    ? Math.max(0, voucherDetails.expiry - blockNumber)
    : null;

  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-400 text-xs font-mono"
      aria-live="polite"
      title={
        remainingBlocks !== null
          ? `Voucher active — ${remainingBlocks} blocks remaining`
          : "Voucher active"
      }
    >
      <Lightning size={12} weight="fill" />
      <span className="hidden sm:inline">Gasless</span>
      {remainingBlocks !== null && (
        <span className="hidden sm:inline text-emerald-400/60">
          {blocksToHumanTime(remainingBlocks)}
        </span>
      )}
    </div>
  );
}
