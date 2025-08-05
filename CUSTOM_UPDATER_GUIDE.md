# Custom Tauri Updater for Private GitHub Repositories

This guide explains how to implement a custom auto-updater for Tauri applications that works with private GitHub repositories, bypassing the limitations of Tauri's built-in updater.

## Overview

The built-in Tauri updater has several limitations:
- Requires signature validation with complex key management
- Doesn't work well with private repositories
- Limited control over the update process

This custom solution provides:
- ✅ Private GitHub repository support
- ✅ Personal access token authentication
- ✅ Full control over update flow
- ✅ Detailed logging for debugging
- ✅ Cross-platform compatibility

## Implementation Steps

### 1. Install Required Dependencies

Add the necessary Tauri plugins and packages:

```bash
# Add Tauri plugins to Cargo.toml
# In src-tauri/Cargo.toml, add:
tauri-plugin-http = "2"
tauri-plugin-fs = "2"
tauri-plugin-process = "2"
tauri-plugin-shell = "2"

# Add frontend packages
pnpm add @tauri-apps/plugin-http @tauri-apps/api
```

### 2. Configure Rust Plugins

In `src-tauri/src/lib.rs`, initialize the plugins:

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 3. Configure Permissions

In `src-tauri/capabilities/app.json`, add the required permissions:

```json
{
  "permissions": [
    "core:default",
    "fs:default",
    {
      "identifier": "fs:allow-write-file",
      "allow": [
        { "path": "$TEMP/*" },
        { "path": "$TMP/*" }
      ]
    },
    "fs:allow-temp-write",
    "process:allow-restart",
    "process:allow-exit",
    "shell:allow-execute",
    "shell:allow-open",
    {
      "identifier": "shell:allow-execute",
      "allow": [
        {
          "name": "powershell",
          "cmd": "powershell",
          "args": ["-Command", { "validator": "Start-Process -FilePath \".*\"" }]
        }
      ]
    },
    "http:default",
    {
      "identifier": "http:allow-fetch",
      "allow": [
        {
          "url": "https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/*"
        }
      ]
    }
  ]
}
```

### 4. Create the Custom Updater

Create `src/lib/custom-updater.ts`:

```typescript
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

// REPLACE THESE WITH YOUR VALUES
const GITHUB_TOKEN = 'your_personal_access_token_here';
const REPO_OWNER = 'your_github_username';
const REPO_NAME = 'your_repository_name';

export function createCustomUpdater() {
  const [updateStatus, setUpdateStatus] = createSignal<CustomUpdateStatus>({
    checking: false,
    available: false,
    downloading: false,
    installing: false,
    error: null,
    currentVersion: '0.1.0', // SET YOUR CURRENT VERSION
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
          'User-Agent': 'Custom-Tauri-Updater'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const release: GitHubRelease = await response.json();
      addDebugLog(`Found release: ${release.tag_name}`);
      addDebugLog(`Assets count: ${release.assets.length}`);

      // Find Windows installer (adjust pattern for your naming convention)
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

      // Compare versions
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

      // For private repos, use GitHub API download endpoint
      const downloadUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/assets/${windowsAsset.id}`;
      addDebugLog(`Using API download URL: ${downloadUrl}`);

      // Download using Tauri's HTTP client
      addDebugLog('Making authenticated request to GitHub API using Tauri HTTP...');
      
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      
      const response = await tauriFetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/octet-stream',
          'User-Agent': 'Custom-Tauri-Updater',
          'X-GitHub-Api-Version': '2022-11-28'
        }
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

      // Get temp directory and save file
      const { tempDir } = await import('@tauri-apps/api/path');
      const tempDirPath = await tempDir();
      const tempPath = `${tempDirPath}your-app-update.exe`; // CHANGE THIS NAME
      
      addDebugLog(`Temp file path: ${tempPath}`);
      
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      await writeFile(tempPath, uint8Array);
      
      addDebugLog(`Installer saved to: ${tempPath}`);
      addDebugLog('Executing installer...');

      // Execute installer using PowerShell
      const { Command } = await import('@tauri-apps/plugin-shell');
      const command = Command.create('powershell', ['-Command', `Start-Process -FilePath "${tempPath}"`]);
      await command.execute();
      
      addDebugLog('Installer executed, exiting current app...');
      
      // Exit current app so installer can replace it
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
```

### 5. Integrate into Your UI

Add an updates tab to your admin interface:

```typescript
import { createCustomUpdater } from '../lib/custom-updater';

