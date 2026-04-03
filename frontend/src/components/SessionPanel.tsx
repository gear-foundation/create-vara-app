import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightning,
  Copy,
  Check,
  Warning,
  XCircle,
  CircleNotch,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";
import { useChainApi, useWallet } from "@/providers/chain-provider";
import { useVoucher } from "@/hooks/use-voucher";
import { useSession } from "@/hooks/use-session";
import { blocksToHumanTime } from "@/lib/block-time";

function truncateAddress(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

/**
 * Session management card for signless transactions.
 * Placed above ActionsPanel. Uses muted card styling to distinguish from action cards.
 *
 * States: no session, awaiting voucher, active, expired, error.
 */
export function SessionPanel() {
  const { api, apiStatus, programId, blockNumber } = useChainApi();
  const { account, signer } = useWallet();
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fundingPhase, setFundingPhase] = useState<
    "idle" | "signing" | "submitted" | "done" | "error"
  >("idle");
  const [fundingError, setFundingError] = useState<string | null>(null);

  // Check voucher for session address (or null if no session)
  const [sessionAddr, setSessionAddr] = useState<string | null>(null);
  const sessionVoucher = useVoucher(sessionAddr, programId || null);
  const session = useSession(sessionVoucher.hasVoucher);

  // Keep sessionAddr in sync with session hook (via useEffect to avoid render-phase setState)
  useEffect(() => {
    if (session.sessionAddress !== sessionAddr) {
      setSessionAddr(session.sessionAddress);
    }
  }, [session.sessionAddress, sessionAddr]);

  const remainingBlocks =
    blockNumber && sessionVoucher.voucherDetails
      ? Math.max(0, sessionVoucher.voucherDetails.expiry - blockNumber)
      : null;

  const isExpired = remainingBlocks !== null && remainingBlocks === 0;

  async function handleStartSession() {
    try {
      const addr = await session.startSession();
      setSessionAddr(addr);
    } catch {
      // Error is captured in session.error
    }
  }

  function handleEndSession() {
    session.endSession();
    setSessionAddr(null);
    setCollapsed(false);
  }

  async function handleCopyAddress() {
    if (!session.sessionAddress) return;
    await navigator.clipboard.writeText(session.sessionAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleFundSession() {
    if (!api || apiStatus !== "ready" || !account || !signer || !session.sessionAddress || !programId) return;
    setFundingPhase("signing");
    setFundingError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gearApi = api as any;
      // Use the high-level voucher.issue() which handles param ordering
      const { extrinsic } = await gearApi.voucher.issue(
        session.sessionAddress,
        5_000_000_000_000n, // 5 VARA
        3600,               // duration in blocks (~3h)
        [programId],        // programs whitelist
      );
      // Sign and send the voucher issue extrinsic
      await new Promise<void>((resolve, reject) => {
        extrinsic.signAndSend(
          account.address,
          { signer },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ({ status }: any) => {
            if (status.isBroadcast) setFundingPhase("submitted");
            if (status.isInBlock || status.isFinalized) resolve();
            if (status.isInvalid || status.isDropped) reject(new Error("Transaction failed"));
          },
        ).catch((err: unknown) => reject(err));
      });
      sessionVoucher.refresh();
      setFundingPhase("done");
    } catch (err) {
      setFundingPhase("error");
      setFundingError(err instanceof Error ? err.message : "Failed to fund session");
    }
  }

  if (!account) return null;

  // Determine state
  type SessionState = "none" | "awaiting" | "active" | "expired" | "error";
  let state: SessionState = "none";
  if (session.error) state = "error";
  else if (session.isActive && !isExpired) state = "active";
  else if (session.isActive && isExpired) state = "expired";
  else if (session.sessionAddress && !sessionVoucher.hasVoucher)
    state = "awaiting";

  return (
    <div className="rounded-2xl border border-zinc-700/30 bg-zinc-900/20 p-4 shadow-sm">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between text-sm text-zinc-400 font-medium"
      >
        <div className="flex items-center gap-2">
          <Lightning size={14} weight="bold" />
          <span>Signless Session</span>
          {state === "active" && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Active
            </span>
          )}
        </div>
        {collapsed ? <CaretDown size={14} /> : <CaretUp size={14} />}
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">
              {/* No session */}
              {state === "none" && (
                <div className="text-center py-2">
                  <p className="text-sm text-zinc-500 mb-3">
                    Sign once, then transact without wallet popups.
                  </p>
                  <button
                    onClick={handleStartSession}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-all active:scale-[0.97]"
                  >
                    Enable Signless
                  </button>
                </div>
              )}

              {/* Awaiting voucher */}
              {state === "awaiting" && session.sessionAddress && (
                <div className="space-y-3">
                  {fundingPhase === "idle" || fundingPhase === "error" ? (
                    <>
                      <button
                        onClick={handleFundSession}
                        disabled={!api || apiStatus !== "ready" || !programId}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600/80 text-emerald-50 text-sm font-medium hover:bg-emerald-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97]"
                      >
                        <Lightning size={14} weight="fill" />
                        Fund Session (5 VARA)
                      </button>
                      <p className="text-[10px] text-zinc-600 text-center">
                        Sponsors ~100 transactions for ~3 hours
                      </p>
                      {fundingPhase === "error" && fundingError && (
                        <div className="flex items-start gap-2 bg-red-500/5 border border-red-500/10 rounded-xl p-2">
                          <XCircle size={14} weight="fill" className="text-red-400 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-red-400">{fundingError}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 py-2">
                      <CircleNotch
                        size={14}
                        className={`animate-spin ${fundingPhase === "signing" ? "text-amber-400" : "text-emerald-400"}`}
                      />
                      <span className={`text-sm ${fundingPhase === "signing" ? "text-amber-400" : "text-emerald-400"}`}>
                        {fundingPhase === "signing" ? "Waiting for signature" : "Confirming on-chain"}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 bg-zinc-950 rounded-xl px-3 py-2">
                    <code className="text-xs text-zinc-300 font-mono flex-1 truncate">
                      {truncateAddress(session.sessionAddress)}
                    </code>
                    <button
                      onClick={handleCopyAddress}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors"
                      title="Copy full address"
                    >
                      {copied ? (
                        <Check size={14} weight="bold" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-600">
                    Or fund externally by issuing a voucher to this address.
                  </p>
                  <button
                    onClick={handleEndSession}
                    disabled={fundingPhase === "signing" || fundingPhase === "submitted"}
                    className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-30"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Active */}
              {state === "active" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-sm text-emerald-400 font-medium">
                        Signless Active
                      </span>
                    </div>
                    {remainingBlocks !== null && (
                      <span className="text-xs text-zinc-500 font-mono">
                        {blocksToHumanTime(remainingBlocks)} remaining
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-600">
                    Transactions appear from your session address, not your
                    wallet.
                  </p>
                  <button
                    onClick={handleEndSession}
                    className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    End Session
                  </button>
                </div>
              )}

              {/* Expired */}
              {state === "expired" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Warning size={14} weight="fill" className="text-amber-400" />
                    <span className="text-sm text-amber-400">
                      Session Expired
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Voucher depleted or expired. Create a new session.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        handleEndSession();
                        handleStartSession();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-all"
                    >
                      New Session
                    </button>
                    <button
                      onClick={handleEndSession}
                      className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Error */}
              {state === "error" && session.error && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <XCircle
                      size={14}
                      weight="fill"
                      className="text-red-400 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-xs text-red-400">
                      {session.error}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      handleEndSession();
                    }}
                    className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
