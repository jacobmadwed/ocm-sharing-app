import { createSignal, createEffect } from 'solid-js';
import { networkStatus } from './network-status';

export interface QueuedMessage {
  id: string;
  type: 'email' | 'sms' | 'mms';
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'retrying';
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
  lastAttempt?: Date;
  nextRetry?: Date;
  attempts: number;
  maxAttempts: number;
  data: EmailMessageData | SmsMessageData | MmsMessageData;
  error?: string;
}

export interface EmailMessageData {
  to: string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
  eventName?: string;
  disclaimerEnabled?: boolean;
  surveyResponses?: Array<{
    questionId: string;
    answer: string;
  }>;
}

export interface SmsMessageData {
  to: string[];
  message: string;
  eventName?: string;
  disclaimerEnabled?: boolean;
  surveyResponses?: Array<{
    questionId: string;
    answer: string;
  }>;
}

export interface MmsMessageData {
  to: string[];
  message: string;
  mediaUrls: string[];
  eventName?: string;
  disclaimerEnabled?: boolean;
  surveyResponses?: Array<{
    questionId: string;
    answer: string;
  }>;
}

export interface QueueStats {
  total: number;
  pending: number;
  sending: number;
  sent: number;
  failed: number;
  retrying: number;
}

class MessageQueueManager {
  private queue: QueuedMessage[] = [];
  private queueSignalTuple = createSignal<QueuedMessage[]>([]);
  private queueSignal = this.queueSignalTuple[0];
  private setQueueSignal = this.queueSignalTuple[1];
  
  private isProcessingTuple = createSignal(false);
  private isProcessing = this.isProcessingTuple[0];
  private setIsProcessing = this.isProcessingTuple[1];
  
  private isOnlineTuple = createSignal(networkStatus.isOnline());
  private isOnline = this.isOnlineTuple[0];
  private setIsOnline = this.isOnlineTuple[1];
  private processingTimer?: NodeJS.Timeout;
  private readonly STORAGE_KEY = 'message_queue';
  private readonly RETRY_DELAYS = [1000, 5000, 30000, 60000, 300000]; // 1s, 5s, 30s, 1m, 5m

  constructor() {
    this.loadQueue();
    this.setupNetworkDetection();
    this.startProcessing();
    
    // Auto-save queue changes
    createEffect(() => {
      this.saveQueue();
    });
  }

  // Network Detection
  private setupNetworkDetection() {
    // Use the centralized network status service
    createEffect(() => {
      const wasOnline = this.isOnline();
      const nowOnline = networkStatus.getNetworkStatus()().isOnline;
      
      if (wasOnline !== nowOnline) {
        this.setIsOnline(nowOnline);
        
        // If we just came back online, restart processing immediately
        if (!wasOnline && nowOnline) {
          console.log('📡 Network restored - resuming message queue processing');
          this.processQueue();
        } else if (wasOnline && !nowOnline) {
          console.log('📡 Network lost - pausing message queue processing');
        }
      }
    });
  }

  // Queue Management
  public addMessage(
    type: QueuedMessage['type'],
    data: QueuedMessage['data'],
    priority: QueuedMessage['priority'] = 'medium'
  ): string {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const message: QueuedMessage = {
      id,
      type,
      status: 'pending',
      priority,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: 5,
      data
    };

    this.queue.push(message);
    this.sortQueue();
    this.setQueueSignal([...this.queue]);
    
    console.log(`📝 Added ${type} message to queue:`, id);
    
    // Try to process immediately if online
    if (this.isOnline()) {
      this.processQueue();
    }
    
    return id;
  }

  public removeMessage(id: string): boolean {
    const index = this.queue.findIndex(msg => msg.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.setQueueSignal([...this.queue]);
      console.log(`🗑️ Removed message from queue:`, id);
      return true;
    }
    return false;
  }

  public retryMessage(id: string): boolean {
    const message = this.queue.find(msg => msg.id === id);
    if (message && (message.status === 'failed' || message.status === 'retrying')) {
      message.status = 'pending';
      message.attempts = 0;
      message.error = undefined;
      message.nextRetry = undefined;
      this.setQueueSignal([...this.queue]);
      
      if (this.isOnline()) {
        this.processQueue();
      }
      
      console.log(`🔄 Retrying message:`, id);
      return true;
    }
    return false;
  }

  public clearSentMessages(): number {
    const sentCount = this.queue.filter(msg => msg.status === 'sent').length;
    this.queue = this.queue.filter(msg => msg.status !== 'sent');
    this.setQueueSignal([...this.queue]);
    console.log(`🧹 Cleared ${sentCount} sent messages from queue`);
    return sentCount;
  }

  public clearFailedMessages(): number {
    const failedCount = this.queue.filter(msg => msg.status === 'failed').length;
    this.queue = this.queue.filter(msg => msg.status !== 'failed');
    this.setQueueSignal([...this.queue]);
    console.log(`🧹 Cleared ${failedCount} failed messages from queue`);
    return failedCount;
  }

  // Queue Processing
  private startProcessing() {
    this.processingTimer = setInterval(() => {
      if (this.isOnline() && !this.isProcessing()) {
        this.processQueue();
      }
    }, 5000); // Check every 5 seconds
  }

