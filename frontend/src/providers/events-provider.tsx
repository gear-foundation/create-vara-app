import { createContext, useContext, type ReactNode } from "react";

type EventsState = {
  events: never[];
  status: "idle";
  clearEvents: () => void;
};

const EventsContext = createContext<EventsState>({
  events: [],
  status: "idle",
  clearEvents: () => {},
});

export function EventsProvider({ children }: { children: ReactNode }) {
  return (
    <EventsContext.Provider value={{ events: [], status: "idle", clearEvents: () => {} }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  return useContext(EventsContext);
}
