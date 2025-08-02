import { createContext, useContext, createSignal, createEffect, JSX } from "solid-js";

interface Event {
  _id?: string;
  name: string;
  emailSubject: string;
  emailBody: string;
  smsMessage: string;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  disclaimerEnabled?: boolean;
  disclaimerMessage?: string;
  watchPath?: string;
  createdAt: number;
  updatedAt: number;
}

interface EventContextType {
  selectedEvent: () => Event | null;
  setSelectedEvent: (event: Event | null) => void;
  events: () => Event[];
  setEvents: (events: Event[]) => void;
}

const EventContext = createContext<EventContextType>();

export function EventProvider(props: { children: JSX.Element }) {
  // Load persisted selected event from localStorage
  const loadPersistedEvent = (): Event | null => {
    try {
      const stored = localStorage.getItem('selectedEvent');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const [selectedEvent, setSelectedEvent] = createSignal<Event | null>(loadPersistedEvent());
  const [events, setEvents] = createSignal<Event[]>([]);

  // Persist selected event to localStorage
  createEffect(() => {
    const event = selectedEvent();
    if (event) {
      localStorage.setItem('selectedEvent', JSON.stringify(event));
    } else {
      localStorage.removeItem('selectedEvent');
    }
  });

  const value: EventContextType = {
    selectedEvent,
    setSelectedEvent,
    events,
    setEvents,
  };

  return (
    <EventContext.Provider value={value}>
      {props.children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEvent must be used within EventProvider");
  }
  return context;
}