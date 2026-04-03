import { createContext, useContext, useMemo } from "react";
import { useChainApi } from "@/providers/chain-provider";
import { useSession } from "@/hooks/use-session";
import { useVoucher } from "@/hooks/use-voucher";

interface SessionContextValue {
  sessionAddress: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sessionPair: any | null;
  /** True only when keypair exists AND voucher is active for session address */
  isActive: boolean;
  startSession: () => Promise<string>;
  /** Deactivate session (keypair stays for reuse) */
  endSession: () => void;
  /** Permanently delete keypair from storage */
  clearSession: () => void;
  error: string | null;
  voucherId: string | null;
  hasVoucher: boolean;
  voucherLoading: boolean;
  refreshVoucher: () => void;
  remainingBlocks: number | null;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Single source of truth for signless session state.
 * Only ONE useVoucher instance for the session address exists in the entire app.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { programId, blockNumber } = useChainApi();

  // Single useSession instance. Pass false for hasVoucher initially;
  // isActive is computed below from session.sessionPair + voucher.hasVoucher.
  const session = useSession(false);

  // Only poll voucher when a session address exists
  const voucher = useVoucher(
    session.sessionAddress,
    session.sessionAddress ? (programId || null) : null,
  );

  // Session is active when both keypair and voucher exist
  const isActive = session.sessionPair !== null && voucher.hasVoucher;


  const remainingBlocks =
    blockNumber && voucher.voucherDetails
      ? Math.max(0, voucher.voucherDetails.expiry - blockNumber)
      : null;

  const value = useMemo<SessionContextValue>(
    () => ({
      sessionAddress: session.sessionAddress,
      sessionPair: session.sessionPair,
      isActive,
      startSession: session.startSession,
      endSession: session.endSession,
      clearSession: session.clearSession,
      error: session.error,
      voucherId: voucher.activeVoucherId,
      hasVoucher: voucher.hasVoucher,
      voucherLoading: voucher.loading,
      refreshVoucher: voucher.refresh,
      remainingBlocks,
    }),
    [
      session.sessionAddress,
      session.sessionPair,
      session.error,
      session.startSession,
      session.endSession,
      session.clearSession,
      isActive,
      voucher.activeVoucherId,
      voucher.hasVoucher,
      voucher.loading,
      voucher.refresh,
      remainingBlocks,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSessionContext(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("SessionProvider is required");
  return ctx;
}
