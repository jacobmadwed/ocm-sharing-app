import { createSignal, createEffect, Show, For } from "solid-js";
import { convex } from "../lib/convex";
import { api } from "../../convex/_generated/api";

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

interface EventStats {
  eventName: string;
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
  recentLogs: DeliveryLog[];
}

export function DeliveryLogs() {
  const [eventStats, setEventStats] = createSignal<EventStats[]>([]);
  const [allEventStats, setAllEventStats] = createSignal<EventStats[]>([]);
  const [selectedEventFilter, setSelectedEventFilter] = createSignal<string>("all");
  const [loading, setLoading] = createSignal(false);
  const [checkingStatus, setCheckingStatus] = createSignal(false);
  const [expandedEvents, setExpandedEvents] = createSignal<Set<string>>(new Set());

  const filterEventStats = (allStats: EventStats[], filter: string) => {
    if (filter === "all") {
      setEventStats(allStats);
    } else {
      setEventStats(allStats.filter(stat => stat.eventName === filter));
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const eventStatsData = await convex.query(api.deliveryLogs.getDeliveryLogsByEvent, { 
        days: 7
      });
      
      setAllEventStats(eventStatsData || []);
      filterEventStats(eventStatsData || [], selectedEventFilter());
    } catch (error) {
      console.error("Error loading delivery logs:", error);
      // Fallback: try to load regular logs and group them manually
      try {
        const regularLogs = await convex.query(api.deliveryLogs.getDeliveryLogs, { 
          limit: 100
        });
        
        // Group logs manually
        const eventGroups: Record<string, DeliveryLog[]> = {};
        regularLogs.forEach((log) => {
          const eventName = log.eventName || "No Event";
          if (!eventGroups[eventName]) {
            eventGroups[eventName] = [];
          }
          eventGroups[eventName].push(log);
        });
        
        const fallbackEventStats = Object.entries(eventGroups).map(([eventName, eventLogs]) => {
          const stats = {
            eventName,
            total: eventLogs.length,
            sms: { total: 0, delivered: 0, failed: 0, pending: 0 },
            email: { total: 0, delivered: 0, failed: 0, pending: 0 },
            recentLogs: eventLogs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10)
          };
          
          eventLogs.forEach((log) => {
            const category = log.type === "sms" ? stats.sms : stats.email;
            category.total++;
            
            const status = log.status.toLowerCase();
            if (status.includes("delivered") || status.includes("sent") || status === "accepted") {
              category.delivered++;
            } else if (status.includes("failed") || status.includes("error")) {
              category.failed++;
            } else {
              category.pending++;
            }
          });
          
          return stats;
        });
        
        setAllEventStats(fallbackEventStats);
        filterEventStats(fallbackEventStats, selectedEventFilter());
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
        setAllEventStats([]);
        setEventStats([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEventFilterChange = (newFilter: string) => {
    setSelectedEventFilter(newFilter);
    filterEventStats(allEventStats(), newFilter);
  };

  const checkDeliveryStatus = async () => {
    setCheckingStatus(true);
    try {
      console.log("🔍 Manually checking delivery status...");
      
      // Check SMS status
      const smsResult = await convex.action(api.statusChecker.checkSmsDeliveryStatus);
      console.log("SMS status check result:", smsResult);
      
      // Check email status  
      const emailResult = await convex.action(api.statusChecker.checkEmailDeliveryStatus);
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

  const toggleEventExpansion = (eventName: string) => {
    const expanded = expandedEvents();
    const newExpanded = new Set(expanded);
    if (expanded.has(eventName)) {
      newExpanded.delete(eventName);
    } else {
      newExpanded.add(eventName);
    }
    setExpandedEvents(newExpanded);
  };

  // Load logs on component mount
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
          📊 Delivery Status by Event
        </h3>
        <div style="display: flex; gap: 8px; align-items: center;">
          <select
            value={selectedEventFilter()}
            onChange={(e) => handleEventFilterChange(e.currentTarget.value)}
            style="padding: 6px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;"
          >
            <option value="all">All Events</option>
            <For each={allEventStats()}>
              {(eventStat) => (
                <option value={eventStat.eventName}>{eventStat.eventName}</option>
              )}
            </For>
          </select>
          <button
            onClick={checkDeliveryStatus}
            disabled={checkingStatus() || loading()}
            style="padding: 6px 12px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;"
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

      {/* Loading State */}
      <Show when={loading()}>
        <div style="text-align: center; padding: 20px; color: #666;">
          Loading delivery logs...
        </div>
      </Show>

      {/* No Data State */}
      <Show when={!loading() && eventStats().length === 0}>
        <div style="text-align: center; padding: 40px; color: #666;">
          <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
          <div>No delivery logs found</div>
        </div>
      </Show>

      {/* Event Groups */}
      <Show when={!loading() && eventStats().length > 0}>
        <div style="space-y: 16px;">
          <For each={eventStats()}>
            {(eventStat) => (
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 16px;">
                {/* Event Header */}
                <div 
                  style="background: #f8fafc; padding: 16px; cursor: pointer; border-bottom: 1px solid #e5e7eb;"
                  onClick={() => toggleEventExpansion(eventStat.eventName)}
                >
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <h4 style="font-size: 16px; font-weight: 600; margin: 0; color: #1f2937;">
                        {eventStat.eventName}
                      </h4>
                      <span style="background: #ddd6fe; color: #5b21b6; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                        {eventStat.total} total
                      </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                      {/* Stats Summary */}
                      <div style="display: flex; gap: 8px; font-size: 12px;">
                        <span style="color: #22c55e; font-weight: 500;">
                          ✓ {eventStat.sms.delivered + eventStat.email.delivered}
                        </span>
                        <span style="color: #ef4444; font-weight: 500;">
                          ✗ {eventStat.sms.failed + eventStat.email.failed}
                        </span>
                        <span style="color: #f59e0b; font-weight: 500;">
                          ⏳ {eventStat.sms.pending + eventStat.email.pending}
                        </span>
                      </div>
                      <span style="font-size: 18px; color: #6b7280;">
                        {expandedEvents().has(eventStat.eventName) ? "▼" : "▶"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Event Details */}
                <Show when={expandedEvents().has(eventStat.eventName)}>
                  <div style="padding: 16px;">
                    {/* Detailed Stats */}
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 16px;">
                      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px; text-align: center;">
                        <div style="font-size: 18px; font-weight: bold; color: #16a34a;">
                          {eventStat.sms.delivered + eventStat.email.delivered}
                        </div>
                        <div style="font-size: 11px; color: #15803d;">Delivered</div>
                      </div>
                      
                      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 8px; text-align: center;">
                        <div style="font-size: 18px; font-weight: bold; color: #dc2626;">
                          {eventStat.sms.failed + eventStat.email.failed}
                        </div>
                        <div style="font-size: 11px; color: #dc2626;">Failed</div>
                      </div>
                      
                      <div style="background: #fffbeb; border: 1px solid #fed7aa; border-radius: 6px; padding: 8px; text-align: center;">
                        <div style="font-size: 18px; font-weight: bold; color: #d97706;">
                          {eventStat.sms.pending + eventStat.email.pending}
                        </div>
                        <div style="font-size: 11px; color: #d97706;">Pending</div>
                      </div>

                      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px; text-align: center;">
                        <div style="font-size: 18px; font-weight: bold; color: #2563eb;">
                          {eventStat.sms.total}
                        </div>
                        <div style="font-size: 11px; color: #2563eb;">SMS</div>
                      </div>

                      <div style="background: #f5f3ff; border: 1px solid #c4b5fd; border-radius: 6px; padding: 8px; text-align: center;">
                        <div style="font-size: 18px; font-weight: bold; color: #7c3aed;">
                          {eventStat.email.total}
                        </div>
                        <div style="font-size: 11px; color: #7c3aed;">Email</div>
                      </div>
                    </div>

                    {/* Recent Logs */}
                    <div>
                      <h5 style="font-size: 14px; font-weight: 600; margin: 0 0 12px 0; color: #374151;">
                        Recent Deliveries
                      </h5>
                      <div style="border: 1px solid #f3f4f6; border-radius: 6px; overflow: hidden;">
                        <For each={eventStat.recentLogs}>
                          {(log) => (
                            <div style="border-bottom: 1px solid #f3f4f6; padding: 12px; hover:background-color: #f9fafb;">
                              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                  <span style="display: flex; align-items: center;">{getTypeIcon(log.type)}</span>
                                  <span style="font-weight: 500; color: #374151; font-size: 14px;">{log.recipient}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                  <Show when={log.imageCount}>
                                    <span style="color: #6b7280; font-size: 12px;">
                                      {log.imageCount} image{log.imageCount !== 1 ? 's' : ''}
                                    </span>
                                  </Show>
                                  <span 
                                    style={`background: ${getStatusColor(log.status)}; color: white; padding: 2px 6px; border-radius: 8px; font-size: 11px; font-weight: 500;`}
                                  >
                                    {log.status}
                                  </span>
                                </div>
                              </div>
                              
                              <div style="font-size: 12px; color: #6b7280;">
                                {formatDate(log.createdAt)}
                                <Show when={log.providerId}>
                                  <span style="margin-left: 8px;">ID: {log.providerId}</span>
                                </Show>
                              </div>
                              
                              <Show when={log.errorMessage}>
                                <div style="margin-top: 6px; padding: 6px; background: #fef2f2; border: 1px solid #f87171; border-radius: 4px; color: #dc2626; font-size: 12px;">
                                  Error: {log.errorMessage}
                                </div>
                              </Show>
                            </div>
                          )}
                        </For>
                      </div>
                    </div>
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