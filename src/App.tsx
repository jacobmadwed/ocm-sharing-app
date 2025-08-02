import { createSignal, createEffect } from "solid-js";
import { AdminGear } from "./components/AdminGear";
import { ImageGrid } from "./components/ImageGrid";
import { EventProvider, useEvent } from "./lib/event-context";
import "./App.css";

function AppContent() {
  const [selectedFolder, setSelectedFolder] = createSignal("");
  const [fullscreen, setFullscreen] = createSignal(false);
  const [clickCount, setClickCount] = createSignal(0);
  const [clickTimeout, setClickTimeout] = createSignal<NodeJS.Timeout | null>(null);
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

  const handleTripleClick = () => {
    setClickCount(prev => {
      const newCount = prev + 1;
      
      const currentTimeout = clickTimeout();
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }
      
      if (newCount === 3) {
        setFullscreen(!fullscreen());
        setClickTimeout(null);
        return 0;
      }
      
      const newTimeout = setTimeout(() => setClickCount(0), 500);
      setClickTimeout(newTimeout);
      return newCount;
    });
  };

  return (
    <div class={`min-h-screen bg-background text-foreground ${fullscreen() ? 'fixed inset-0 z-50 w-screen h-screen overflow-hidden' : ''}`}>
      <div 
        class="absolute top-0 left-0 w-16 h-16 cursor-pointer z-50 select-none" 
        onClick={handleTripleClick}
        title="Triple click to toggle fullscreen"
        style="user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;"
      />
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