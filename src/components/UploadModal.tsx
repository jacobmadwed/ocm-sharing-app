import { createSignal, Show } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";

interface UploadModalProps {
  isOpen: boolean;
  imagePath: string;
  onClose: () => void;
  onUpload: (imagePath: string) => void;
  onSendSms?: (imagePath: string) => void;
  onSendEmail?: (imagePath: string) => void;
}

export function UploadModal(props: UploadModalProps) {
  const [isUploading, setIsUploading] = createSignal(false);
  
  // Debug logging
  console.log('🚀 UploadModal rendered with props:', {
    isOpen: props.isOpen,
    imagePath: props.imagePath
  });

  const handleUpload = async () => {
    setIsUploading(true);
    try {
      await props.onUpload(props.imagePath);
      props.onClose();
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Show when={props.isOpen}>
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5);">
        
        {/* Modal Content */}
        <div style="position: relative; background: white; border: 1px solid #ccc; border-radius: 8px; padding: 24px; width: 400px; max-width: 90vw; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <h2 style="font-size: 18px; font-weight: 600; margin: 0; color: #333;">Upload Image</h2>
            <button
              onClick={props.onClose}
              style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;"
              disabled={isUploading()}
            >
              ×
            </button>
          </div>
          
          {/* Image Preview */}
          <div style="margin-bottom: 16px;">
            <img
              src={convertFileSrc(props.imagePath)}
              alt="Upload preview"
              style="width: 100%; height: 200px; object-fit: contain; border-radius: 8px; background: #f5f5f5; border: 1px solid #ddd;"
            />
          </div>
          
          <div style="margin-bottom: 16px;">
            <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">
              File: {props.imagePath.split('/').pop()}
            </p>
            <p style="font-size: 14px; color: #666; margin: 0 0 16px 0;">
              Choose an action for this image:
            </p>
          </div>
          
          {/* Action Buttons */}
          <div style="display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap;">
            <button
              onClick={props.onClose}
              disabled={isUploading()}
              style="padding: 8px 16px; font-size: 14px; border: 1px solid #ccc; background: white; border-radius: 6px; cursor: pointer; color: #333;"
            >
              Cancel
            </button>
            <Show when={props.onSendSms}>
              <button
                onClick={() => {
                  props.onSendSms?.(props.imagePath);
                  props.onClose();
                }}
                disabled={isUploading()}
                style="padding: 8px 16px; font-size: 14px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;"
              >
                📱 Send SMS
              </button>
            </Show>
            <Show when={props.onSendEmail}>
              <button
                onClick={() => {
                  props.onSendEmail?.(props.imagePath);
                  props.onClose();
                }}
                disabled={isUploading()}
                style="padding: 8px 16px; font-size: 14px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer;"
              >
                📧 Send Email
              </button>
            </Show>
            <button
              onClick={handleUpload}
              disabled={isUploading()}
              style="padding: 8px 16px; font-size: 14px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px;"
            >
              <Show when={isUploading()}>
                <div style="width: 16px; height: 16px; border: 2px solid white; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              </Show>
              {isUploading() ? "Uploading..." : "☁️ Upload"}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}