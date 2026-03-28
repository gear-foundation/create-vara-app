import { useState, useEffect, useCallback } from "react";
import { useChainApi, useWallet } from "@/providers/chain-provider";
import { queryState, queryMessages } from "@/lib/sails-client";

type StateView = {
  counter: string | number;
  last_caller: string | null;
  ping_count: string | number;
  message_count: string | number;
};

type StoredMessage = {
  sender: string;
  text: string;
  block_height: number;
};

function truncate(s: string) {
  return s.length > 16 ? `${s.slice(0, 8)}...${s.slice(-8)}` : s;
}

export function StatePanel({ refreshTrigger }: { refreshTrigger: number }) {
  const { api, apiStatus } = useChainApi();
  const { account } = useWallet();
  const [state, setState] = useState<StateView | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollInterval, setPollInterval] = useState(5000);

  const fetchState = useCallback(async () => {
    if (!api || apiStatus !== "ready") return;
    try {
      const [s, msgs] = await Promise.all([
        queryState(api),
        queryMessages(api),
      ]);
      setState(s as StateView);
      setMessages((msgs as StoredMessage[]) ?? []);
      setError(null);
      setLoading(false);
      setPollInterval(5000); // reset backoff on success
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read state");
      setLoading(false);
      setPollInterval((prev) => Math.min(prev * 2, 60000)); // backoff
    }
  }, [api, apiStatus]);

  useEffect(() => {
    fetchState();
  }, [fetchState, refreshTrigger]);

  useEffect(() => {
    if (!api || apiStatus !== "ready") return;
    const id = setInterval(fetchState, pollInterval);
    return () => clearInterval(id);
  }, [api, apiStatus, fetchState, pollInterval]);

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-200">Program State</h2>
        <button
          onClick={fetchState}
          className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-400"
        >
          Refresh
        </button>
      </div>

      {loading && !state ? (
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-slate-700 rounded w-1/3" />
          <div className="h-4 bg-slate-700 rounded w-2/3" />
          <div className="h-4 bg-slate-700 rounded w-1/2" />
        </div>
      ) : error && !state ? (
        <div className="text-red-400 text-sm">
          {error}
          <button onClick={fetchState} className="ml-2 underline">
            Retry
          </button>
        </div>
      ) : !state ? (
        <p className="text-slate-500 text-sm">
          {account
            ? "No data yet. Send a transaction."
            : "Connect wallet and send a transaction."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <div className="text-3xl font-bold text-indigo-400">
                {String(state.counter)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Counter</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <div className="text-3xl font-bold text-amber-400">
                {String(state.ping_count)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Pings</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <div className="text-3xl font-bold text-green-400">
                {String(state.message_count)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Messages</div>
            </div>
          </div>

          {state.last_caller && (
            <p className="text-xs text-slate-500 mb-3">
              Last caller:{" "}
              <span className="font-mono text-slate-400">
                {truncate(String(state.last_caller))}
              </span>
            </p>
          )}

          {messages.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
              <h3 className="text-sm font-medium text-slate-400 mb-1">
                Messages
              </h3>
              {messages.map((m, i) => (
                <div
                  key={i}
                  className="text-xs bg-slate-700/30 rounded px-2 py-1 flex justify-between"
                >
                  <span className="text-slate-300 truncate max-w-[60%]">
                    {m.text}
                  </span>
                  <span className="text-slate-500 font-mono">
                    #{m.block_height}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
