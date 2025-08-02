import { createSignal, createEffect, Show, For } from "solid-js";
import { convex } from "../lib/convex";

interface DeliveryLog {
  _id: string;
  type: "sms" | "email";
  recipient: string;
  status: string;
  providerId?: string;
  providerResponse?: string;
  errorMessage?: string;
  imageCount?: number;
  eventName?: string;
  createdAt: number;
}

interface DeliveryStats {
  total: number;
  sms: {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
  };
  email: {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
  };
}

export function DeliveryLogs() {
  const [logs, setLogs] = createSignal<DeliveryLog[]>([]);
  const [stats, setStats] = createSignal<DeliveryStats | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [selectedType, setSelectedType] = createSignal<"all" | "sms" | "email">("all");
  const [checkingStatus, setCheckingStatus] = createSignal(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const [logsData, statsData] = await Promise.all([
        convex.query("deliveryLogs:getDeliveryLogs", { 
          limit: 50,
          type: selectedType() === "all" ? undefined : selectedType()
        }),
        convex.query("deliveryLogs:getDeliveryStats", { days: 7 })
      ]);
      
      setLogs(logsData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading delivery logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkDeliveryStatus = async () => {
    setCheckingStatus(true);
    try {
      console.log("🔍 Manually checking delivery status...");
      
      // Check SMS status
      const smsResult = await convex.action("statusChecker:checkSmsDeliveryStatus");
      console.log("SMS status check result:", smsResult);
      
      // Check email status  
      const emailResult = await convex.action("statusChecker:checkEmailDeliveryStatus");
      console.log("Email status check result:", emailResult);
      
      // Reload logs to show updated statuses
      await loadLogs();
      
      alert(`Status check complete!\nSMS: ${smsResult.updated}/${smsResult.checked} updated\nEmail: ${emailResult.updated} updated`);
      
    } catch (error) {
      console.error("Error checking delivery status:", error);
      alert("Error checking delivery status. Check console for details.");
    } finally {
      setCheckingStatus(false);
    }
  };

  // Load logs on component mount and when filter changes
  createEffect(() => {
    loadLogs();
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    const lowercaseStatus = status.toLowerCase();
    if (lowercaseStatus.includes("delivered") || lowercaseStatus.includes("sent") || lowercaseStatus === "accepted") {
      return "#22c55e"; // green
    } else if (lowercaseStatus.includes("failed") || lowercaseStatus.includes("error")) {
      return "#ef4444"; // red
    } else {
      return "#f59e0b"; // yellow/orange
    }
  };

  const getTypeIcon = (type: "sms" | "email") => {
    if (type === "sms") {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M21 15.46l-5.27-.61-2.52 2.52c-2.83-1.44-5.15-3.75-6.59-6.59l2.53-2.52L8.54 3H3.03C2.45 13.18 10.82 21.55 21 20.97v-5.51z" fill="currentColor"/>
        </svg>
      );
    } else {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      );
    }
  };

  return (
    <div>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
        <h3 style="font-size: 18px; font-weight: 600; margin: 0; color: #333;">
          📊 Delivery Status
        </h3>
        <div style="display: flex; gap: 8px;">
          <select
            value={selectedType()}
            onChange={(e) => setSelectedType(e.currentTarget.value as "all" | "sms" | "email")}
            style="padding: 6px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;"
          >
            <option value="all">All Messages</option>
            <option value="sms">SMS Only</option>
            <option value="email">Email Only</option>
          </select>
          <button
            onClick={checkDeliveryStatus}
            disabled={checkingStatus() || loading()}
            style="padding: 6px 12px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; margin-right: 8px;"
          >
            {checkingStatus() ? "Checking..." : "🔍 Check Status"}
          </button>
          <button
            onClick={loadLogs}
            disabled={loading()}
            style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;"
          >
            {loading() ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <Show when={stats()}>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #1e293b;">{stats()!.total}</div>
            <div style="font-size: 12px; color: #64748b;">Total Messages</div>
          </div>
          
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #16a34a;">
              {stats()!.sms.delivered + stats()!.email.delivered}
            </div>
            <div style="font-size: 12px; color: #15803d;">Delivered</div>
          </div>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #dc2626;">
              {stats()!.sms.failed + stats()!.email.failed}
            </div>
            <div style="font-size: 12px; color: #dc2626;">Failed</div>
          </div>
          
          <div style="background: #fffbeb; border: 1px solid #fed7aa; border-radius: 6px; padding: 12px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #d97706;">
              {stats()!.sms.pending + stats()!.email.pending}
            </div>
            <div style="font-size: 12px; color: #d97706;">Pending</div>
          </div>
        </div>
      </Show>

      {/* Logs List */}
      <Show when={loading()}>
        <div style="text-align: center; padding: 20px; color: #666;">
          Loading delivery logs...
        </div>
      </Show>

      <Show when={!loading() && logs().length === 0}>
        <div style="text-align: center; padding: 40px; color: #666;">
          <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
          <div>No delivery logs found</div>
        </div>
      </Show>

      <Show when={!loading() && logs().length > 0}>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <For each={logs()}>
            {(log) => (
              <div style="border-bottom: 1px solid #f3f4f6; padding: 16px; hover:background-color: #f9fafb;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: flex; align-items: center;">{getTypeIcon(log.type)}</span>
                    <span style="font-weight: 500; color: #374151;">{log.recipient}</span>
                    <Show when={log.eventName}>
                      <span style="background: #ddd6fe; color: #5b21b6; padding: 2px 6px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                        {log.eventName}
                      </span>
                    </Show>
                  </div>
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <Show when={log.imageCount}>
                      <span style="color: #6b7280; font-size: 14px;">
                        {log.imageCount} image{log.imageCount !== 1 ? 's' : ''}
                      </span>
                    </Show>
                    <span 
                      style={`background: ${getStatusColor(log.status)}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;`}
                    >
                      {log.status}
                    </span>
                  </div>
                </div>
                
                <div style="display: flex; justify-content: between; align-items: center; font-size: 13px; color: #6b7280;">
                  <div>
                    {formatDate(log.createdAt)}
                    <Show when={log.providerId}>
                      <span style="margin-left: 8px;">ID: {log.providerId}</span>
                    </Show>
                  </div>
                </div>
                
                <Show when={log.errorMessage}>
                  <div style="margin-top: 8px; padding: 8px; background: #fef2f2; border: 1px solid #f87171; border-radius: 4px; color: #dc2626; font-size: 13px;">
                    Error: {log.errorMessage}
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}