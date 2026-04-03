import { useCallback, useEffect, useRef, useState } from "react";
import { useChainApi } from "@/providers/chain-provider";

interface VoucherDetails {
  owner: string;
  expiry: number;
  programs: string[] | null;
  codeUploading: boolean;
}

interface UseVoucherResult {
  activeVoucherId: string | null;
  hasVoucher: boolean;
  voucherDetails: VoucherDetails | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// Longer interval to avoid saturating the RPC WebSocket connection.
// Multiple useVoucher instances can be mounted simultaneously.
const POLL_INTERVAL_MS = 30_000;

/**
 * Checks for active vouchers for a given address and program.
 * Uses lightweight api.voucher.exists() first, only fetches details when needed.
 */
export function useVoucher(
  address: string | null,
  programId: string | null,
): UseVoucherResult {
  const { api, apiStatus, blockNumber } = useChainApi();
  const [activeVoucherId, setActiveVoucherId] = useState<string | null>(null);
  const [voucherDetails, setVoucherDetails] = useState<VoucherDetails | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshRef = useRef(0);
  const blockNumberRef = useRef(blockNumber);
  blockNumberRef.current = blockNumber;

  const refresh = useCallback(() => {
    refreshRef.current += 1;
    setLoading(true);
  }, []);

  useEffect(() => {
    // Skip entirely when inputs are missing
    if (!api || apiStatus !== "ready" || !address || !programId) {
      setActiveVoucherId(null);
      setVoucherDetails(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gearApi = api as any;

        // Step 1: lightweight exists() check — single storage read
        const exists: boolean = await gearApi.voucher.exists(
          address,
          programId as `0x${string}`,
        );

        if (cancelled) return;

        if (!exists) {
          setActiveVoucherId(null);
          setVoucherDetails(null);
          setError(null);
          return;
        }

        // Step 2: only fetch full details when we know a voucher exists
        const vouchers: Record<string, VoucherDetails> =
          await gearApi.voucher.getAllForAccount(
            address,
            programId as `0x${string}`,
          );

        if (cancelled) return;

        const currentBlock = blockNumberRef.current ?? 0;
        const validEntries = Object.entries(vouchers)
          .filter(([, details]) => details.expiry > currentBlock)
          .sort(([a], [b]) => a.localeCompare(b));

        if (validEntries.length > 0) {
          const [id, details] = validEntries[0];
          setActiveVoucherId(id);
          setVoucherDetails(details);
        } else {
          setActiveVoucherId(null);
          setVoucherDetails(null);
        }
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setActiveVoucherId(null);
          setVoucherDetails(null);
          setError(
            err instanceof Error ? err.message : "Failed to fetch vouchers",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    poll();

    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, apiStatus, address, programId, refreshRef.current]);

  return {
    activeVoucherId,
    hasVoucher: activeVoucherId !== null,
    voucherDetails,
    loading,
    error,
    refresh,
  };
}
