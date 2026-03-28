import { useState } from "react";

type EventEntry = {
  type: string;
  data: Record<string, unknown>;
  timestamp: Date;
};

const EVENT_COLORS: Record<string, string> = {
  Incremented: "bg-indigo-500",
  MessageSent: "bg-green-500",
  PingScheduled: "bg-amber-500",
  PingReceived: "bg-amber-400",
};

const MAX_EVENTS = 50;

export function EventLog() {
  const [events] = useState<EventEntry[]>([]);

  // Event subscription would go here when connected to a live program.
  // For now, events are shown when the program is deployed and transactions are sent.

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-200">Events</h2>
        {events.length > 0 && (
          <span className="text-xs text-slate-500">
            {events.length}/{MAX_EVENTS}
          </span>
        )}
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-slate-500">
          No events yet. Events will appear here when transactions are
          processed.
        </p>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {events.map((evt, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs bg-slate-700/30 rounded px-2 py-1.5"
            >
              <span
                className={`px-1.5 py-0.5 rounded text-white text-[10px] font-medium ${EVENT_COLORS[evt.type] ?? "bg-slate-500"}`}
              >
                {evt.type}
              </span>
              <span className="text-slate-400 truncate flex-1">
                {JSON.stringify(evt.data)}
              </span>
              <span className="text-slate-600 whitespace-nowrap">
                {evt.timestamp.toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
