import { useState } from "react";
import { motion } from "framer-motion";
import { Terminal, CaretDown, Copy, Check } from "@phosphor-icons/react";
import { getIdlText } from "@/lib/sails-client";
import { ManualCallTab } from "@/components/ManualCallTab";

export function DebugPanel({ onTxSuccess }: { onTxSuccess?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"idl" | "call">("idl");
  const [copied, setCopied] = useState(false);

  const idlText = getIdlText();

  function handleCopy() {
    navigator.clipboard.writeText(idlText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal size={16} weight="duotone" />
          <span className="font-medium">Debug</span>
        </div>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ type: "spring" as const, stiffness: 200, damping: 25 }}
        >
          <CaretDown size={14} weight="bold" />
        </motion.span>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-5 border-t border-zinc-800/50">
            <div className="flex gap-2 mt-4 mb-3">
              <button
                onClick={() => setTab("idl")}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  tab === "idl"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                IDL
              </button>
              <button
                onClick={() => setTab("call")}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  tab === "call"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                Manual Call
              </button>
            </div>

            {tab === "idl" && (
              <div>
                <div className="flex justify-end mb-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-300 transition-colors active:scale-[0.95]"
                  >
                    {copied ? (
                      <Check size={12} weight="bold" className="text-emerald-400" />
                    ) : (
                      <Copy size={12} weight="duotone" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="bg-zinc-950 rounded-xl p-4 text-xs text-zinc-400 overflow-x-auto max-h-80 font-mono leading-relaxed border border-zinc-800/30">
                  {idlText}
                </pre>
              </div>
            )}

            {tab === "call" && (
              <ManualCallTab onTxSuccess={onTxSuccess} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
