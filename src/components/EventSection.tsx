import { createSignal, createEffect, Show, For } from "solid-js";
import { EventForm } from "./EventForm";
import { convex } from "../lib/convex";
import { api } from "../../convex/_generated/api";
import { saveEventToFile } from "../lib/event-storage";
import { useEvent } from "../lib/event-context";



export function EventSection() {
  const [isCreatingNew, setIsCreatingNew] = createSignal(false);
  const [isSaving, setIsSaving] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
  const [isCheckingCloud, setIsCheckingCloud] = createSignal(false);
  
  const { selectedEvent, setSelectedEvent, events, setEvents } = useEvent();

  // Load events from Convex
  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const eventsData = await convex.query(api.events.getEvents);
      setEvents(eventsData);
      
      // Preserve local watchPath for currently selected event
      const currentSelected = selectedEvent();
      if (currentSelected) {
        const updatedEvent = eventsData.find(e => e.name === currentSelected.name);
        if (updatedEvent) {
          // Merge cloud data with local watchPath
          const mergedEvent = {
            ...updatedEvent,
            watchPath: currentSelected.watchPath // Keep local path
          };
          setSelectedEvent(mergedEvent);
        }
      } else if (eventsData.length > 0) {
        // If no event is selected but events exist, select the first one
        setSelectedEvent(eventsData[0]);
      }
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load events on component mount
  createEffect(() => {
    loadEvents();
  });

  const handleSaveEvent = async (data: {
    eventName: string;
    emailSubject: string;
    emailBody: string;
    smsMessage: string;
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    disclaimerEnabled?: boolean;
    disclaimerMessage?: string;
    disclaimerMandatory?: boolean;
    surveyEnabled?: boolean;
    surveyQuestions?: any[];
    watchPath?: string;
  }) => {
    setIsSaving(true);
    try {
      const eventData = {
        name: data.eventName,
        emailSubject: data.emailSubject,
        emailBody: data.emailBody,
        smsMessage: data.smsMessage,
        emailEnabled: data.emailEnabled ?? true,
        smsEnabled: data.smsEnabled ?? true,
        disclaimerEnabled: data.disclaimerEnabled ?? false,
        disclaimerMessage: data.disclaimerMessage || "",
        disclaimerMandatory: data.disclaimerMandatory ?? false,
        surveyEnabled: data.surveyEnabled ?? false,
        surveyQuestions: data.surveyQuestions || [],
        watchPath: data.watchPath,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Check if updating existing event or creating new
      const existingEvent = events().find(e => e.name === data.eventName);
      
      if (existingEvent) {
        // Update existing event (exclude watchPath from cloud sync)
        await convex.mutation(api.events.updateEvent, {
          name: data.eventName,
          emailSubject: data.emailSubject,
          emailBody: data.emailBody,
          smsMessage: data.smsMessage,
          emailEnabled: data.emailEnabled ?? true,
          smsEnabled: data.smsEnabled ?? true,
          disclaimerEnabled: data.disclaimerEnabled ?? false,
          disclaimerMessage: data.disclaimerMessage || "",
          disclaimerMandatory: data.disclaimerMandatory ?? false,
          surveyEnabled: data.surveyEnabled ?? false,
          surveyQuestions: data.surveyQuestions || [],
          // watchPath: data.watchPath, // Excluded - keep local only
        });
      } else {
        // Create new event (exclude watchPath from cloud sync)
        await convex.mutation(api.events.createEvent, {
          name: data.eventName,
          emailSubject: data.emailSubject,
          emailBody: data.emailBody,
          smsMessage: data.smsMessage,
          emailEnabled: data.emailEnabled ?? true,
          smsEnabled: data.smsEnabled ?? true,
          disclaimerEnabled: data.disclaimerEnabled ?? false,
          disclaimerMessage: data.disclaimerMessage || "",
          disclaimerMandatory: data.disclaimerMandatory ?? false,
          surveyEnabled: data.surveyEnabled ?? false,
          surveyQuestions: data.surveyQuestions || [],
          // watchPath: data.watchPath, // Excluded - keep local only
        });
      }

      // Save to local file
      try {
        await saveEventToFile(eventData);
      } catch (fileError) {
        console.warn("Failed to save event to local file:", fileError);
      }

      // Reload events and select the saved event
      await loadEvents();
      const updatedEvent = events().find(e => e.name === data.eventName);
      if (updatedEvent) {
        // Preserve the local watchPath that was just saved
        const eventWithLocalPath = {
          ...updatedEvent,
          watchPath: data.watchPath
        };
        setSelectedEvent(eventWithLocalPath);
      }
      
      setIsCreatingNew(false);
    } catch (error) {
      console.error("Error saving event:", error);
      alert(`Failed to save event: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    const current = selectedEvent();
    if (!current) return;

    const confirmed = confirm(`Are you sure you want to delete the event "${current.name}"?`);
    if (!confirmed) return;

    try {
      await convex.mutation(api.events.deleteEvent, { name: current.name });
      await loadEvents();
      
      // Select first event if available, otherwise clear selection
      const remainingEvents = events();
      setSelectedEvent(remainingEvents.length > 0 ? remainingEvents[0] : null);
    } catch (error) {
      console.error("Error deleting event:", error);
      alert(`Failed to delete event: ${error}`);
    }
  };

  const startCreatingNew = () => {
    setSelectedEvent(null);
    setIsCreatingNew(true);
  };

  const cancelCreating = () => {
    setIsCreatingNew(false);
    // Select first event if available
    const eventsList = events();
    if (eventsList.length > 0) {
      setSelectedEvent(eventsList[0]);
    }
  };

  const handleCheckCloud = async () => {
    setIsCheckingCloud(true);
    try {
      console.log('🔄 Checking cloud for latest events...');
      
      // Fetch fresh events from Convex
      const eventsData = await convex.query(api.events.getEvents);
      console.log('📦 Fetched events from cloud:', eventsData);
      
      setEvents(eventsData);
      
      // Update selected event if it exists in the new data
      const currentSelected = selectedEvent();
      if (currentSelected) {
        const updatedEvent = eventsData.find(e => e.name === currentSelected.name);
        if (updatedEvent) {
          // Preserve local watchPath, sync everything else from cloud
          const syncedEvent = {
            ...updatedEvent,
            watchPath: currentSelected.watchPath // Keep local path
          };
          console.log('🔄 Updating selected event with cloud data (preserving local path):', syncedEvent);
          setSelectedEvent(syncedEvent);
        } else {
          console.log('⚠️ Selected event no longer exists in cloud, clearing selection');
          setSelectedEvent(null);
        }
      } else if (eventsData.length > 0) {
        // If no event is selected but events exist, select the first one
        // For new selections, preserve any existing local path
        const firstEvent = eventsData[0];
        console.log('📌 No event selected, selecting first available:', firstEvent);
        setSelectedEvent(firstEvent);
      }
      
      console.log('✅ Successfully synced events from cloud');
      alert(`✅ Synced ${eventsData.length} events from cloud`);
    } catch (error) {
      console.error('❌ Failed to check cloud:', error);
      alert('Failed to sync from cloud. Please check your internet connection.');
    } finally {
      setIsCheckingCloud(false);
    }
  };

  return (
    <div>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0; color: #333;">Event Settings</h3>
        <div style="display: flex; gap: 8px;">
          <button
            onClick={handleCheckCloud}
            disabled={isLoading() || isSaving() || isCheckingCloud()}
            style={`padding: 6px 12px; background: ${isCheckingCloud() ? '#9ca3af' : '#3b82f6'}; color: white; border: none; border-radius: 4px; cursor: ${isCheckingCloud() ? 'not-allowed' : 'pointer'}; font-size: 12px; font-weight: 500;`}
            title="Sync latest events from cloud"
          >
            {isCheckingCloud() ? '🔄 Checking...' : '☁️ Check Cloud'}
          </button>
          <button
            onClick={startCreatingNew}
            disabled={isLoading() || isSaving() || isCheckingCloud()}
            style="padding: 6px 12px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;"
          >
            + New Event
          </button>
        </div>
      </div>

      <Show when={isLoading()}>
        <div style="text-align: center; padding: 20px; color: #666;">
          Loading events...
        </div>
      </Show>

      <Show when={!isLoading()}>
        {/* Event Selector */}
        <Show when={!isCreatingNew() && events().length > 0}>
          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 4px;">
              Select Event:
            </label>
            <div style="display: flex; gap: 8px;">
              <select
                value={selectedEvent()?.name || ""}
                onChange={(e) => {
                  const event = events().find(ev => ev.name === e.currentTarget.value);
                  setSelectedEvent(event || null);
                }}
                style="flex: 1; padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px;"
              >
                <For each={events()}>
                  {(event) => (
                    <option value={event.name}>{event.name}</option>
                  )}
                </For>
              </select>
              <button
                onClick={handleDeleteEvent}
                disabled={!selectedEvent()}
                style="padding: 8px 12px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;"
                title="Delete Event"
              >
                Delete
              </button>
            </div>
          </div>
        </Show>

        {/* Event Form */}
        <Show when={isCreatingNew() || selectedEvent()}>
          <EventForm
            eventName={isCreatingNew() ? "" : selectedEvent()?.name || ""}
            emailSubject={isCreatingNew() ? "Image from One Chance Media" : selectedEvent()?.emailSubject || ""}
            emailBody={isCreatingNew() ? "Please find the attached image." : selectedEvent()?.emailBody || ""}
            smsMessage={isCreatingNew() ? "Here's your image!" : selectedEvent()?.smsMessage || ""}
            emailEnabled={isCreatingNew() ? true : selectedEvent()?.emailEnabled ?? true}
            smsEnabled={isCreatingNew() ? true : selectedEvent()?.smsEnabled ?? true}
            disclaimerEnabled={isCreatingNew() ? false : selectedEvent()?.disclaimerEnabled ?? false}
            disclaimerMessage={isCreatingNew() ? "" : selectedEvent()?.disclaimerMessage || ""}
            disclaimerMandatory={isCreatingNew() ? false : selectedEvent()?.disclaimerMandatory ?? false}
            surveyEnabled={isCreatingNew() ? false : selectedEvent()?.surveyEnabled ?? false}
            surveyQuestions={isCreatingNew() ? [] : selectedEvent()?.surveyQuestions || []}
            watchPath={isCreatingNew() ? "" : selectedEvent()?.watchPath || ""}
            onSave={handleSaveEvent}
            isSaving={isSaving()}
          />
          
          <Show when={isCreatingNew()}>
            <button
              onClick={cancelCreating}
              disabled={isSaving()}
              style="width: 100%; padding: 8px; margin-top: 8px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;"
            >
              Cancel
            </button>
          </Show>
        </Show>

        {/* Empty State */}
        <Show when={!isCreatingNew() && events().length === 0}>
          <div style="text-align: center; padding: 40px 20px; color: #666;">
            <div style="font-size: 48px; margin-bottom: 16px;">📅</div>
            <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">No Events Created</div>
            <div style="font-size: 14px; margin-bottom: 16px;">Create your first event to get started</div>
            <button
              onClick={startCreatingNew}
              style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;"
            >
              Create Event
            </button>
          </div>
        </Show>
      </Show>
    </div>
  );
}