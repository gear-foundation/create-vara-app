import { useState, useMemo } from "react";
import { useWallet } from "@/providers/chain-provider";
import { useSails } from "@/hooks/use-sails";
import {
  extractMethods,
  getTypeLabel,
  coerceValue,
  defaultValue,
  safeJsonStringify,
  type MethodDescriptor,
} from "@/lib/idl-introspect";
import { TypedInput } from "@/components/TypedInput";

type CallStatus = "idle" | "loading" | "success" | "error";

// Internal methods that panic when called externally
const INTERNAL_METHODS = new Set(["HandlePing"]);

export function ManualCallTab({ onTxSuccess }: { onTxSuccess?: () => void }) {
  const { sails, loading: sailsLoading, error: sailsError } = useSails();
  const { account, signer, walletStatus } = useWallet();

  const methods = useMemo(() => {
    if (!sails) return [];
    return extractMethods(sails);
  }, [sails]);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [argValues, setArgValues] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<CallStatus>("idle");

  const selected: MethodDescriptor | null = methods[selectedIdx] ?? null;

  function handleMethodChange(idx: number) {
    setSelectedIdx(idx);
    setResult(null);
    setStatus("idle");
    // Reset arg values for the new method
    const method = methods[idx];
    if (method) {
      const defaults: Record<string, unknown> = {};
      for (const arg of method.args) {
        defaults[arg.name] = defaultValue(arg.typeDef);
      }
      setArgValues(defaults);
    }
  }

  async function handleExecute() {
    if (!sails || !selected) return;

    const service =
      sails.services[selected.serviceName] ??
      sails.services[selected.serviceName.toLowerCase()];
    if (!service) {
      setResult("Service not found");
      setStatus("error");
      return;
    }

    // Build ordered args
    const orderedArgs = selected.args.map((arg) =>
      coerceValue(arg.typeDef, argValues[arg.name]),
    );

    setStatus("loading");
    setResult(null);

    try {
      if (selected.kind === "query") {
        const queryFn = service.queries[selected.methodName];
        const builder = queryFn(...orderedArgs);
        const res = await builder.call();
        setResult(safeJsonStringify(res));
        setStatus("success");
      } else {
        // Command
        if (!account || walletStatus !== "connected") {
          setResult("Connect wallet to send transactions");
          setStatus("error");
          return;
        }

        if (!sails.programId) {
          setResult("No program ID set. Configure VITE_PROGRAM_ID in .env");
          setStatus("error");
          return;
        }

        const cmdFn = service.functions[selected.methodName];
        const tx = cmdFn(...orderedArgs);
        tx.withAccount(account.address, signer ? { signer } : undefined);
        await tx.calculateGas();
        const sentResult = await tx.signAndSend();
        const response = await sentResult.response();
        setResult(safeJsonStringify(response));
        setStatus("success");
        onTxSuccess?.();
      }
    } catch (err) {
      setResult(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  if (sailsLoading) {
    return (
      <div className="text-xs text-zinc-500 py-2">Loading Sails...</div>
    );
  }

  if (sailsError) {
    return (
      <div className="text-xs text-red-400 py-2">{sailsError}</div>
    );
  }

  if (methods.length === 0) {
    return (
      <div className="text-xs text-zinc-500 py-2">No methods found in IDL.</div>
    );
  }

  const isInternal = selected ? INTERNAL_METHODS.has(selected.methodName) : false;
  const needsWallet = selected?.kind === "command";
  const walletReady = account && walletStatus === "connected";
  const canExecute = selected && (selected.kind === "query" || walletReady);

  return (
    <div className="space-y-3">
      {/* Method selector */}
      <div>
        <label className="text-xs text-zinc-400 block mb-1">Method</label>
        <select
          value={selectedIdx}
          onChange={(e) => handleMethodChange(Number(e.target.value))}
          className="w-full px-2 py-1.5 rounded bg-zinc-800 text-zinc-200 text-xs border border-zinc-700 focus:border-emerald-500 focus:outline-none"
        >
          <optgroup label="Queries">
            {methods.map((m, i) =>
              m.kind === "query" ? (
                <option key={i} value={i}>
                  {m.methodName}
                </option>
              ) : null,
            )}
          </optgroup>
          <optgroup label="Commands">
            {methods.map((m, i) =>
              m.kind === "command" ? (
                <option key={i} value={i}>
                  {m.methodName}
                  {INTERNAL_METHODS.has(m.methodName) ? " (internal)" : ""}
                </option>
              ) : null,
            )}
          </optgroup>
        </select>
      </div>

      {/* Internal method warning */}
      {isInternal && (
        <div className="text-xs text-amber-400 bg-amber-900/20 rounded px-2 py-1">
          This method is internal (self-call only). Calling it externally will likely fail.
        </div>
      )}

      {/* Parameters */}
      {selected && selected.args.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 font-medium">Parameters</div>
          {selected.args.map((arg) => (
            <TypedInput
              key={`${selectedIdx}-${arg.name}`}
              typeDef={arg.typeDef}
              value={argValues[arg.name]}
              onChange={(v) => setArgValues((prev) => ({ ...prev, [arg.name]: v }))}
              label={arg.name}
              resolveType={sails ? (name: string) => { try { return sails.getTypeDef(name); } catch { return null; } } : undefined}
            />
          ))}
        </div>
      ) : selected ? (
        <div className="text-xs text-zinc-500">No parameters</div>
      ) : null}

      {/* Return type */}
      {selected && (
        <div className="text-xs text-zinc-500">
          Returns: <span className="text-zinc-400">{getTypeLabel(selected.returnTypeDef)}</span>
        </div>
      )}

      {/* Execute button */}
      {needsWallet && !walletReady && (
        <p className="text-xs text-zinc-500">Connect wallet to send transactions.</p>
      )}
      <button
        onClick={handleExecute}
        disabled={!canExecute || status === "loading"}
        className={`w-full py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed ${
          selected?.kind === "query"
            ? "bg-blue-600 hover:bg-blue-500 text-white"
            : "bg-emerald-600 hover:bg-emerald-500 text-white"
        }`}
      >
        {status === "loading"
          ? "Executing..."
          : selected?.kind === "query"
            ? "Call Query"
            : "Send Transaction"}
      </button>

      {/* Result */}
      {result && (
        <div
          className={`rounded p-2 text-xs overflow-x-auto max-h-48 ${
            status === "error"
              ? "bg-red-900/20 text-red-300"
              : "bg-zinc-950 text-zinc-300"
          }`}
        >
          <pre className="font-mono whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </div>
  );
}
