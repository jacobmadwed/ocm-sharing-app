import { createSignal, Show, createEffect, For } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useEvent } from "../lib/event-context";
import { convex } from "../lib/convex";

interface SmsModalProps {
  isOpen: boolean;
  imagePath: string;
  onClose: () => void;
  onSendSms: (imagePath: string, phoneNumber: string, message?: string) => void;
}

export function SmsModal(props: SmsModalProps) {
  const [phoneNumber, setPhoneNumber] = createSignal("");
  const [isSending, setIsSending] = createSignal(false);
  
  const { selectedEvent } = useEvent();

  // Get current SMS message template
  const getSmsMessage = () => {
    return selectedEvent()?.smsMessage || "Here's your image!";
  };
  
  const handleSendSms = async () => {
    const phone = phoneNumber().trim();
    if (!phone) {
      alert("Please enter a phone number");
      return;
    }
    
    // Basic phone number validation
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(phone)) {
      alert("Please enter a valid phone number");
      return;
    }
    
    // Close modal immediately and start background sending
    setPhoneNumber(""); // Clear input
    props.onClose();
    
    // Send in background - no waiting or error handling in UI
    props.onSendSms(props.imagePath, phone, getSmsMessage()).catch(error => {
      console.error("Background SMS failed:", error);
    });
  };

  const handleClose = () => {
    setPhoneNumber(""); // Clear input when closing
    props.onClose();
  };

  return (
    <Show when={props.isOpen}>
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5);">
        
        {/* Modal Content */}
        <div style="position: relative; background: white; border: 1px solid #ccc; border-radius: 8px; padding: 20px; width: 450px; max-width: 90vw; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
            <h2 style="font-size: 16px; font-weight: 600; margin: 0; color: #333; display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 15.46l-5.27-.61-2.52 2.52c-2.83-1.44-5.15-3.75-6.59-6.59l2.53-2.52L8.54 3H3.03C2.45 13.18 10.82 21.55 21 20.97v-5.51z" fill="currentColor"/>
              </svg>
              Send SMS
            </h2>
            <button
              onClick={handleClose}
              style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666; padding: 0;"
            >
              ×
            </button>
          </div>
          
          {/* Phone Number Input */}
          <div style="margin-bottom: 20px;">
            <input
              type="tel"
              placeholder="Enter phone number"
              value={phoneNumber()}
              onInput={(e) => setPhoneNumber(e.currentTarget.value)}
              style="width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 16px;"
            />
          </div>
          
          {/* Send Button */}
          <button
            onClick={handleSendSms}
            disabled={!phoneNumber().trim()}
            style={`width: 100%; box-sizing: border-box; padding: 12px; font-size: 16px; font-weight: 500; background: ${!phoneNumber().trim() ? '#d1d5db' : '#10b981'}; color: white; border: none; border-radius: 6px; cursor: ${!phoneNumber().trim() ? 'not-allowed' : 'pointer'}; display: flex; align-items: center; justify-content: center; gap: 8px;`}
          >
            Send SMS
          </button>
        </div>
      </div>
    </Show>
  );
}