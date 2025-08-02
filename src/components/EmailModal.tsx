import { createSignal, Show, createEffect, For } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useEvent } from "../lib/event-context";
import { convex } from "../lib/convex";

interface EmailModalProps {
  isOpen: boolean;
  imagePath: string;
  onClose: () => void;
  onSendEmail: (imagePath: string, emailAddress: string, subject: string, message: string) => void;
}

export function EmailModal(props: EmailModalProps) {
  const [emailAddress, setEmailAddress] = createSignal("");
  const [isSending, setIsSending] = createSignal(false);
  
  const { selectedEvent } = useEvent();

  // Get current email templates
  const getEmailSubject = () => {
    return selectedEvent()?.emailSubject || "Image from One Chance Media";
  };

  const getEmailBody = () => {
    return selectedEvent()?.emailBody || "Please find the attached image.";
  };
  
  const handleSendEmail = async () => {
    const email = emailAddress().trim();
    if (!email) {
      alert("Please enter an email address");
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address");
      return;
    }
    
    // Close modal immediately and start background sending
    setEmailAddress(""); // Clear input
    props.onClose();
    
    // Send in background - no waiting or error handling in UI
    props.onSendEmail(props.imagePath, email, getEmailSubject(), getEmailBody()).catch(error => {
      console.error("Background email failed:", error);
    });
  };

  const handleClose = () => {
    // Clear form when closing
    setEmailAddress("");
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
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Send Email
            </h2>
            <button
              onClick={handleClose}
              style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666; padding: 0;"
            >
              ×
            </button>
          </div>
          
          {/* Email Address Input */}
          <div style="margin-bottom: 20px;">
            <input
              type="email"
              placeholder="Enter email address"
              value={emailAddress()}
              onInput={(e) => setEmailAddress(e.currentTarget.value)}
              style="width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 16px;"
            />
          </div>
          
          {/* Send Button */}
          <button
            onClick={handleSendEmail}
            disabled={!emailAddress().trim()}
            style={`width: 100%; box-sizing: border-box; padding: 12px; font-size: 16px; font-weight: 500; background: ${!emailAddress().trim() ? '#d1d5db' : '#dc2626'}; color: white; border: none; border-radius: 6px; cursor: ${!emailAddress().trim() ? 'not-allowed' : 'pointer'}; display: flex; align-items: center; justify-content: center; gap: 8px;`}
          >
            Send Email
          </button>
        </div>
      </div>
    </Show>
  );
}