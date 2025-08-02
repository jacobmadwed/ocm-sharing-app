import { BaseDirectory, readTextFile, writeTextFile, exists, mkdir } from "@tauri-apps/plugin-fs";

export interface EventData {
  name: string;
  emailSubject: string;
  emailBody: string;
  smsMessage: string;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  watchPath?: string;
  createdAt: number;
  updatedAt: number;
}

// Ensure app data directory exists
async function ensureAppDataDirectory(): Promise<void> {
  try {
    // Create the app data directory (this should work with new permissions)
    await mkdir("", { baseDir: BaseDirectory.AppData, recursive: true });
    console.log("App data directory ensured");
  } catch (error) {
    // Directory might already exist, which is fine
    console.log("App data directory check:", error);
  }
}

// Save event to local JSON file (directly in AppData directory)
export async function saveEventToFile(event: EventData): Promise<void> {
  try {
    // Ensure directory exists first
    await ensureAppDataDirectory();
    
    const filename = `event_${event.name}.json`;
    
    await writeTextFile(filename, JSON.stringify(event, null, 2), {
      baseDir: BaseDirectory.AppData,
    });
    
    console.log(`Event "${event.name}" saved to file: ${filename}`);
  } catch (error) {
    console.error(`Error saving event "${event.name}" to file:`, error);
    throw error;
  }
}

// Load event from local JSON file
export async function loadEventFromFile(eventName: string): Promise<EventData | null> {
  try {
    const filename = `event_${eventName}.json`;
    
    const fileExists = await exists(filename, { baseDir: BaseDirectory.AppData });
    if (!fileExists) {
      return null;
    }
    
    const content = await readTextFile(filename, { baseDir: BaseDirectory.AppData });
    return JSON.parse(content) as EventData;
  } catch (error) {
    console.error(`Error loading event "${eventName}" from file:`, error);
    return null;
  }
}

// Delete event file
export async function deleteEventFile(eventName: string): Promise<void> {
  try {
    const filename = `event_${eventName}.json`;
    
    // For now, we'll just log that deletion was requested
    console.log(`Event file deletion requested for "${eventName}": ${filename}`);
    
    // TODO: Implement file deletion when Tauri remove function is available
    // await remove(filename, { baseDir: BaseDirectory.AppData });
  } catch (error) {
    console.error(`Error deleting event file "${eventName}":`, error);
    throw error;
  }
}

// List all event files
export async function listEventFiles(): Promise<string[]> {
  try {
    // For now, we'll return an empty array since we can't list directories easily
    console.log("Event file listing not yet implemented");
    return [];
  } catch (error) {
    console.error("Error listing event files:", error);
    return [];
  }
}