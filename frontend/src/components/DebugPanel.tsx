import { useState } from "react";
import { getIdlText } from "@/lib/sails-client";

export function DebugPanel() {
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
    <div className="bg-slate-800 rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-400 hover:text-slate-300"
      >
        <span className="font-medium">Debug</span>
        <span className="text-xs">{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setTab("idl")}
              className={`px-3 py-1 text-xs rounded ${tab === "idl" ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400"}`}
            >
              IDL
            </button>
            <button
              onClick={() => setTab("call")}
              className={`px-3 py-1 text-xs rounded ${tab === "call" ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400"}`}
            >
              Call
            </button>
          </div>

          {tab === "idl" && (
            <div>
              <div className="flex justify-end mb-1">
                <button
                  onClick={handleCopy}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="bg-slate-900 rounded p-3 text-xs text-slate-300 overflow-x-auto max-h-96 font-mono">
                {idlText}
              </pre>
            </div>
          )}

          {tab === "call" && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                Manual method caller. Use the IDL above to understand available
                methods. For full functionality, use the Actions panel or the
                generated Sails client.
              </p>
              <p className="text-xs text-slate-600 italic">
                Coming soon: dropdown method selector with JSON args input.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
