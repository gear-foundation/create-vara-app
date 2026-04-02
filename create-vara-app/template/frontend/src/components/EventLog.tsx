import { motion, AnimatePresence } from "framer-motion";
import { Lightning, Trash } from "@phosphor-icons/react";
import { useEvents, type ContractEvent } from "@/providers/events-provider";

function formatValue(val: unknown): string {
  if (typeof val === "string") {
    // Truncate long hex addresses
    if (val.startsWith("0x") && val.length > 20) {
      return `${val.slice(0, 6)}...${val.slice(-4)}`;
    }
    return val.length > 60 ? val.slice(0, 57) + "..." : val;
  }
  if (typeof val === "bigint") return val.toString();
  if (typeof val === "number") return val.toLocaleString();
  return String(val);
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function EventRow({ event }: { event: ContractEvent }) {
  const fields = Object.entries(event.data)
    .map(([k, v]) => `${k}: ${formatValue(v)}`)
    .join(", ");

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex items-start gap-2 py-1.5 text-xs border-b border-zinc-800/30 last:border-0 min-w-0"
    >
      <span className="text-zinc-600 font-mono shrink-0">{formatTime(event.timestamp)}</span>
      <span className="text-emerald-400 font-medium shrink-0">{event.name}</span>
      <span className="text-zinc-400 truncate">{fields}</span>
    </motion.div>
  );
}

export function EventLog() {
  const { events, status, clearEvents } = useEvents();

  if (status === "idle" || status === "subscribing") {
    return (
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl py-3 px-4 flex items-center gap-2">
        <Lightning size={14} className="text-zinc-600" />
        <span className="text-xs text-zinc-500">
          {status === "subscribing" ? "Connecting to events..." : "Waiting for connection..."}
        </span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="bg-zinc-900/30 border border-red-500/20 rounded-xl py-3 px-4 flex items-center gap-2">
        <Lightning size={14} className="text-red-400" />
        <span className="text-xs text-red-400">Event subscription failed</span>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <Lightning size={14} weight="fill" className="text-emerald-400" />
          <span className="text-xs font-medium text-zinc-400">Events</span>
          {events.length > 0 && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full">
              {events.length}
            </span>
          )}
        </div>
        {events.length > 0 && (
          <button
            onClick={clearEvents}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
            title="Clear events"
          >
            <Trash size={12} />
          </button>
        )}
      </div>

      <div className="px-4 py-1 max-h-48 overflow-y-auto">
        {events.length === 0 ? (
          <div className="py-3 text-center">
            <span className="text-xs text-zinc-600">Listening for events... Send a transaction to see them here.</span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {events.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
