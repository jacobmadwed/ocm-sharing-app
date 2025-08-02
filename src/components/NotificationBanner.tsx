import { createSignal, Show, onCleanup } from "solid-js";

interface NotificationBannerProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number; // in milliseconds
  onClose?: () => void;
}

export function NotificationBanner(props: NotificationBannerProps) {
  const [isVisible, setIsVisible] = createSignal(true);
  
  const duration = props.duration ?? 3000; // Default 3 seconds
  const type = props.type ?? "success";
  
  // Auto-hide after duration
  const timeout = setTimeout(() => {
    setIsVisible(false);
    setTimeout(() => {
      props.onClose?.();
    }, 300); // Wait for fade out animation
  }, duration);
  
  // Cleanup timeout
  onCleanup(() => {
    clearTimeout(timeout);
  });
  
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      props.onClose?.();
    }, 300);
  };
  
  const getColors = () => {
    switch (type) {
      case "success":
        return { bg: "#10b981", border: "#059669", text: "white" };
      case "error":
        return { bg: "#ef4444", border: "#dc2626", text: "white" };
      case "info":
        return { bg: "#3b82f6", border: "#2563eb", text: "white" };
      default:
        return { bg: "#10b981", border: "#059669", text: "white" };
    }
  };
  
  const colors = getColors();
  
  return (
    <Show when={isVisible()}>
      <div 
        style={`
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 10000;
          background: ${colors.bg};
          color: ${colors.text};
          border: 1px solid ${colors.border};
          border-radius: 6px;
          padding: 8px 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.3s ease;
          opacity: ${isVisible() ? 1 : 0};
          transform: translateY(${isVisible() ? 0 : 20}px);
        `}
      >
        <div style="line-height: 1;">
          {props.message}
        </div>
        <button
          onClick={handleClose}
          style="
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            padding: 2px;
            border-radius: 2px;
            font-size: 14px;
            line-height: 1;
            opacity: 0.8;
            transition: opacity 0.2s;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
          "
          onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "0.8"}
        >
          ×
        </button>
      </div>
    </Show>
  );
}