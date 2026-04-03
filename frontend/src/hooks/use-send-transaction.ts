import { useCallback } from "react";
import { useWallet } from "@/providers/chain-provider";

interface SendTxCallbacks {
  onSigning?: () => void;
  onSubmitted?: () => void;
}

interface SendTxOptions {
  /** Voucher ID to attach (from useVoucher) */
  voucherId?: string | null;
  /** Session keypair for signless mode (from useSession) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sessionPair?: any | null;
}

interface UseSendTransactionResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendTransaction: (tx: any, callbacks?: SendTxCallbacks, options?: SendTxOptions) => Promise<any>;
}

// Timeout for wallet popup. If the extension doesn't respond, show an error
// instead of hanging forever. SubWallet is known to go stale after dev restarts.
const SIGN_TIMEOUT_MS = 15_000;

/**
 * Stateless transaction sender. Does NOT poll for vouchers or manage sessions.
 * Voucher ID and session pair are passed in by the caller.
 * When no options are passed, falls back to standard wallet signing.
 */
export function useSendTransaction(): UseSendTransactionResult {
  const { account, signer } = useWallet();

  const sendTransaction = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (tx: any, callbacks?: SendTxCallbacks, options?: SendTxOptions) => {
      const { voucherId, sessionPair } = options ?? {};

      // Set account and signer
      if (sessionPair) {
        tx.withAccount(sessionPair);
      } else if (account) {
        if (signer) {
          tx.withAccount(account.address, { signer });
        } else {
          tx.withAccount(account.address);
        }
      } else {
        throw new Error("No account available");
      }

      if (voucherId) {
        tx.withVoucher(voucherId);
      }

      await tx.calculateGas();

      // Sign and send. Timeout detects dead wallet extensions (e.g. SubWallet
      // goes stale after repeated dev server restarts).
      let timeoutId: ReturnType<typeof setTimeout>;
      const result = await Promise.race([
        tx.signAndSend().then((r: unknown) => {
          clearTimeout(timeoutId);
          return r;
        }),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () =>
              reject(
                new Error(
                  "Wallet not responding. Try: disconnect wallet, reconnect, or restart the wallet extension.",
                ),
              ),
            SIGN_TIMEOUT_MS,
          );
        }),
      ]);

      // Signing succeeded, now waiting for on-chain confirmation
      callbacks?.onSigning?.();

      return await result.response();
    },
    [account, signer],
  );

  return { sendTransaction };
}
