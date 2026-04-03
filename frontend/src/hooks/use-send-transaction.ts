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
  signless: boolean;
  gasless: boolean;
}

/**
 * Unified transaction sender that handles voucher attachment and session signing.
 * Falls back to standard wallet signing when no voucher/session is available.
 */
export function useSendTransaction(): UseSendTransactionResult {
  const { programId } = useChainApi();
  const { account, signer } = useWallet();

  // Single voucher check for the wallet address (session voucher is checked in SessionPanel)
  const walletVoucher = useVoucher(account?.address ?? null, programId || null);

  // Session state (reads from localStorage, syncs via events)
  const session = useSession(false);

  // Check if session has a voucher by looking at SessionPanel's voucher state
  // We pass null for programId when no session exists to avoid unnecessary polling
  const sessionVoucher = useVoucher(
    session.sessionAddress,
    session.sessionAddress ? (programId || null) : null,
  );

  const isSignless = session.sessionPair !== null && sessionVoucher.hasVoucher;
  const voucher = isSignless ? sessionVoucher : walletVoucher;

  const txLock = useRef(false);

  const sendTransaction = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (tx: any, callbacks?: SendTxCallbacks) => {
      if (isSignless) {
        if (txLock.current) {
          throw new Error("A signless transaction is already in progress");
        }
        txLock.current = true;
      }

      try {
        // Set account and signer
        if (isSignless && session.sessionPair) {
          tx.withAccount(session.sessionPair);
        } else if (account) {
          // This is the same pattern that worked before signless was added:
          // tx.withAccount(account.address, signer ? { signer } : undefined)
          if (signer) {
            tx.withAccount(account.address, { signer });
          } else {
            tx.withAccount(account.address);
          }
        } else {
          throw new Error("No account available");
        }

        // Attach voucher if available
        if (voucher.activeVoucherId) {
          tx.withVoucher(voucher.activeVoucherId);
        }

        // Calculate gas (this does NOT trigger wallet popup)
        await tx.calculateGas();
        callbacks?.onSigning?.();

        // Sign and send (this triggers wallet popup in non-signless mode)
        const result = await tx.signAndSend();
        callbacks?.onSubmitted?.();

        return await result.response();
      } catch (err) {
        throw err;
      } finally {
        if (isSignless) {
          txLock.current = false;
        }
      }
    },
    [isSignless, session.sessionPair, account, signer, voucher.activeVoucherId],
  );

  return {
    sendTransaction,
    signless: isSignless,
    gasless: voucher.hasVoucher,
  };
}
