import { useCallback, useRef } from "react";
import { useChainApi, useWallet } from "@/providers/chain-provider";
import { useVoucher } from "@/hooks/use-voucher";
import { useSession } from "@/hooks/use-session";

interface SendTxCallbacks {
  onSigning?: () => void;
  onSubmitted?: () => void;
}

interface UseSendTransactionResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendTransaction: (tx: any, callbacks?: SendTxCallbacks) => Promise<any>;
  /** True when using signless session (no wallet popup) */
  signless: boolean;
  /** True when a voucher is covering gas */
  gasless: boolean;
}

/**
 * Unified transaction sender that handles voucher attachment and session signing.
 *
 * When a voucher exists for the effective account, it's attached via withVoucher().
 * When a signless session is active, the session keypair signs directly (no popup).
 * Falls back to standard wallet signing when no voucher/session is available.
 */
export function useSendTransaction(): UseSendTransactionResult {
  const { programId } = useChainApi();
  const { account, signer } = useWallet();

  // useSession tracks keypair state. Voucher check happens below via useVoucher.
  const prelimSession = useSession(false);

  // Check voucher for session address first, then fall back to wallet address.
  // We need both checks to avoid losing wallet voucher when session exists but is unfunded.
  const sessionVoucher = useVoucher(
    prelimSession.sessionAddress,
    prelimSession.sessionAddress ? (programId || null) : null,
  );
  const walletVoucher = useVoucher(
    prelimSession.sessionAddress && sessionVoucher.hasVoucher
      ? null // skip wallet check when session voucher is active
      : (account?.address ?? null),
    prelimSession.sessionAddress && sessionVoucher.hasVoucher
      ? null
      : (programId || null),
  );

  // Session is active only when keypair exists AND session has its own voucher
  const isSignless =
    prelimSession.sessionPair !== null && sessionVoucher.hasVoucher;

  // Pick the right voucher: session voucher when signless, wallet voucher otherwise
  const voucher = isSignless ? sessionVoucher : walletVoucher;

  // Mutex for signless mode to prevent concurrent txs
  const txLock = useRef(false);

  const sendTransaction = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (tx: any, callbacks?: SendTxCallbacks) => {
      // Signless serialization guard
      if (isSignless) {
        if (txLock.current) {
          throw new Error("A signless transaction is already in progress");
        }
        txLock.current = true;
      }

      try {
        // Set account
        if (isSignless && prelimSession.sessionPair) {
          tx.withAccount(prelimSession.sessionPair);
        } else if (account) {
          tx.withAccount(
            account.address,
            signer ? { signer } : undefined,
          );
        } else {
          throw new Error("No account available");
        }

        // Attach voucher if available
        if (voucher.activeVoucherId) {
          tx.withVoucher(voucher.activeVoucherId);
        }

        // Calculate gas
        await tx.calculateGas();
        callbacks?.onSigning?.();

        // Sign and send
        const result = await tx.signAndSend();
        callbacks?.onSubmitted?.();

        // Wait for response
        return await result.response();
      } catch (err) {
        // Note: voucher retry is not safe because the tx object is mutated by
        // withVoucher() and signAndSend(). The user should retry manually,
        // which creates a fresh tx. On next attempt, the voucher poll will
        // have cleared the expired voucher so it won't be reattached.
        throw err;
      } finally {
        if (isSignless) {
          txLock.current = false;
        }
      }
    },
    [
      isSignless,
      prelimSession.sessionPair,
      account,
      signer,
      voucher.activeVoucherId,
    ],
  );

  return {
    sendTransaction,
    signless: isSignless,
    gasless: voucher.hasVoucher,
  };
}
