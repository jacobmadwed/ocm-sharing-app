import { createSignal, Show } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { EventSection } from "./EventSection";
import { DeliveryLogs } from "./DeliveryLogs";
import { useEvent } from "../lib/event-context";

interface AdminGearProps {
  class?: string;
  onFolderSelected: (path: string) => void;
}

export function AdminGear(props: AdminGearProps) {
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal<"folder" | "events" | "logs">("folder");
  
  const { selectedEvent } = useEvent();

  const selectFolder = async () => {
    try {
      const result = await open({
        directory: true,
        multiple: false,
        title: "Select Image Folder"
      });
      
      if (result && typeof result === 'string') {
        props.onFolderSelected(result);
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error("Error selecting folder:", error);
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
          <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0; width: 75vw; height: 60vh; box-shadow: 0 10px 25px rgba(0,0,0,0.15); z-index: 50; overflow: hidden; display: flex; flex-direction: column;">
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
                onClick={() => setActiveTab("folder")}
                style={`padding: 12px 16px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 500; border-bottom: 2px solid ${activeTab() === "folder" ? "#3b82f6" : "transparent"}; color: ${activeTab() === "folder" ? "#3b82f6" : "#6b7280"};`}
              >
                📁 Folder Settings
              </button>
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
            </div>
            
            {/* Tab Content */}
            <div style="padding: 16px 5% 120px 5%; width: 90%; overflow-y: auto; flex: 1; min-height: 0;">
              {activeTab() === "folder" && (
                <div>
                  <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px;">
                    Select a folder to watch for images
                  </p>
                  
                  <button
                    onClick={selectFolder}
                    style="width: 100%; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;"
                  >
                    Choose Folder
                  </button>
                </div>
              )}
              
              {activeTab() === "events" && (
                <EventSection />
              )}
              
              {activeTab() === "logs" && (
                <DeliveryLogs />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}