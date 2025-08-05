import { createSignal } from 'solid-js';
import { exit } from '@tauri-apps/plugin-process';

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  assets: Array<{
    id: number;
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

export interface CustomUpdateStatus {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  installing: boolean;
  error: string | null;
  currentVersion: string;
  availableVersion: string | null;
  releaseNotes: string | null;
  debugLogs: string[];
  downloadProgress: number;
}

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || '';
const REPO_OWNER = 'jacobmadwed';
const REPO_NAME = 'ocm-sharing-app';

export function createCustomUpdater() {
  const [updateStatus, setUpdateStatus] = createSignal<CustomUpdateStatus>({
    checking: false,
    available: false,
    downloading: false,
    installing: false,
    error: null,
    currentVersion: '0.1.2',
    availableVersion: null,
    releaseNotes: null,
    debugLogs: [],
    downloadProgress: 0,
  });

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log('CUSTOM UPDATER:', logMessage);
    setUpdateStatus(prev => ({
      ...prev,
      debugLogs: [...prev.debugLogs, logMessage].slice(-15) // Keep last 15 logs
    }));
  };

  const checkForUpdates = async (): Promise<GitHubRelease | null> => {
    addDebugLog('Starting custom update check...');
    addDebugLog(`Current version: ${updateStatus().currentVersion}`);
    addDebugLog(`Checking repo: ${REPO_OWNER}/${REPO_NAME}`);
    
    setUpdateStatus(prev => ({ ...prev, checking: true, error: null }));
    
    try {
      addDebugLog('Fetching latest release from GitHub API...');
      
      const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`, {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'OCM-Sharing-App-Updater'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const release: GitHubRelease = await response.json();
      addDebugLog(`Found release: ${release.tag_name}`);
      addDebugLog(`Release name: ${release.name}`);
      addDebugLog(`Assets count: ${release.assets.length}`);

      // Find Windows installer
      const windowsAsset = release.assets.find(asset => 
        asset.name.includes('x64-setup.exe') && !asset.name.includes('.zip')
      );

      if (!windowsAsset) {
        addDebugLog('No Windows installer found in release assets');
        setUpdateStatus(prev => ({
          ...prev,
          checking: false,
          available: false,
        }));
        return null;
      }

      addDebugLog(`Found installer: ${windowsAsset.name} (${(windowsAsset.size / 1024 / 1024).toFixed(1)} MB)`);

      // Compare versions (simple string comparison for now)
      const currentVersion = updateStatus().currentVersion;
      const availableVersion = release.tag_name.replace('v', '');
      
      addDebugLog(`Version comparison: ${currentVersion} vs ${availableVersion}`);
      
      const updateAvailable = currentVersion !== availableVersion;
      
      if (updateAvailable) {
        addDebugLog('Update is available!');
        setUpdateStatus(prev => ({
          ...prev,
          checking: false,
          available: true,
          availableVersion,
          releaseNotes: release.body || 'No release notes available',
        }));
        return release;
      } else {
        addDebugLog('No update needed - versions match');
        setUpdateStatus(prev => ({
          ...prev,
          checking: false,
          available: false,
        }));
        return null;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addDebugLog(`ERROR: ${errorMessage}`);
      console.error('Custom update check failed:', error);
      
      setUpdateStatus(prev => ({
        ...prev,
        checking: false,
        error: errorMessage,
      }));
      return null;
    }
  };

  const installUpdate = async (release: GitHubRelease) => {
    addDebugLog('Starting custom update installation...');
    setUpdateStatus(prev => ({ ...prev, downloading: true, error: null, downloadProgress: 0 }));
    
    try {
      // Find the Windows installer asset
      const windowsAsset = release.assets.find(asset => 
        asset.name.includes('x64-setup.exe') && !asset.name.includes('.zip')
      );

      if (!windowsAsset) {
        throw new Error('Windows installer not found');
      }

      addDebugLog(`Downloading: ${windowsAsset.name}`);
      addDebugLog(`Download URL: ${windowsAsset.browser_download_url}`);

      // For private repos, we need to use the GitHub API download endpoint instead of browser_download_url
      const downloadUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/assets/${windowsAsset.id}`;
      addDebugLog(`Using API download URL: ${downloadUrl}`);

      // Download the installer using Tauri's HTTP client
      addDebugLog('Making authenticated request to GitHub API using Tauri HTTP...');
      
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      
      const response = await tauriFetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/octet-stream',
          'User-Agent': 'OCM-Sharing-App-Updater',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }).catch(fetchError => {
        addDebugLog(`Tauri fetch error: ${String(fetchError)}`);
        throw fetchError;
      });

      addDebugLog(`Response status: ${response.status} ${response.statusText || 'OK'}`);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        addDebugLog(`Error response body: ${errorText}`);
        throw new Error(`Download failed: ${response.status} ${response.statusText || 'Unknown'} - ${errorText}`);
      }

      addDebugLog('Download started, reading response...');
      
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      addDebugLog(`Downloaded ${(uint8Array.length / 1024 / 1024).toFixed(1)} MB`);
      
      setUpdateStatus(prev => ({ ...prev, downloading: false, installing: true }));
      addDebugLog('Saving installer to temp directory...');

      // Get the temp directory path using Tauri's path API
      const { tempDir } = await import('@tauri-apps/api/path');
      const tempDirPath = await tempDir();
      const tempPath = `${tempDirPath}ocm-sharing-app-update.exe`;
      
      addDebugLog(`Temp file path: ${tempPath}`);
      
      // Use Tauri's fs plugin to write the file
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      await writeFile(tempPath, uint8Array);
      
      addDebugLog(`Installer saved to: ${tempPath}`);
      addDebugLog('Executing installer...');

      // Execute the installer using shell plugin
      const { Command } = await import('@tauri-apps/plugin-shell');
      
      // Use PowerShell to start the installer (more reliable than cmd)
      const command = Command.create('powershell', ['-Command', `Start-Process -FilePath "${tempPath}"`]);
      await command.execute();
      
      addDebugLog('Installer executed, exiting current app...');
      
      // Exit the current app so the installer can replace it
      setTimeout(async () => {
        await exit(0);
      }, 1000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addDebugLog(`INSTALL ERROR: ${errorMessage}`);
      console.error('Custom install failed:', error);
      
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