import { createSignal } from "solid-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgree: () => void;
  onDisagree: () => void;
  disclaimerText: string;
  title?: string;
}

export function DisclaimerModal(props: DisclaimerModalProps) {
  const [isProcessing, setIsProcessing] = createSignal(false);

  const handleAgree = async () => {
    setIsProcessing(true);
    try {
      await props.onAgree();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisagree = () => {
    props.onDisagree();
    props.onClose();
  };

  return (
    <Dialog open={props.isOpen} onOpenChange={(open: boolean) => !open && props.onClose()}>
      <DialogContent style="max-width: 500px; max-height: 80vh; overflow-y: auto;">
        <DialogHeader>
          <DialogTitle style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 16px;">
            {props.title || "Disclaimer Agreement"}
          </DialogTitle>
        </DialogHeader>
        
        <div style="margin-bottom: 24px;">
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <div style="font-size: 14px; line-height: 1.5; color: #374151; white-space: pre-wrap;">
              {props.disclaimerText}
            </div>
          </div>
          
          <div style="font-size: 13px; color: #6b7280; margin-bottom: 20px;">
            Please read the disclaimer above carefully. You must agree to continue with sharing.
          </div>
        </div>

        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button
            onClick={handleDisagree}
            disabled={isProcessing()}
            style="padding: 10px 20px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s;"
            onMouseOver={(e) => {
              if (!isProcessing()) {
                e.currentTarget.style.background = '#e5e7eb';
              }
            }}
            onMouseOut={(e) => {
              if (!isProcessing()) {
                e.currentTarget.style.background = '#f3f4f6';
              }
            }}
          >
            Disagree
          </button>
          
          <button
            onClick={handleAgree}
            disabled={isProcessing()}
            style={`padding: 10px 20px; background: ${isProcessing() ? '#9ca3af' : '#3b82f6'}; color: white; border: none; border-radius: 6px; cursor: ${isProcessing() ? 'not-allowed' : 'pointer'}; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 8px; transition: all 0.2s;`}
            onMouseOver={(e) => {
              if (!isProcessing()) {
                e.currentTarget.style.background = '#2563eb';
              }
            }}
            onMouseOut={(e) => {
              if (!isProcessing()) {
                e.currentTarget.style.background = '#3b82f6';
              }
            }}
          >
            {isProcessing() && (
              <div style="width: 14px; height: 14px; border: 2px solid white; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            )}
            {isProcessing() ? "Processing..." : "I Agree"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}