export function AdminComponent() {
  const { updateStatus, checkForUpdates, installUpdate } = createCustomUpdater();
  const [pendingRelease, setPendingRelease] = createSignal(null);

  const handleCheckForUpdates = async () => {
    const release = await checkForUpdates();
    setPendingRelease(release);
  };

  const handleInstallUpdate = async () => {
    const release = pendingRelease();
    if (release) {
      await installUpdate(release);
    }
  };

  return (
    <div>
      {/* Status Display */}
      <div>
        <span>Current Version: v{updateStatus().currentVersion}</span>
        <span>Status: {updateStatus().checking ? 'Checking...' : 
                      updateStatus().error ? 'Error' :
                      updateStatus().available ? `Update available (v${updateStatus().availableVersion})` : 'Up to date'}</span>
      </div>

      {/* Error Display */}
      {updateStatus().error && (
        <div style="color: red;">
          {updateStatus().error}
        </div>
      )}

      {/* Debug Logs */}
      {updateStatus().debugLogs.length > 0 && (
        <div>
          <h4>Debug Logs:</h4>
          <div style="font-family: monospace; max-height: 150px; overflow-y: auto;">
            {updateStatus().debugLogs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div>
        <button onClick={handleCheckForUpdates} disabled={updateStatus().checking}>
          {updateStatus().checking ? 'Checking...' : 'Check for Updates'}
        </button>
        
        {updateStatus().available && (
          <button onClick={handleInstallUpdate} disabled={updateStatus().downloading || updateStatus().installing}>
            {updateStatus().downloading ? 'Downloading...' : 
             updateStatus().installing ? 'Installing...' : 
             'Install Update'}
          </button>
        )}
      </div>
    </div>
  );
}
```

## Configuration Required

### 1. GitHub Personal Access Token

Create a personal access token with `repo` permissions:
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token with `repo` scope
3. Replace `your_personal_access_token_here` in the code

### 2. Repository Settings

Update these constants in `custom-updater.ts`:
- `REPO_OWNER`: Your GitHub username
- `REPO_NAME`: Your repository name  
- `currentVersion`: Your app's current version
- `tempPath`: Update the temp file name pattern

### 3. Asset Name Pattern

Adjust the asset finding logic to match your build output:
```typescript
// Find your installer pattern
const windowsAsset = release.assets.find(asset => 
  asset.name.includes('your-app-name') && 
  asset.name.includes('setup.exe')
);
```

## Build Process

Use this command to build your Windows installer:
```bash
pnpm tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc
```

The installer will be created at:
```
src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/your-app_version_x64-setup.exe
```

## Release Process

1. Build your app with the new version number in `tauri.conf.json`
2. Create a new GitHub release with the version tag
3. Upload the generated `.exe` installer to the release
4. Users can now check for updates and install automatically

## Troubleshooting

### Common Issues

1. **Authentication errors**: Check your GitHub token has `repo` permissions
2. **Permission errors**: Verify all permissions are added to `app.json`
3. **Download errors**: Ensure you're using the GitHub API endpoint for private repos
4. **Execution errors**: Check PowerShell permissions on target systems

### Debug Logging

The updater includes comprehensive logging. Check the debug logs section in your UI to troubleshoot issues.

### Testing

Test the updater by:
1. Building version 0.1.0
2. Creating a GitHub release for 0.1.1
3. Running the 0.1.0 app and checking for updates

## Security Considerations

- Store GitHub tokens securely (consider using environment variables for production)
- Validate downloaded files before execution
- Consider code signing for production releases
- Implement version validation to prevent downgrade attacks

## Advantages Over Built-in Updater

- ✅ Works with private repositories
- ✅ No signature validation complexity
- ✅ Full control over update process
- ✅ Detailed logging and error handling
- ✅ Customizable UI and UX
- ✅ Works cross-platform

This custom updater provides a robust, flexible solution for auto-updating Tauri applications from private GitHub repositories.