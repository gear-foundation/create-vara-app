import { useState } from "react";
import { useChainApi, useWallet } from "@/providers/chain-provider";
import {
  txIncrement,
  txSendMessage,
  txSchedulePing,
} from "@/lib/sails-client";

// ADD YOUR ACTION BUTTONS HERE (copy one of the patterns below)

type TxPhase = "idle" | "signing" | "submitted" | "confirmed" | "error";

function ActionCard({
  title,
  children,
  primary,
}: {
  title: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-4 ${primary ? "bg-indigo-900/30 border border-indigo-700/50" : "bg-slate-700/30"}`}
    >
      <h3 className="text-sm font-medium text-slate-300 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function TxStatus({ phase, error }: { phase: TxPhase; error: string | null }) {
  if (phase === "idle") return null;
  if (phase === "signing")
    return (
      <p className="text-xs text-amber-400 mt-2">Waiting for signature...</p>
    );
  if (phase === "submitted")
    return <p className="text-xs text-indigo-400 mt-2">Submitted...</p>;
  if (phase === "confirmed")
    return <p className="text-xs text-green-400 mt-2">Confirmed!</p>;
  if (phase === "error")
    return <p className="text-xs text-red-400 mt-2">{error}</p>;
  return null;
}

export function ActionsPanel({
  onTxSuccess,
}: {
  onTxSuccess: () => void;
}) {
  const { api, apiStatus } = useChainApi();
  const { account, signer, walletStatus } = useWallet();
  const disabled =
    !api || apiStatus !== "ready" || walletStatus !== "connected" || !account;

  const disabledReason = !api
    ? "API not ready"
    : walletStatus !== "connected"
      ? "Connect wallet first"
      : "";

  // Increment
  const [incPhase, setIncPhase] = useState<TxPhase>("idle");
  const [incError, setIncError] = useState<string | null>(null);

  async function handleIncrement() {
    if (!api || !account) return;
    setIncPhase("signing");
    setIncError(null);
    try {
      setIncPhase("submitted");
      await txIncrement(api, account.address, signer);
      setIncPhase("confirmed");
      onTxSuccess();
      setTimeout(() => setIncPhase("idle"), 3000);
    } catch (err) {
      setIncPhase("error");
      setIncError(err instanceof Error ? err.message : "Transaction failed");
    }
  }

  // Send Message
  const [msgPhase, setMsgPhase] = useState<TxPhase>("idle");
  const [msgError, setMsgError] = useState<string | null>(null);
  const [msgText, setMsgText] = useState("");
  const [msgValidation, setMsgValidation] = useState<string | null>(null);

  async function handleSendMessage() {
    if (!api || !account) return;
    if (!msgText.trim()) {
      setMsgValidation("Enter a message");
      return;
    }
    if (msgText.length > 256) {
      setMsgValidation("Max 256 characters");
      return;
    }
    setMsgValidation(null);
    setMsgPhase("signing");
    setMsgError(null);
    try {
      setMsgPhase("submitted");
      await txSendMessage(api, account.address, msgText, signer);
      setMsgPhase("confirmed");
      setMsgText("");
      onTxSuccess();
      setTimeout(() => setMsgPhase("idle"), 3000);
    } catch (err) {
      setMsgPhase("error");
      setMsgError(err instanceof Error ? err.message : "Transaction failed");
    }
  }

  // Schedule Ping
  const [pingPhase, setPingPhase] = useState<TxPhase>("idle");
  const [pingError, setPingError] = useState<string | null>(null);
  const [pingDelay, setPingDelay] = useState(5);
  const [pingValidation, setPingValidation] = useState<string | null>(null);

  async function handleSchedulePing() {
    if (!api || !account) return;
    if (pingDelay < 1) {
      setPingValidation("Must be at least 1 block");
      return;
    }
    setPingValidation(null);
    setPingPhase("signing");
    setPingError(null);
    try {
      setPingPhase("submitted");
      await txSchedulePing(api, account.address, pingDelay, signer);
      setPingPhase("confirmed");
      onTxSuccess();
      setTimeout(() => setPingPhase("idle"), 3000);
    } catch (err) {
      setPingPhase("error");
      setPingError(err instanceof Error ? err.message : "Transaction failed");
    }
  }

  const busy =
    incPhase === "signing" ||
    incPhase === "submitted" ||
    msgPhase === "signing" ||
    msgPhase === "submitted" ||
    pingPhase === "signing" ||
    pingPhase === "submitted";

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h2 className="text-lg font-semibold text-slate-200 mb-3">Actions</h2>

      {!account && (
        <p className="text-sm text-slate-500 mb-3">
          Connect your wallet to interact with the program.
        </p>
      )}

      <div className="space-y-3">
        <ActionCard title="Increment Counter" primary>
          <button
            onClick={handleIncrement}
            disabled={disabled || busy}
            title={disabledReason}
            className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {account ? "Increment" : "Connect wallet first"}
          </button>
          <TxStatus phase={incPhase} error={incError} />
        </ActionCard>

        <ActionCard title="Send Message">
          <div className="flex gap-2">
            <input
              type="text"
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              maxLength={256}
              placeholder="Enter a message..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-700 text-slate-200 text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={disabled || busy}
              className="px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm disabled:opacity-40"
            >
              Send
            </button>
          </div>
          {msgValidation && (
            <p className="text-xs text-amber-400 mt-1">{msgValidation}</p>
          )}
          <TxStatus phase={msgPhase} error={msgError} />
        </ActionCard>

        <ActionCard title="Schedule Ping">
          <div className="flex gap-2 items-center">
            <label className="text-xs text-slate-400">Delay (blocks):</label>
            <input
              type="number"
              value={pingDelay}
              onChange={(e) => setPingDelay(Number(e.target.value))}
              min={1}
              className="w-20 px-2 py-1.5 rounded-lg bg-slate-700 text-slate-200 text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={handleSchedulePing}
              disabled={disabled || busy}
              className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm disabled:opacity-40"
            >
              Schedule
            </button>
          </div>
          {pingValidation && (
            <p className="text-xs text-amber-400 mt-1">{pingValidation}</p>
          )}
          <TxStatus phase={pingPhase} error={pingError} />
        </ActionCard>
      </div>
    </div>
  );
}