  private async processQueue() {
    if (this.isProcessing() || !this.isOnline()) return;
    
    const pendingMessages = this.queue
      .filter(msg => 
        msg.status === 'pending' || 
        (msg.status === 'retrying' && msg.nextRetry && new Date() >= msg.nextRetry)
      )
      .sort((a, b) => {
        // Sort by priority then by creation time
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    if (pendingMessages.length === 0) return;

    this.setIsProcessing(true);
    console.log(`🔄 Processing ${pendingMessages.length} messages from queue`);

    for (const message of pendingMessages) {
      if (!this.isOnline()) {
        console.log('📡 Network lost during processing - stopping');
        break;
      }

      await this.processMessage(message);
      
      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.setIsProcessing(false);
  }

  private async processMessage(message: QueuedMessage) {
    message.status = 'sending';
    message.lastAttempt = new Date();
    message.attempts++;
    this.setQueueSignal([...this.queue]);

    try {
      let success = false;

      switch (message.type) {
        case 'email':
          success = await this.sendEmail(message.data as EmailMessageData);
          break;
        case 'sms':
          success = await this.sendSms(message.data as SmsMessageData);
          break;
        case 'mms':
          success = await this.sendMms(message.data as MmsMessageData);
          break;
      }

      if (success) {
        message.status = 'sent';
        message.error = undefined;
        console.log(`✅ Successfully sent ${message.type} message:`, message.id);
      } else {
        throw new Error(`Failed to send ${message.type} message`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      message.error = errorMessage;
      
      console.log(`❌ Failed to send ${message.type} message (attempt ${message.attempts}/${message.maxAttempts}):`, errorMessage);

      if (message.attempts >= message.maxAttempts) {
        message.status = 'failed';
        console.log(`💀 Message failed permanently after ${message.maxAttempts} attempts:`, message.id);
      } else {
        message.status = 'retrying';
        const delay = this.RETRY_DELAYS[Math.min(message.attempts - 1, this.RETRY_DELAYS.length - 1)];
        message.nextRetry = new Date(Date.now() + delay);
        console.log(`⏰ Will retry ${message.type} message in ${delay/1000}s:`, message.id);
      }
    }

    this.setQueueSignal([...this.queue]);
  }

  // Message Sending Methods (integrate with existing services)
  private async sendEmail(data: EmailMessageData): Promise<boolean> {
    // Import and use existing email service
    const { sendEmail } = await import('./email-service');
    
    for (const recipient of data.to) {
      await sendEmail({
        to: recipient,
        subject: data.subject,
        text: data.text,
        html: data.html,
        attachments: data.attachments,
        eventName: data.eventName,
        disclaimerEnabled: data.disclaimerEnabled,
        surveyResponses: data.surveyResponses
      });
    }
    
    return true;
  }

  private async sendSms(data: SmsMessageData): Promise<boolean> {
    // Import and use existing SMS service
    const { sendSMS } = await import('./sms-service');
    
    for (const recipient of data.to) {
      await sendSMS(recipient, data.message, undefined, data.eventName, data.disclaimerEnabled, data.surveyResponses);
    }
    
    return true;
  }

  private async sendMms(data: MmsMessageData): Promise<boolean> {
    // Import and use existing SMS service for MMS
    const { sendSMS } = await import('./sms-service');
    
    for (const recipient of data.to) {
      // Note: You'll need to implement MMS in your SMS service
      await sendSMS(recipient, data.message, data.mediaUrls, data.eventName, data.disclaimerEnabled, data.surveyResponses);
    }
    
    return true;
  }

  // Utility Methods
  private sortQueue() {
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  private saveQueue() {
    try {
      const queueData = this.queue.map(msg => ({
        ...msg,
        createdAt: msg.createdAt.toISOString(),
        lastAttempt: msg.lastAttempt?.toISOString(),
        nextRetry: msg.nextRetry?.toISOString()
      }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queueData));
    } catch (error) {
      console.error('Failed to save message queue:', error);
    }
  }

  private loadQueue() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const queueData = JSON.parse(saved);
        this.queue = queueData.map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
          lastAttempt: msg.lastAttempt ? new Date(msg.lastAttempt) : undefined,
          nextRetry: msg.nextRetry ? new Date(msg.nextRetry) : undefined
        }));
        this.setQueueSignal([...this.queue]);
        console.log(`📂 Loaded ${this.queue.length} messages from saved queue`);
      }
    } catch (error) {
      console.error('Failed to load message queue:', error);
      this.queue = [];
    }
  }

  // Public Getters
  public getQueue() { return this.queueSignal; }
  public getIsProcessing() { return this.isProcessing; }
  public getIsOnline() { return this.isOnline; }
  
  public getStats(): QueueStats {
    const queue = this.queueSignal();
    return {
      total: queue.length,
      pending: queue.filter(msg => msg.status === 'pending').length,
      sending: queue.filter(msg => msg.status === 'sending').length,
      sent: queue.filter(msg => msg.status === 'sent').length,
      failed: queue.filter(msg => msg.status === 'failed').length,
      retrying: queue.filter(msg => msg.status === 'retrying').length
    };
  }

  // Cleanup
  public destroy() {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }
    window.removeEventListener('online', () => {});
    window.removeEventListener('offline', () => {});
  }
}

// Singleton instance
export const messageQueue = new MessageQueueManager();