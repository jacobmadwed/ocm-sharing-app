import { createSignal, Show } from "solid-js";

interface DisclaimerModalProps {
  isOpen: boolean;
  message: string;
  onAgree: () => void;
  onDisagree: () => void;
}

export function DisclaimerModal(props: DisclaimerModalProps) {
  return (
    <Show when={props.isOpen}>
      <div
        style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 60;"
        onClick={props.onDisagree}
      />
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; width: 90%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); z-index: 70; display: flex; flex-direction: column; gap: 16px;">
        <h2 style="font-size: 18px; font-weight: 600; color: #111827;">Disclaimer</h2>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.5;">{props.message}</p>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px;">
          <button
            onClick={props.onDisagree}
            style="padding: 8px 16px; background: #e5e7eb; color: #374151; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;"
          >
            Disagree
          </button>
          <button
            onClick={props.onAgree}
            style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;"
          >
            Agree
          </button>
        </div>
      </div>
    </Show>
  );
}