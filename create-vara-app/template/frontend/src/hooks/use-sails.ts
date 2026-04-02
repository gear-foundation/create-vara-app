import { useState, useEffect } from "react";
import type { Sails } from "sails-js";
import { useChainApi } from "@/providers/chain-provider";
import { initSails } from "@/lib/sails-client";

/**
 * Shared hook for accessing the Sails instance.
 * Handles lazy initialization, API reconnection, and programId changes.
 */
export function useSails() {
  const [sails, setSails] = useState<Sails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { api, apiStatus, programId } = useChainApi();

  useEffect(() => {
    if (!api || apiStatus !== "ready") {
      setSails(null);
      setLoading(true);
      setError(null);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);

    initSails(api, programId)
      .then((s) => {
        if (!cancelled) {
          setSails(s);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to initialize Sails");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api, apiStatus, programId]);

  return { sails, loading, error };
}
