import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { StatePanel } from "@/components/StatePanel";
import { ActionsPanel } from "@/components/ActionsPanel";
import { EventLog } from "@/components/EventLog";
import { DebugPanel } from "@/components/DebugPanel";
import { EventsProvider } from "@/providers/events-provider";

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 20 },
  },
};

export function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTxSuccess = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <EventsProvider>
      <div className="min-h-[100dvh] flex flex-col">
        <Header />

        <main className="flex-1 px-4 py-8 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6"
          >
            {/* Left column: read (wider) */}
            <div className="space-y-6">
              <motion.div variants={fadeUp}>
                <StatePanel refreshTrigger={refreshTrigger} />
              </motion.div>
              <motion.div variants={fadeUp}>
                <EventLog />
              </motion.div>
            </div>

            {/* Right column: write */}
            <div className="space-y-6">
              <motion.div variants={fadeUp}>
                <ActionsPanel onTxSuccess={handleTxSuccess} />
              </motion.div>
              <motion.div variants={fadeUp}>
                <DebugPanel onTxSuccess={handleTxSuccess} />
              </motion.div>
            </div>
          </motion.div>
        </main>
      </div>
    </EventsProvider>
  );
}
