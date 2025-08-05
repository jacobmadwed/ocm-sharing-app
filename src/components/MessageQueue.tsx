import { createSignal, Show, For } from "solid-js";
import { messageQueue } from "../lib/message-queue";
import { networkStatus } from "../lib/network-status";

export function MessageQueue() {
  const [refreshKey, setRefreshKey] = createSignal(0);
  
  const queue = messageQueue.getQueue();
  const isProcessing = messageQueue.getIsProcessing();
  const isOnline = messageQueue.getIsOnline();
  const networkStatusData = networkStatus.getNetworkStatus();
  const stats = messageQueue.getStats();
  
  // Force refresh every 5 seconds to show real-time updates
  setInterval(() => {
    setRefreshKey(prev => prev + 1);
  }, 5000);

  const handleRetryMessage = (messageId: string) => {
    messageQueue.retryMessage(messageId);
  };

  const handleRemoveMessage = (messageId: string) => {
    messageQueue.removeMessage(messageId);
  };

  const handleClearSent = () => {
    const cleared = messageQueue.clearSentMessages();
    console.log(`Cleared ${cleared} sent messages`);
  };

  const handleClearFailed = () => {
    const cleared = messageQueue.clearFailedMessages();
    console.log(`Cleared ${cleared} failed messages`);
  };

  const handleForceNetworkCheck = async () => {
    await networkStatus.forceCheck();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString();
  };

  const formatTimeUntilRetry = (retryDate: Date) => {
    const now = new Date();
    const diff = retryDate.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ready to retry';
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b'; // yellow
      case 'sending': return '#3b82f6'; // blue
      case 'sent': return '#10b981'; // green
      case 'failed': return '#ef4444'; // red
      case 'retrying': return '#8b5cf6'; // purple
      default: return '#6b7280'; // gray
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return '📧';
      case 'sms': return '📱';
      case 'mms': return '📸';
      default: return '📤';
    }
  };

  return (
    <div>
      {/* Network Status */}
      <div style="background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="font-size: 14px; font-weight: 600; color: #374151; margin: 0;">Network Status</h4>
          <button
            onClick={handleForceNetworkCheck}
            style="padding: 4px 8px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;"
          >
            Check
          </button>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style={`font-size: 14px; color: ${isOnline() ? '#10b981' : '#ef4444'}; font-weight: 500;`}>
            {isOnline() ? '🟢 Online' : '🔴 Offline'}
          </span>
          <span style="font-size: 12px; color: #6b7280;">
            {networkStatus.getStatusText()}
          </span>
        </div>
        
        <Show when={networkStatusData().lastChecked}>
          <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">
            Last checked: {formatDate(networkStatusData().lastChecked)}
          </div>
        </Show>
      </div>

      {/* Queue Statistics */}
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="font-size: 14px; font-weight: 600; color: #374151; margin: 0;">
            Message Queue ({stats.total} total)
          </h4>
          <div style="display: flex; gap: 4px;">
            <Show when={isProcessing()}>
              <span style="font-size: 12px; color: #3b82f6; font-weight: 500;">
                🔄 Processing...
              </span>
            </Show>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; font-size: 12px;">
          <div style="text-align: center;">
            <div style="color: #f59e0b; font-weight: 600;">{stats.pending}</div>
            <div style="color: #6b7280;">Pending</div>
          </div>
          <div style="text-align: center;">
            <div style="color: #3b82f6; font-weight: 600;">{stats.sending}</div>
            <div style="color: #6b7280;">Sending</div>
          </div>
          <div style="text-align: center;">
            <div style="color: #10b981; font-weight: 600;">{stats.sent}</div>
            <div style="color: #6b7280;">Sent</div>
          </div>
          <div style="text-align: center;">
            <div style="color: #ef4444; font-weight: 600;">{stats.failed}</div>
            <div style="color: #6b7280;">Failed</div>
          </div>
          <div style="text-align: center;">
            <div style="color: #8b5cf6; font-weight: 600;">{stats.retrying}</div>
            <div style="color: #6b7280;">Retrying</div>
          </div>
        </div>
      </div>

      {/* Queue Actions */}
      <div style="display: flex; gap: 8px; margin-bottom: 16px;">
        <button
          onClick={handleClearSent}
          disabled={stats.sent === 0}
          style={`padding: 6px 12px; background: ${stats.sent > 0 ? '#10b981' : '#9ca3af'}; color: white; border: none; border-radius: 4px; cursor: ${stats.sent > 0 ? 'pointer' : 'not-allowed'}; font-size: 12px;`}
        >
          Clear Sent ({stats.sent})
        </button>
        <button
          onClick={handleClearFailed}
          disabled={stats.failed === 0}
          style={`padding: 6px 12px; background: ${stats.failed > 0 ? '#ef4444' : '#9ca3af'}; color: white; border: none; border-radius: 4px; cursor: ${stats.failed > 0 ? 'pointer' : 'not-allowed'}; font-size: 12px;`}
        >
          Clear Failed ({stats.failed})
        </button>
      </div>

      {/* Message List */}
      <div style="max-height: 400px; overflow-y: auto;">
        <Show when={queue().length === 0}>
          <div style="text-align: center; padding: 32px; color: #6b7280; font-size: 14px;">
            📭 No messages in queue
          </div>
        </Show>
        
        <For each={queue()}>
          {(message) => (
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 8px;">
              {/* Message Header */}
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span>{getTypeIcon(message.type)}</span>
                  <span>{getPriorityIcon(message.priority)}</span>
                  <span style="font-size: 12px; font-weight: 500; color: #374151;">
                    {message.type.toUpperCase()}
                  </span>
                  <span 
                    style={`font-size: 11px; font-weight: 500; color: ${getStatusColor(message.status)}; background: ${getStatusColor(message.status)}15; padding: 2px 6px; border-radius: 10px;`}
                  >
                    {message.status.toUpperCase()}
                  </span>
                </div>
                
                <div style="display: flex; gap: 4px;">
                  <Show when={message.status === 'failed' || message.status === 'retrying'}>
                    <button
                      onClick={() => handleRetryMessage(message.id)}
                      style="padding: 2px 6px; background: #3b82f6; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px;"
                    >
                      Retry
                    </button>
                  </Show>
                  <button
                    onClick={() => handleRemoveMessage(message.id)}
                    style="padding: 2px 6px; background: #ef4444; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px;"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Message Details */}
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">
                <div>
                  <strong>To:</strong> {Array.isArray(message.data.to) ? message.data.to.join(', ') : 'Unknown'}
                </div>
                <Show when={message.type === 'email' && 'subject' in message.data}>
                  <div>
                    <strong>Subject:</strong> {(message.data as any).subject}
                  </div>
                </Show>
                <div>
                  <strong>Created:</strong> {formatDate(message.createdAt)}
                </div>
                <Show when={message.lastAttempt}>
                  <div>
                    <strong>Last attempt:</strong> {formatDate(message.lastAttempt!)} 
                    ({message.attempts}/{message.maxAttempts})
                  </div>
                </Show>
                <Show when={message.nextRetry}>
                  <div>
                    <strong>Next retry:</strong> {formatTimeUntilRetry(message.nextRetry!)}
                  </div>
                </Show>
              </div>

              {/* Error Message */}
              <Show when={message.error}>
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; padding: 6px; margin-top: 6px;">
                  <div style="font-size: 11px; color: #dc2626; font-weight: 500;">Error:</div>
                  <div style="font-size: 11px; color: #dc2626;">{message.error}</div>
                </div>
              </Show>

              {/* Message Preview */}
              <Show when={message.type === 'email' && 'text' in message.data}>
                <div style="background: #f9fafb; border-radius: 4px; padding: 6px; margin-top: 6px;">
                  <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Message:</div>
                  <div style="font-size: 11px; color: #374151; max-height: 40px; overflow: hidden;">
                    {(message.data as any).text?.substring(0, 100)}
                    {(message.data as any).text?.length > 100 ? '...' : ''}
                  </div>
                </div>
              </Show>

              <Show when={message.type === 'sms' || message.type === 'mms'}>
                <div style="background: #f9fafb; border-radius: 4px; padding: 6px; margin-top: 6px;">
                  <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Message:</div>
                  <div style="font-size: 11px; color: #374151; max-height: 40px; overflow: hidden;">
                    {(message.data as any).message?.substring(0, 100)}
                    {(message.data as any).message?.length > 100 ? '...' : ''}
                  </div>
                  <Show when={message.type === 'mms' && (message.data as any).mediaUrls}>
                    <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
                      📎 {(message.data as any).mediaUrls?.length} media files
                    </div>
                  </Show>
                </div>
              </Show>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}