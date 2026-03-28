import { useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { StatePanel } from "@/components/StatePanel";
import { ActionsPanel } from "@/components/ActionsPanel";
import { EventLog } from "@/components/EventLog";
import { DebugPanel } from "@/components/DebugPanel";

export function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTxSuccess = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: read */}
          <div className="space-y-6">
            <StatePanel refreshTrigger={refreshTrigger} />
            <EventLog />
          </div>

          {/* Right column: write */}
          <div className="space-y-6">
            <ActionsPanel onTxSuccess={handleTxSuccess} />
            <DebugPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
