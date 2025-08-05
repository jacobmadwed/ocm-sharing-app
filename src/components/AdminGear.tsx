import { createSignal, Show } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { EventSection } from "./EventSection";
import { DeliveryLogs } from "./DeliveryLogs";
import { MessageQueue } from "./MessageQueue";
import { useEvent } from "../lib/event-context";
import { createCustomUpdater } from "../lib/custom-updater";

interface AdminGearProps {
  class?: string;
}

export function AdminGear(props: AdminGearProps) {
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal<"events" | "logs" | "queue" | "updates">("events");
  
  const { selectedEvent } = useEvent();
  const { updateStatus, checkForUpdates, installUpdate } = createCustomUpdater();
  const [pendingRelease, setPendingRelease] = createSignal(null);


  const handleCheckForUpdates = async () => {
    const release = await checkForUpdates();
    setPendingRelease(release);
  };

  const handleInstallUpdate = async () => {
    const release = pendingRelease();
    if (release) {
      await installUpdate(release);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        style="position: fixed; top: 16px; right: 16px; padding: 12px; background: #3b82f6; color: white; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.15); cursor: pointer; z-index: 50; border: none;"
        title="Admin Settings"
      >
        <svg
          style="width: 24px; height: 24px;"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* Modal */}
      {isModalOpen() && (
        <>
          {/* Backdrop */}
          <div
            style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 40;"
            onClick={() => setIsModalOpen(false)}
          />
          
          {/* Modal Content - centered */}
          <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0; width: 75vw; height: 90vh; box-shadow: 0 10px 25px rgba(0,0,0,0.15); z-index: 50; overflow: hidden; display: flex; flex-direction: column;">
            {/* Header */}
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 20px 5% 0 5%; width: 90%;">
              <div>
                <h2 style="font-size: 18px; font-weight: 600; color: #111827;">Admin Settings</h2>
                <Show when={selectedEvent()}>
                  <p style="font-size: 12px; color: #10b981; margin: 4px 0 0 0;">
                    Active Event: {selectedEvent()?.name}
                  </p>
                </Show>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style="color: #6b7280; cursor: pointer; border: none; background: none; padding: 4px;"
              >
                <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Tabs */}
            <div style="display: flex; border-bottom: 1px solid #e5e7eb; margin: 16px 5% 0 5%; width: 90%; flex-shrink: 0;">
              <button
                onClick={() => setActiveTab("events")}
                style={`padding: 12px 16px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 500; border-bottom: 2px solid ${activeTab() === "events" ? "#3b82f6" : "transparent"}; color: ${activeTab() === "events" ? "#3b82f6" : "#6b7280"};`}
              >
                📅 Event Settings
              </button>
              <button
                onClick={() => setActiveTab("logs")}
                style={`padding: 12px 16px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 500; border-bottom: 2px solid ${activeTab() === "logs" ? "#3b82f6" : "transparent"}; color: ${activeTab() === "logs" ? "#3b82f6" : "#6b7280"};`}
              >
                📊 Delivery Logs
              </button>
              <button
                onClick={() => setActiveTab("queue")}
                style={`padding: 12px 16px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 500; border-bottom: 2px solid ${activeTab() === "queue" ? "#3b82f6" : "transparent"}; color: ${activeTab() === "queue" ? "#3b82f6" : "#6b7280"};`}
              >
                📬 Message Queue
              </button>
              <button
                onClick={() => setActiveTab("updates")}
                style={`padding: 12px 16px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 500; border-bottom: 2px solid ${activeTab() === "updates" ? "#3b82f6" : "transparent"}; color: ${activeTab() === "updates" ? "#3b82f6" : "#6b7280"};`}
              >
                🔄 Updates
              </button>
            </div>
            
            {/* Tab Content */}
            <div style="padding: 16px 5% 120px 5%; width: 90%; overflow-y: auto; flex: 1; min-height: 0;">
              {activeTab() === "events" && (
                <EventSection />
              )}
              
              {activeTab() === "logs" && (
                <DeliveryLogs />
              )}
              
              {activeTab() === "queue" && (
                <MessageQueue />
              )}
              
              {activeTab() === "updates" && (
                <div>
                  <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px;">
                    Check for and install app updates
                  </p>
                  
                  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                      <span style="font-size: 14px; font-weight: 500; color: #374151;">Current Version:</span>
                      <span style="font-size: 14px; color: #6b7280;">v{updateStatus().currentVersion}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                      <span style="font-size: 14px; font-weight: 500; color: #374151;">Status:</span>
                      <span style={`font-size: 14px; color: ${updateStatus().available ? '#f59e0b' : updateStatus().error ? '#ef4444' : '#10b981'};`}>
                        {updateStatus().checking ? 'Checking...' : 
                         updateStatus().error ? 'Error' :
                         updateStatus().available ? `Update available (v${updateStatus().availableVersion})` : 'Up to date'}
                      </span>
                    </div>
                    <Show when={updateStatus().available && updateStatus().availableVersion}>
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 14px; font-weight: 500; color: #374151;">Available Version:</span>
                        <span style="font-size: 14px; color: #f59e0b;">v{updateStatus().availableVersion}</span>
                      </div>
                    </Show>
                  </div>
                  
                  <Show when={updateStatus().error}>
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
                      <p style="font-size: 14px; color: #dc2626; margin: 0;">
                        {updateStatus().error}
                      </p>
                    </div>
                  </Show>
                  
                  <Show when={updateStatus().releaseNotes}>
                    <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
                      <h4 style="font-size: 14px; font-weight: 500; color: #0369a1; margin: 0 0 8px 0;">Release Notes:</h4>
                      <p style="font-size: 13px; color: #0369a1; margin: 0; white-space: pre-wrap;">
                        {updateStatus().releaseNotes}
                      </p>
                    </div>
                  </Show>
                  
                  <Show when={updateStatus().debugLogs.length > 0}>
                    <div style="background: #fffbeb; border: 1px solid #fed7aa; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
                      <h4 style="font-size: 14px; font-weight: 500; color: #92400e; margin: 0 0 8px 0;">Debug Logs:</h4>
                      <div style="max-height: 150px; overflow-y: auto; font-family: monospace; font-size: 12px; color: #92400e;">
                        {updateStatus().debugLogs.map((log, index) => (
                          <div key={index} style="margin-bottom: 2px;">{log}</div>
                        ))}
                      </div>
                    </div>
                  </Show>
                  
                  <div style="display: flex; gap: 8px;">
                    <button
                      onClick={handleCheckForUpdates}
                      disabled={updateStatus().checking || updateStatus().downloading || updateStatus().installing}
                      style={`flex: 1; padding: 8px 16px; background: ${updateStatus().checking ? '#9ca3af' : '#3b82f6'}; color: white; border: none; border-radius: 6px; cursor: ${updateStatus().checking ? 'not-allowed' : 'pointer'}; font-size: 14px; font-weight: 500;`}
                    >
                      {updateStatus().checking ? 'Checking...' : 'Check for Updates'}
                    </button>
                    
                    <Show when={updateStatus().available}>
                      <button
                        onClick={handleInstallUpdate}
                        disabled={updateStatus().downloading || updateStatus().installing}
                        style={`flex: 1; padding: 8px 16px; background: ${updateStatus().downloading || updateStatus().installing ? '#9ca3af' : '#10b981'}; color: white; border: none; border-radius: 6px; cursor: ${updateStatus().downloading || updateStatus().installing ? 'not-allowed' : 'pointer'}; font-size: 14px; font-weight: 500;`}
                      >
                        {updateStatus().downloading ? 'Downloading...' : 
                         updateStatus().installing ? 'Installing...' : 
                         'Install Update'}
                      </button>
                    </Show>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}