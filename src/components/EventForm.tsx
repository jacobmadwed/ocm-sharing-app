import { createSignal } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";

interface EventFormProps {
  eventName: string;
  emailSubject: string;
  emailBody: string;
  smsMessage: string;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  watchPath?: string;
  onSave: (data: {
    eventName: string;
    emailSubject: string;
    emailBody: string;
    smsMessage: string;
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    watchPath?: string;
  }) => void;
  isSaving?: boolean;
}

export function EventForm(props: EventFormProps) {
  const [eventName, setEventName] = createSignal(props.eventName);
  const [emailSubject, setEmailSubject] = createSignal(props.emailSubject);
  const [emailBody, setEmailBody] = createSignal(props.emailBody);
  const [smsMessage, setSmsMessage] = createSignal(props.smsMessage);
  const [emailEnabled, setEmailEnabled] = createSignal(props.emailEnabled ?? true);
  const [smsEnabled, setSmsEnabled] = createSignal(props.smsEnabled ?? true);
  const [watchPath, setWatchPath] = createSignal(props.watchPath || "");

  // Update signals when props change
  (() => {
    setEventName(props.eventName);
    setEmailSubject(props.emailSubject);
    setEmailBody(props.emailBody);
    setSmsMessage(props.smsMessage);
    setEmailEnabled(props.emailEnabled ?? true);
    setSmsEnabled(props.smsEnabled ?? true);
    setWatchPath(props.watchPath || "");
  })();

  const selectFolder = async () => {
    try {
      const result = await open({
        directory: true,
        multiple: false,
        title: "Select Watch Folder for Event"
      });
      
      if (result && typeof result === 'string') {
        setWatchPath(result);
      }
    } catch (error) {
      console.error("Error selecting folder:", error);
    }
  };

  const handleSave = () => {
    const name = eventName().trim();
    if (!name) {
      alert("Please enter an event name");
      return;
    }

    props.onSave({
      eventName: name,
      emailSubject: emailSubject(),
      emailBody: emailBody(),
      smsMessage: smsMessage(),
      emailEnabled: emailEnabled(),
      smsEnabled: smsEnabled(),
      watchPath: watchPath() || undefined,
    });
  };

  return (
    <div>
      {/* Event Name */}
      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 4px;">
          Event Name:
        </label>
        <input
          type="text"
          placeholder="Enter event name..."
          value={eventName()}
          onInput={(e) => setEventName(e.currentTarget.value)}
          disabled={props.isSaving}
          style="width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px;"
        />
      </div>

      {/* Email Toggle and Subject */}
      <div style="margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input
              type="checkbox"
              checked={emailEnabled()}
              onChange={(e) => setEmailEnabled(e.currentTarget.checked)}
              disabled={props.isSaving}
              style="width: 16px; height: 16px;"
            />
            <span style="font-size: 14px; font-weight: 500; color: #333;">
              Enable Email
            </span>
          </label>
        </div>
        <label style="display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 4px;">
          Email Subject:
        </label>
        <input
          type="text"
          placeholder="Enter email subject..."
          value={emailSubject()}
          onInput={(e) => setEmailSubject(e.currentTarget.value)}
          disabled={props.isSaving || !emailEnabled()}
          style={`width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; ${!emailEnabled() ? 'background: #f3f4f6; color: #9ca3af;' : ''}`}
        />
      </div>

      {/* Email Body */}
      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 4px;">
          Email Body:
        </label>
        <textarea
          placeholder="Enter email message..."
          value={emailBody()}
          onInput={(e) => setEmailBody(e.currentTarget.value)}
          disabled={props.isSaving || !emailEnabled()}
          rows={4}
          style={`width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; resize: vertical; min-height: 80px; ${!emailEnabled() ? 'background: #f3f4f6; color: #9ca3af;' : ''}`}
        />
      </div>

      {/* SMS Toggle and Message */}
      <div style="margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input
              type="checkbox"
              checked={smsEnabled()}
              onChange={(e) => setSmsEnabled(e.currentTarget.checked)}
              disabled={props.isSaving}
              style="width: 16px; height: 16px;"
            />
            <span style="font-size: 14px; font-weight: 500; color: #333;">
              Enable SMS
            </span>
          </label>
        </div>
        <label style="display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 4px;">
          SMS Message:
        </label>
        <textarea
          placeholder="Enter SMS message..."
          value={smsMessage()}
          onInput={(e) => setSmsMessage(e.currentTarget.value)}
          disabled={props.isSaving || !smsEnabled()}
          rows={3}
          style={`width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; resize: vertical; min-height: 60px; ${!smsEnabled() ? 'background: #f3f4f6; color: #9ca3af;' : ''}`}
        />
      </div>

      {/* Watch Folder */}
      <div style="margin-bottom: 20px;">
        <label style="display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 4px;">
          Watch Folder (Optional):
        </label>
        <div style="display: flex; gap: 8px;">
          <input
            type="text"
            placeholder="No folder selected"
            value={watchPath() ? watchPath().split('/').pop() || watchPath() : ""}
            disabled
            style="flex: 1; padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; background: #f9f9f9; color: #666;"
            title={watchPath()}
          />
          <button
            type="button"
            onClick={selectFolder}
            disabled={props.isSaving}
            style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;"
          >
            📁 Select
          </button>
          {watchPath() && (
            <button
              type="button"
              onClick={() => setWatchPath("")}
              disabled={props.isSaving}
              style="padding: 8px 12px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;"
              title="Clear folder"
            >
              ✕
            </button>
          )}
        </div>
        {watchPath() && (
          <div style="font-size: 12px; color: #666; margin-top: 4px;">
            {watchPath()}
          </div>
        )}
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={props.isSaving}
        style="width: 100%; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 100px;"
      >
        {props.isSaving && (
          <div style="width: 16px; height: 16px; border: 2px solid white; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        )}
        {props.isSaving ? "Saving..." : "Save Event"}
      </button>
    </div>
  );
}