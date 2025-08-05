import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { createSignal, createResource } from 'solid-js';

export interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  installing: boolean;
  error: string | null;
  currentVersion: string;
  availableVersion: string | null;
  releaseNotes: string | null;
  debugLogs: string[];
}

export function createUpdater() {
  const [updateStatus, setUpdateStatus] = createSignal<UpdateStatus>({
    checking: false,
    available: false,
    downloading: false,
    installing: false,
    error: null,
    currentVersion: '0.1.2', // This should match your package.json version
    availableVersion: null,
    releaseNotes: null,
    debugLogs: [],
  });

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log('UPDATER:', logMessage);
    setUpdateStatus(prev => ({
      ...prev,
      debugLogs: [...prev.debugLogs, logMessage].slice(-10) // Keep last 10 logs
    }));
  };

  const checkForUpdates = async (): Promise<Update | null> => {
    addDebugLog('Starting update check...');
    addDebugLog(`Current version: ${updateStatus().currentVersion}`);
    addDebugLog('Configured endpoint: https://github.com/jacobmadwed/ocm-sharing-app/releases/latest/download/latest.json');
    setUpdateStatus(prev => ({ ...prev, checking: true, error: null }));
    
    try {
      // First test if we can reach the endpoint manually
      addDebugLog('Testing endpoint accessibility...');
      try {
        const response = await fetch('https://github.com/jacobmadwed/ocm-sharing-app/releases/latest/download/latest.json');
        addDebugLog(`Endpoint test - Status: ${response.status}`);
        if (response.ok) {
          const text = await response.text();
          addDebugLog(`Endpoint test - Response length: ${text.length} chars`);
        }
      } catch (fetchError) {
        addDebugLog(`Endpoint test failed: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      }
      
      addDebugLog('Calling Tauri updater check()...');
      const update = await check();
      addDebugLog(`Check result: ${update ? 'Update found' : 'No update available'}`);
      
      if (update) {
        addDebugLog(`Update version: ${update.version}`);
        addDebugLog(`Update date: ${update.date}`);
        addDebugLog(`Release notes: ${update.body ? 'Available' : 'None'}`);
        
        setUpdateStatus(prev => ({
          ...prev,
          checking: false,
          available: true,
          availableVersion: update.version,
          releaseNotes: update.body || null,
        }));
        return update;
      } else {
        addDebugLog('No updates available - app is up to date');
        setUpdateStatus(prev => ({
          ...prev,
          checking: false,
          available: false,
        }));
        return null;
      }
    } catch (error) {
      let errorMessage = 'Unknown error';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        addDebugLog(`ERROR: ${errorMessage}`);
        addDebugLog(`Error stack: ${error.stack || 'No stack trace'}`);
      } else if (typeof error === 'string') {
        errorMessage = error;
        addDebugLog(`ERROR (string): ${errorMessage}`);
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
        addDebugLog(`ERROR (object): ${errorMessage}`);
      } else {
        errorMessage = String(error);
        addDebugLog(`ERROR (other): ${errorMessage}`);
      }
      
      addDebugLog(`Error type: ${typeof error}`);
      console.error('Update check failed:', error);
      
      setUpdateStatus(prev => ({
        ...prev,
        checking: false,
        error: errorMessage,
      }));
      return null;
    }
  };

  const installUpdate = async (update: Update) => {
    addDebugLog('Starting update installation...');
    addDebugLog(`Update object keys: ${Object.keys(update).join(', ')}`);
    addDebugLog(`Update version: ${update.version}`);
    addDebugLog(`Update date: ${update.date}`);
    addDebugLog(`Update available: ${update.available ? 'true' : 'false'}`);
    
    setUpdateStatus(prev => ({ ...prev, downloading: true, error: null }));
    
    try {
      addDebugLog('Calling update.downloadAndInstall()...');
      
      // Download and install the update
      await update.downloadAndInstall((event) => {
        addDebugLog(`Download event: ${JSON.stringify(event)}`);
        
        switch (event.event) {
          case 'Started':
            addDebugLog('Download started - event received');
            setUpdateStatus(prev => ({ ...prev, downloading: true }));
            break;
          case 'Progress':
            addDebugLog(`Download progress: ${event.data}% - event received`);
            break;
          case 'Finished':
            addDebugLog('Download finished - event received, starting install...');
            setUpdateStatus(prev => ({ ...prev, downloading: false, installing: true }));
            break;
          default:
            addDebugLog(`Unknown download event: ${event.event}`);
            break;
        }
      });
      
      addDebugLog('downloadAndInstall() completed successfully');
      addDebugLog('Attempting to restart application...');
      
      // Restart the application
      await relaunch();
      addDebugLog('Relaunch completed');
      
    } catch (error) {
      let errorMessage = 'Failed to install update';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        addDebugLog(`INSTALL ERROR: ${errorMessage}`);
        addDebugLog(`Install error stack: ${error.stack || 'No stack trace'}`);
      } else if (typeof error === 'string') {
        errorMessage = error;
        addDebugLog(`INSTALL ERROR (string): ${errorMessage}`);
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
        addDebugLog(`INSTALL ERROR (object): ${errorMessage}`);
      } else {
        errorMessage = String(error);
        addDebugLog(`INSTALL ERROR (other): ${errorMessage}`);
      }
      
      addDebugLog(`Install error type: ${typeof error}`);
      addDebugLog('Setting error state...');
      
      setUpdateStatus(prev => ({
        ...prev,
        downloading: false,
        installing: false,
        error: errorMessage,
      }));
    }
  };

  return {
    updateStatus,
    checkForUpdates,
    installUpdate,
  };
}