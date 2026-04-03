import { useCallback, useEffect, useState } from "react";

const STORAGE_MNEMONIC = "vara-starter.session.mnemonic";
const STORAGE_ADDRESS = "vara-starter.session.address";
const STORAGE_PAUSED = "vara-starter.session.paused";
const VARA_SS58 = 137;

// Custom event for same-tab sync between components
const SESSION_CHANGE_EVENT = "vara-session-change";

interface SessionState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pair: any | null;
  address: string | null;
}

interface UseSessionResult {
  sessionAddress: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sessionPair: any | null;
  isActive: boolean;
  startSession: () => Promise<string>;
  /** Deactivate session (keypair stays in storage for reuse) */
  endSession: () => void;
  /** Permanently delete the keypair from storage */
  clearSession: () => void;
  error: string | null;
}

function notifySessionChange() {
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

/**
 * Manages a temporary session keypair for signless transactions.
 *
 * Uses localStorage so the session survives page reload. The funded voucher
 * is still valid on-chain after reload, so the user doesn't need to re-fund.
 * SessionProvider controls isActive (keypair + valid voucher required).
 * SessionPanel makes the state visible so the user can end it anytime.
 *
 * SECURITY: The mnemonic in localStorage is an XSS risk. Acceptable for a
 * starter template because the voucher balance is limited and time-bounded.
 * Production apps should encrypt with a wallet-derived key.
 */
export function useSession(hasVoucher: boolean): UseSessionResult {
  const [session, setSession] = useState<SessionState>({
    pair: null,
    address: null,
  });
  const [error, setError] = useState<string | null>(null);

  // Restore from localStorage on mount (skip if paused)
  useEffect(() => {
    const mnemonic = localStorage.getItem(STORAGE_MNEMONIC);
    const address = localStorage.getItem(STORAGE_ADDRESS);
    const paused = localStorage.getItem(STORAGE_PAUSED);
    if (!mnemonic || !address || paused === "true") return;

    let cancelled = false;
    (async () => {
      try {
        const { GearKeyring } = await import("@gear-js/api");
        const pair = await GearKeyring.fromMnemonic(mnemonic, "session", VARA_SS58);
        if (!cancelled) {
          setSession({ pair, address });
          setError(null);
        }
      } catch {
        if (!cancelled) {
          localStorage.removeItem(STORAGE_MNEMONIC);
          localStorage.removeItem(STORAGE_ADDRESS);
          setError("Failed to restore session. Please create a new one.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sync across useSession instances in the same tab via custom event
  useEffect(() => {
    function handleSync() {
      const mnemonic = localStorage.getItem(STORAGE_MNEMONIC);
      const address = localStorage.getItem(STORAGE_ADDRESS);
      const paused = localStorage.getItem(STORAGE_PAUSED);

      if (!mnemonic || !address || paused === "true") {
        setSession({ pair: null, address: null });
        setError(null);
        return;
      }

      (async () => {
        try {
          const { GearKeyring } = await import("@gear-js/api");
          const pair = await GearKeyring.fromMnemonic(mnemonic, "session", VARA_SS58);
          setSession({ pair, address });
          setError(null);
        } catch {
          // Ignore restore errors during sync
        }
      })();
    }

    window.addEventListener(SESSION_CHANGE_EVENT, handleSync);
    return () => window.removeEventListener(SESSION_CHANGE_EVENT, handleSync);
  }, []);

  const startSession = useCallback(async (): Promise<string> => {
    try {
      const { GearKeyring } = await import("@gear-js/api");

      // Reuse existing keypair if one is stored (avoids orphaning funded vouchers)
      const existingMnemonic = localStorage.getItem(STORAGE_MNEMONIC);
      const existingAddress = localStorage.getItem(STORAGE_ADDRESS);
      if (existingMnemonic && existingAddress) {
        localStorage.removeItem(STORAGE_PAUSED);
        const pair = await GearKeyring.fromMnemonic(existingMnemonic, "session", VARA_SS58);
        setSession({ pair, address: existingAddress });
        setError(null);
        notifySessionChange();
        return existingAddress;
      }

      localStorage.removeItem(STORAGE_PAUSED);

      // No existing session, create a new keypair
      const { keyring, mnemonic } = await GearKeyring.create("session", undefined, VARA_SS58);
      const address = keyring.address;

      localStorage.setItem(STORAGE_MNEMONIC, mnemonic);
      localStorage.setItem(STORAGE_ADDRESS, address);

      setSession({ pair: keyring, address });
      setError(null);
      notifySessionChange();
      return address;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create session";
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const endSession = useCallback(() => {
    // Pause: deactivate session but keep keypair in localStorage.
    // Next startSession() will reuse it, avoiding orphaned vouchers.
    localStorage.setItem(STORAGE_PAUSED, "true");
    setSession({ pair: null, address: null });
    setError(null);
    notifySessionChange();
  }, []);

  /** Permanently delete the session keypair from storage. */
  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_MNEMONIC);
    localStorage.removeItem(STORAGE_ADDRESS);
    localStorage.removeItem(STORAGE_PAUSED);
    setSession({ pair: null, address: null });
    setError(null);
    notifySessionChange();
  }, []);

  const isActive = session.pair !== null && hasVoucher;

  return {
    sessionAddress: session.address,
    sessionPair: session.pair,
    isActive,
    startSession,
    endSession,
    clearSession,
    error,
  };
}
