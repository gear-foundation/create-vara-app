import { useCallback, useEffect, useRef, useState } from "react";
import { useChainApi } from "@/providers/chain-provider";

// Use a ref for blockNumber so it doesn't trigger re-fetches on every block
// The effect only re-runs when api/address/programId change or on manual refresh

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

const POLL_INTERVAL_MS = 12_000;

/**
 * Polls for active vouchers for a given address and program.
 * Filters expired vouchers and picks the first valid one deterministically.
 */
export function useVoucher(
  address: string | null,
  programId: string | null,
): UseVoucherResult {
  const { api, apiStatus, blockNumber } = useChainApi();
  const [activeVoucherId, setActiveVoucherId] = useState<string | null>(null);
  const [voucherDetails, setVoucherDetails] = useState<VoucherDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshRef = useRef(0);
  const blockNumberRef = useRef(blockNumber);
  blockNumberRef.current = blockNumber;

  const refresh = useCallback(() => {
    refreshRef.current += 1;
    // Force re-run by updating a counter tracked in the effect deps
    setLoading(true);
  }, []);

  useEffect(() => {
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
        const gearApi = api as unknown as {
          voucher: {
            getAllForAccount: (
              accountId: string,
              programId?: string,
            ) => Promise<Record<string, VoucherDetails>>;
          };
        };

        const vouchers = await gearApi.voucher.getAllForAccount(
          address!,
          programId! as `0x${string}`,
        );

        if (cancelled) return;

        // Filter expired vouchers and sort deterministically
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
    // refreshRef.current triggers manual refresh. blockNumber excluded to avoid 3s re-polls.
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
