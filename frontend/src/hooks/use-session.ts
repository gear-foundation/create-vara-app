import { useCallback, useEffect, useState } from "react";

const STORAGE_MNEMONIC = "vara-starter.session.mnemonic";
const STORAGE_ADDRESS = "vara-starter.session.address";
// Vara SS58 prefix
const VARA_SS58 = 137;

// Custom event name for same-tab sync (storage events only fire cross-tab)
const SESSION_CHANGE_EVENT = "vara-session-change";

interface SessionState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pair: any | null; // KeyringPair
  address: string | null;
  mnemonic: string | null;
}

interface UseSessionResult {
  sessionAddress: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sessionPair: any | null;
  isActive: boolean;
  startSession: () => Promise<string>;
  endSession: () => void;
  error: string | null;
}

/** Dispatch a custom event so all useSession instances in the same tab sync. */
function notifySessionChange() {
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

/** Restore keypair from localStorage (returns null if not found or corrupted). */
async function restoreFromStorage(): Promise<SessionState | null> {
  const mnemonic = localStorage.getItem(STORAGE_MNEMONIC);
  const address = localStorage.getItem(STORAGE_ADDRESS);
  if (!mnemonic || !address) return null;

  try {
    const { GearKeyring } = await import("@gear-js/api");
    const pair = await GearKeyring.fromMnemonic(mnemonic, "session", VARA_SS58);
    return { pair, address, mnemonic };
  } catch {
    localStorage.removeItem(STORAGE_MNEMONIC);
    localStorage.removeItem(STORAGE_ADDRESS);
    return null;
  }
}

/**
 * Manages a temporary session keypair for signless transactions.
 *
 * All useSession instances sync via a custom DOM event + localStorage 'storage'
 * events. Changes in one component are immediately reflected in all others.
 *
 * SECURITY NOTE: The session mnemonic is stored in localStorage for persistence
 * across page reloads. This is an XSS risk, any script on the same origin can
 * read the private key. Acceptable for a starter template because voucher balance
 * is limited and time-bounded. Production apps should encrypt the mnemonic with
 * a key derived from a wallet signature.
 */
export function useSession(hasVoucher: boolean): UseSessionResult {
  const [session, setSession] = useState<SessionState>({
    pair: null,
    address: null,
    mnemonic: null,
  });
  const [error, setError] = useState<string | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    let cancelled = false;

    restoreFromStorage().then((restored) => {
      if (cancelled) return;
      if (restored) {
        setSession(restored);
        setError(null);
      } else if (localStorage.getItem(STORAGE_MNEMONIC)) {
        // Had a mnemonic but restore failed (corrupted)
        setError(
          "Failed to restore session, corrupted key. Please create a new session.",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Sync across all useSession instances in the same tab via custom event,
  // and across tabs via the native storage event.
  useEffect(() => {
    function handleSync() {
      const mnemonic = localStorage.getItem(STORAGE_MNEMONIC);
      const address = localStorage.getItem(STORAGE_ADDRESS);

      if (!mnemonic || !address) {
        // Session was cleared
        setSession({ pair: null, address: null, mnemonic: null });
        setError(null);
        return;
      }

      // Session was created or changed, restore keypair
      restoreFromStorage().then((restored) => {
        if (restored) {
          setSession(restored);
          setError(null);
        }
      });
    }

    // Same-tab sync
    window.addEventListener(SESSION_CHANGE_EVENT, handleSync);
    // Cross-tab sync (storage events only fire in OTHER tabs)
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_MNEMONIC || e.key === STORAGE_ADDRESS) {
        handleSync();
      }
    });

    return () => {
      window.removeEventListener(SESSION_CHANGE_EVENT, handleSync);
      // Note: storage listener cleanup requires a named function reference.
      // For a starter template, the listener persists for the component lifetime.
    };
  }, []);

  const startSession = useCallback(async (): Promise<string> => {
    try {
      const { GearKeyring } = await import("@gear-js/api");
      const { keyring, mnemonic } = await GearKeyring.create(
        "session",
        undefined,
        VARA_SS58,
      );
      const address = keyring.address;

      localStorage.setItem(STORAGE_MNEMONIC, mnemonic);
      localStorage.setItem(STORAGE_ADDRESS, address);

      setSession({ pair: keyring, address, mnemonic });
      setError(null);
      // Notify all other instances in this tab
      notifySessionChange();
      return address;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create session";
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const endSession = useCallback(() => {
    localStorage.removeItem(STORAGE_MNEMONIC);
    localStorage.removeItem(STORAGE_ADDRESS);
    setSession({ pair: null, address: null, mnemonic: null });
    setError(null);
    // Notify all other instances in this tab
    notifySessionChange();
  }, []);

  // Session is active only when keypair exists AND a voucher is available for it
  const isActive = session.pair !== null && hasVoucher;

  return {
    sessionAddress: session.address,
    sessionPair: session.pair,
    isActive,
    startSession,
    endSession,
    error,
  };
}
