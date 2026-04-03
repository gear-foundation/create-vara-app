import { Lightning } from "@phosphor-icons/react";
import { useSessionContext } from "@/providers/session-provider";
import { blocksToHumanTime } from "@/lib/block-time";

/**
 * Small pill badge showing "Gasless" when a session voucher is active.
 * Reads from SessionProvider context (no extra polling).
 */
export function VoucherBadge() {
  const { hasVoucher, remainingBlocks, isActive } = useSessionContext();

  if (!isActive || !hasVoucher) return null;

  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-400 text-xs font-mono"
      aria-live="polite"
      title={
        remainingBlocks !== null
          ? `Signless active — ${remainingBlocks} blocks remaining`
          : "Signless active"
      }
    >
      <Lightning size={12} weight="fill" />
      <span className="hidden sm:inline">Signless</span>
      {remainingBlocks !== null && (
        <span className="hidden sm:inline text-emerald-400/60">
          {blocksToHumanTime(remainingBlocks)}
        </span>
      )}
    </div>
  );
}
