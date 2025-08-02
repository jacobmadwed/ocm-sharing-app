import { createSignal, createEffect } from "solid-js";
import { AdminGear } from "./components/AdminGear";
import { ImageGrid } from "./components/ImageGrid";
import { EventProvider, useEvent } from "./lib/event-context";
import "./App.css";

function AppContent() {
  const [selectedFolder, setSelectedFolder] = createSignal("");
  const { selectedEvent } = useEvent();

  // Watch for event changes and update folder automatically
  createEffect(() => {
    const event = selectedEvent();
    if (event?.watchPath) {
      console.log(`Switching to event "${event.name}" watch folder: ${event.watchPath}`);
      setSelectedFolder(event.watchPath);
    }
  });

  // On initial load, check if there's a persisted event with a watchPath
  createEffect(() => {
    // Small delay to ensure localStorage has been read by EventProvider
    setTimeout(() => {
      const event = selectedEvent();
      if (event?.watchPath && !selectedFolder()) {
        console.log(`Loading persisted event "${event.name}" watch folder on startup: ${event.watchPath}`);
        setSelectedFolder(event.watchPath);
      }
    }, 100);
  });

  const handleFolderSelected = (path: string) => {
    setSelectedFolder(path);
  };

  return (
    <div class="min-h-screen bg-background text-foreground">
      <AdminGear onFolderSelected={handleFolderSelected} />
      <ImageGrid watchPath={selectedFolder()} />
    </div>
  );
}

function App() {
  return (
    <EventProvider>
      <AppContent />
    </EventProvider>
  );
}

export default App;
