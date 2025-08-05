import { createSignal, createEffect } from 'solid-js';

export interface NetworkStatus {
  isOnline: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  lastChecked: Date;
  lastOnline?: Date;
  lastOffline?: Date;
}

class NetworkStatusManager {
  private networkStatusSignal = createSignal<NetworkStatus>({
    isOnline: navigator.onLine,
    lastChecked: new Date()
  });
  
  private networkStatus = this.networkStatusSignal[0];
  private setNetworkStatus = this.networkStatusSignal[1];

  private checkInterval?: NodeJS.Timeout;
  private readonly CHECK_INTERVAL = 10000; // 10 seconds
  private readonly TEST_ENDPOINTS = [
    'https://www.google.com/favicon.ico',
    'https://www.cloudflare.com/favicon.ico',
    'https://httpbin.org/status/200'
  ];

  constructor() {
    this.setupEventListeners();
    this.startPeriodicChecks();
    this.updateConnectionInfo();
  }

  private setupEventListeners() {
    const handleOnline = () => {
      console.log('📡 Browser online event fired');
      this.setNetworkStatus(prev => ({
        ...prev,
        isOnline: true,
        lastOnline: new Date(),
        lastChecked: new Date()
      }));
      this.updateConnectionInfo();
    };

    const handleOffline = () => {
      console.log('📡 Browser offline event fired');
      this.setNetworkStatus(prev => ({
        ...prev,
        isOnline: false,
        lastOffline: new Date(),
        lastChecked: new Date()
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Connection change events (if supported)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const handleConnectionChange = () => {
        this.updateConnectionInfo();
      };
      
      connection?.addEventListener('change', handleConnectionChange);
    }
  }

  private updateConnectionInfo() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.setNetworkStatus(prev => ({
        ...prev,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
        lastChecked: new Date()
      }));
    }
  }

  private startPeriodicChecks() {
    this.checkInterval = setInterval(() => {
      this.performConnectivityTest();
    }, this.CHECK_INTERVAL);

    // Perform initial check
    setTimeout(() => this.performConnectivityTest(), 1000);
  }

  private async performConnectivityTest(): Promise<boolean> {
    const currentStatus = this.networkStatus();
    
    try {
      // Test multiple endpoints for reliability
      const testPromises = this.TEST_ENDPOINTS.map(endpoint => 
        this.testEndpoint(endpoint)
      );

      const results = await Promise.allSettled(testPromises);
      const successCount = results.filter(result => 
        result.status === 'fulfilled' && result.value
      ).length;

      // Consider online if at least one endpoint is reachable
      const isOnline = successCount > 0;
      const wasOnline = currentStatus.isOnline;

      if (isOnline !== wasOnline) {
        console.log(`📡 Network status changed: ${wasOnline ? 'online' : 'offline'} → ${isOnline ? 'online' : 'offline'}`);
        
        this.setNetworkStatus(prev => ({
          ...prev,
          isOnline,
          lastChecked: new Date(),
          ...(isOnline ? { lastOnline: new Date() } : { lastOffline: new Date() })
        }));
      } else {
        // Update last checked time
        this.setNetworkStatus(prev => ({
          ...prev,
          lastChecked: new Date()
        }));
      }

      this.updateConnectionInfo();
      return isOnline;

    } catch (error) {
      console.log('📡 Connectivity test failed:', error);
      
      // If test fails, assume offline unless browser says online
      const browserOnline = navigator.onLine;
      if (currentStatus.isOnline !== browserOnline) {
        this.setNetworkStatus(prev => ({
          ...prev,
          isOnline: browserOnline,
          lastChecked: new Date(),
          ...(!browserOnline ? { lastOffline: new Date() } : {})
        }));
      }
      
      return browserOnline;
    }
  }

  private async testEndpoint(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return true; // If we get here, the request succeeded (even if blocked by CORS)
    } catch (error) {
      // AbortError means timeout, others mean network issues
      return false;
    }
  }

  // Advanced connectivity test with timing
  public async testConnectivity(): Promise<{
    isOnline: boolean;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      
      return {
        isOnline: true,
        latency
      };
    } catch (error) {
      return {
        isOnline: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Get connection quality assessment
  public getConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' | 'offline' {
    const status = this.networkStatus();
    
    if (!status.isOnline) return 'offline';
    
    // Use connection API if available
    if (status.effectiveType) {
      switch (status.effectiveType) {
        case '4g': return 'excellent';
        case '3g': return 'good';
        case '2g': return 'fair';
        case 'slow-2g': return 'poor';
        default: return 'good';
      }
    }
    
    // Fallback based on RTT if available
    if (status.rtt !== undefined) {
      if (status.rtt < 100) return 'excellent';
      if (status.rtt < 300) return 'good';
      if (status.rtt < 1000) return 'fair';
      return 'poor';
    }
    
    // Default assumption
    return 'good';
  }

  // Get human-readable status
  public getStatusText(): string {
    const status = this.networkStatus();
    const quality = this.getConnectionQuality();
    
    if (!status.isOnline) {
      const offlineTime = status.lastOffline 
        ? Math.floor((Date.now() - status.lastOffline.getTime()) / 1000)
        : 0;
      
      if (offlineTime > 60) {
        return `Offline for ${Math.floor(offlineTime / 60)}m ${offlineTime % 60}s`;
      } else {
        return `Offline for ${offlineTime}s`;
      }
    }
    
    switch (quality) {
      case 'excellent': return 'Online (Excellent connection)';
      case 'good': return 'Online (Good connection)';
      case 'fair': return 'Online (Fair connection)';
      case 'poor': return 'Online (Poor connection)';
      default: return 'Online';
    }
  }

  // Public methods
  public getNetworkStatus() { 
    return this.networkStatus; 
  }

  public isOnline(): boolean {
    return this.networkStatus().isOnline;
  }

  public forceCheck(): Promise<boolean> {
    return this.performConnectivityTest();
  }

  public destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    window.removeEventListener('online', () => {});
    window.removeEventListener('offline', () => {});
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.removeEventListener('change', () => {});
    }
  }
}

// Singleton instance
export const networkStatus = new NetworkStatusManager();