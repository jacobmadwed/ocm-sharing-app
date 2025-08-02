import { Show, createSignal, createEffect, onCleanup, createMemo, For } from "solid-js";
import { readDir } from "@tauri-apps/plugin-fs";
import { convertFileSrc } from "@tauri-apps/api/core";
import { SmsModal } from "./SmsModal";
import { EmailModal } from "./EmailModal";
import { NotificationBanner } from "./NotificationBanner";

import { sendMultipleImagesViaSms } from "../lib/sms-service";
import { sendMultipleImagesViaEmail } from "../lib/email-service";
import { useEvent } from "../lib/event-context";

interface ImageGridProps {
  watchPath: string;
}



export function ImageGrid(props: ImageGridProps) {
  const [images, setImages] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal(false);
  const { selectedEvent } = useEvent();
  const [fileCount, setFileCount] = createSignal<number>(0);
  
  // Load persisted known files and add order for current watch path
  const loadPersistedState = () => {
    if (!props.watchPath) return { knownFiles: new Set<string>(), addOrder: new Map<string, number>() };
    
    try {
      const storageKey = `imageGrid_${btoa(props.watchPath)}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const { knownFiles: knownArray, addOrder: addOrderArray } = JSON.parse(stored);
        return {
          knownFiles: new Set<string>(knownArray || []),
          addOrder: new Map<string, number>(addOrderArray || [])
        };
      }
    } catch (error) {
      console.error("Error loading persisted image state:", error);
    }
    return { knownFiles: new Set<string>(), addOrder: new Map<string, number>() };
  };
  
  const [knownFiles, setKnownFiles] = createSignal<Set<string>>(new Set());
  const [addOrder, setAddOrder] = createSignal<Map<string, number>>(new Map());

  const [smsModalOpen, setSmsModalOpen] = createSignal(false);
  const [emailModalOpen, setEmailModalOpen] = createSignal(false);

  const [selectedImages, setSelectedImages] = createSignal<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = createSignal(false);
  
  // Notification state
  const [notification, setNotification] = createSignal<{message: string, type: "success" | "error"} | null>(null);


  // Persist state when it changes
  createEffect(() => {
    if (props.watchPath && knownFiles().size > 0) {
      try {
        const storageKey = `imageGrid_${btoa(props.watchPath)}`;
        const stateToStore = {
          knownFiles: Array.from(knownFiles()),
          addOrder: Array.from(addOrder().entries())
        };
        localStorage.setItem(storageKey, JSON.stringify(stateToStore));
        console.log(`💾 Persisted image state for ${props.watchPath}`);
      } catch (error) {
        console.error("Error persisting image state:", error);
      }
    }
  });

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.JPG', '.JPEG', '.PNG'];

  const isImageFile = (filename: string): boolean => {
    return imageExtensions.some(ext => 
      filename.toLowerCase().endsWith(ext.toLowerCase())
    );
  };

  const checkForChanges = async (): Promise<boolean> => {
    if (!props.watchPath) return false;
    
    try {
      const entries = await readDir(props.watchPath);
      const imageEntries = entries.filter(entry => entry.isFile && entry.name && isImageFile(entry.name));
      
      // Check if file count changed first (most common case)
      if (imageEntries.length !== fileCount()) {
        console.log(`📈 NEW IMAGE COUNT: ${fileCount()} -> ${imageEntries.length}`);
        setFileCount(imageEntries.length);
        return true;
      }
      
      // Also check if there are any new files we haven't seen before
      const currentKnownFiles = knownFiles();
      const newFileNames: string[] = [];
      
      for (const entry of imageEntries) {
        if (entry.name && !currentKnownFiles.has(entry.name)) {
          newFileNames.push(entry.name);
        }
      }
      
      if (newFileNames.length > 0) {
        console.log("🔍 New files detected during polling:", newFileNames);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("❌ Permission error during polling:", error);
      return false;
    }
  };

  const loadImages = async () => {
    await loadImagesInternal(false); // false = show loading, with debug logs
  };

  const loadImagesInternal = async (silent: boolean = false) => {
    if (!props.watchPath) return;
    
    if (!silent) setLoading(true);
    
    try {
      const entries = await readDir(props.watchPath);
      const imageEntries = entries.filter(entry => entry.isFile && entry.name && isImageFile(entry.name));
      
      setFileCount(imageEntries.length);
      
      // Get current files in folder
      const currentFiles = new Set<string>();
      const currentKnownFiles = knownFiles();
      const currentAddOrder = new Map(addOrder());
      
      // Find new files first
      const newFiles: string[] = [];
      
      for (const entry of imageEntries) {
        const fileName = entry.name || '';
        currentFiles.add(fileName);
        
        // If this is a NEW file (not in our known files), collect it
        if (!currentKnownFiles.has(fileName)) {
          newFiles.push(fileName);
        }
      }
      
      // Assign order numbers to new files
      if (newFiles.length > 0) {
        let nextOrderIndex = Math.max(...Array.from(currentAddOrder.values()), 0) + 1;
        
        // Assign order numbers to new files (highest number = most recent)
        for (let i = newFiles.length - 1; i >= 0; i--) {
          const fileName = newFiles[i];
          currentAddOrder.set(fileName, nextOrderIndex);
          if (!silent) {
            console.log(`🆕 NEW FILE DETECTED: ${fileName} - assigned order ${nextOrderIndex} 🔥 SHOULD BE FIRST`);
          }
          nextOrderIndex++;
        }
      }
      
      // Update our tracking
      setKnownFiles(currentFiles);
      setAddOrder(currentAddOrder);
      
      // Only rebuild the full list if we have new files, otherwise keep existing
      if (newFiles.length > 0) {
        // Create new image paths for the new files only
        const newImagePaths = newFiles
          .sort((a, b) => {
            const orderA = currentAddOrder.get(a) || 0;
            const orderB = currentAddOrder.get(b) || 0;
            return orderB - orderA; // Newest first
          })
          .map(fileName => {
            const separator = props.watchPath.endsWith('/') ? '' : '/';
            return `${props.watchPath}${separator}${fileName}`;
          });
        
        // Add new images to the front efficiently 
        setImages(prev => [...newImagePaths, ...prev]);
        
        if (!silent) {
          console.log('=== ADDING NEW IMAGES TO FRONT (EFFICIENT) ===');
          newImagePaths.forEach((path, index) => {
            const fileName = path.split('/').pop() || '';
            const order = currentAddOrder.get(fileName) || 0;
            console.log(`🆕 ${index + 1}. ${fileName} - order: ${order} - PREPENDED TO STORE`);
          });
          const currentImageCount = images().length;
          console.log(`📋 Total images: ${currentImageCount + newImagePaths.length} (${newImagePaths.length} new + ${currentImageCount} existing)`);
          console.log('=== END EFFICIENT UPDATE ===');
        }
      } else {
        // No new files, create sorted list normally (initial load)
        const sortedImages = Array.from(currentFiles)
          .sort((a, b) => {
            const orderA = currentAddOrder.get(a) || 0;
            const orderB = currentAddOrder.get(b) || 0;
            return orderB - orderA; // Newest (highest order) first
          })
          .map(fileName => {
            const separator = props.watchPath.endsWith('/') ? '' : '/';
            return `${props.watchPath}${separator}${fileName}`;
          });
        
        if (!silent) {
          console.log('=== INITIAL/FULL LOAD ===');
          sortedImages.slice(0, 5).forEach((path, index) => {
            const fileName = path.split('/').pop() || '';
            const order = currentAddOrder.get(fileName) || 0;
            const isNewest = index === 0 ? ' ⭐ TOP LEFT POSITION' : '';
            console.log(`${index + 1}. ${fileName} - order: ${order}${isNewest}`);
          });
          if (sortedImages.length > 5) {
            console.log(`... and ${sortedImages.length - 5} more images`);
          }
          console.log('=== END INITIAL LOAD ===');
        }
        
        setImages(sortedImages);
      }
    } catch (error) {
      console.error("Error reading directory:", error);
      setImages([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const silentCheckForNewImages = async () => {
    try {
      console.log("🔄 Polling for changes...");
      // Silently check for changes without showing loading state
      const hasChanges = await checkForChanges();
      if (hasChanges) {
        console.log("✅ Changes detected, reloading images with full debug");
        // Load images WITH debug info to see what's happening
        const currentLoading = loading();
        if (!currentLoading) {
          await loadImagesInternal(false); // false = show debug info
        }
      }
    } catch (error) {
      console.error("❌ Error during polling:", error);
      // Don't spam console with permission errors during polling
      // Just silently continue polling
    }
  };

  const handleImageClick = (imagePath: string) => {
    console.log('🖱️ Image clicked:', imagePath);
    
    // Multi-select mode: toggle selection with 5-image limit
    const currentSelected = [...selectedImages()];
    const wasSelected = currentSelected.includes(imagePath);
    
    if (wasSelected) {
      // Remove from selection
      const newSelected = currentSelected.filter(path => path !== imagePath);
      setSelectedImages(newSelected);
      console.log('❌ Removed from selection:', imagePath);
    } else {
      // Add to selection only if under limit
      if (currentSelected.length >= 5) {
        alert('Maximum 5 images can be selected at once');
        return;
      }
      const newSelected = [...currentSelected, imagePath];
      setSelectedImages(newSelected);
      console.log('✅ Added to selection:', imagePath);
    }
    
    setIsMultiSelectMode(selectedImages().length > 0);
    
    console.log('📋 Selected images count:', selectedImages().length);
    console.log('📋 All selected paths:', selectedImages());
  };

  const clearSelection = () => {
    setSelectedImages([]);
    setIsMultiSelectMode(false);
  };



  const handleBatchSms = async (phoneNumber: string, message: string) => {
    const imagePaths = selectedImages();
    if (imagePaths.length === 0) return;
    
    console.log(`📱 Starting background SMS send: ${imagePaths.length} images to ${phoneNumber}`);
    
    // Clear selection immediately
    clearSelection();
    
    // Show simple success notification
    setNotification({ 
      message: "Sent", 
      type: "success" 
    });
    
    // Send in background
    sendMultipleImagesViaSms(imagePaths, phoneNumber, message, selectedEvent()?.name)
      .then(() => {
        console.log("✅ Background SMS batch sent successfully!");
      })
      .catch(error => {
        console.error("❌ Background SMS batch failed:", error);
        // Could show error notification here if needed
      });
  };

  const handleBatchEmail = async (emailAddress: string, subject: string, message: string) => {
    const imagePaths = selectedImages();
    if (imagePaths.length === 0) return;
    
    console.log(`📧 Starting background email send: ${imagePaths.length} images to ${emailAddress}`);
    
    // Clear selection immediately
    clearSelection();
    
    // Show simple success notification
    setNotification({ 
      message: "Sent", 
      type: "success" 
    });
    
    // Send in background
    sendMultipleImagesViaEmail(imagePaths, emailAddress, subject, message, selectedEvent()?.name)
      .then(() => {
        console.log("✅ Background email batch sent successfully!");
      })
      .catch(error => {
        console.error("❌ Background email batch failed:", error);
        // Could show error notification here if needed
      });
  };

  createEffect(() => {
    if (props.watchPath) {
      // Load persisted state first, then load images
      const { knownFiles: persistedKnownFiles, addOrder: persistedAddOrder } = loadPersistedState();
      setKnownFiles(persistedKnownFiles);
      setAddOrder(persistedAddOrder);
      console.log(`📂 Loaded persisted state for ${props.watchPath}: ${persistedKnownFiles.size} known files, ${persistedAddOrder.size} ordered files`);
      
      // Now load images with the persisted state
      loadImages();
      
      // Set up silent background checking every 1 second for faster detection
      const silentInterval = setInterval(() => {
        silentCheckForNewImages();
      }, 1000);
      
      // Cleanup interval
      onCleanup(() => {
        clearInterval(silentInterval);
      });
    }
  });

  return (
    <div class="p-4">
      <Show when={props.watchPath} fallback={
        <div class="text-center text-muted-foreground py-8">
          <p>No folder selected. Click the gear icon to choose a folder.</p>
        </div>
      }>
        <div>
          <Show when={loading()}>
          <div class="flex items-center justify-center py-8">
            <div class="flex items-center space-x-2 text-muted-foreground">
              <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <p>Loading images...</p>
            </div>
          </div>
        </Show>

        <Show when={!loading() && images().length === 0}>
          <div class="text-center py-12">
            <div class="mx-auto w-12 h-12 mb-4 text-muted-foreground">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p class="text-muted-foreground">No images found in the selected folder.</p>
          </div>
        </Show>

        <Show when={!loading() && images().length > 0}>
          <div style="width: 80%; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; justify-items: center;">
            <For each={images()}>
              {(imagePath) => {
                const convertedSrc = convertFileSrc(imagePath);
                
                // Create a reactive computation for selection state
                const isSelected = createMemo(() => selectedImages().includes(imagePath));
                const isAtLimit = createMemo(() => selectedImages().length >= 5);
                const canSelect = createMemo(() => isSelected() || !isAtLimit());
                
                // Only log the first few renders to avoid spam
                const fileName = imagePath.split('/').pop() || '';
                const imageIndex = images().indexOf(imagePath);
                if (imageIndex < 3) {
                  console.log(`🎨 Rendering #${imageIndex + 1}: ${fileName}: selected=${isSelected()}`);
                }
                
                return (
                  <div 
                    style={`position: relative; width: 250px; height: 250px; border: ${isSelected() ? '4px solid #3b82f6' : '2px solid gray'}; border-radius: 8px; overflow: hidden; cursor: pointer;`}
                    onClick={() => handleImageClick(imagePath)}
                  >
                    <img
                      src={convertedSrc}
                      alt="Gallery image"
                      style={`width: 100%; height: 100%; object-fit: contain; background: white; ${!canSelect() && !isSelected() ? 'opacity: 0.3;' : ''}`}
                      loading="lazy"
                    />
                    
                    <Show when={isSelected()}>
                      <div style="position: absolute; top: 8px; right: 8px; background: #22c55e; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                        ✓
                      </div>
                    </Show>
                    
                    <Show when={!canSelect() && !isSelected()}>
                      <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
                        <div style="background: #f59e0b; color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">
                          MAX REACHED
                        </div>
                      </div>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
        </div>
      </Show>

      {/* Sticky Action Buttons */}
      <Show when={isMultiSelectMode()}>
        <div style="position: fixed; right: 20px; top: 50%; transform: translateY(-50%); z-index: 1000; display: flex; flex-direction: column; gap: 16px;">
          {/* Selection Count */}
          <div style={`background: white; border: 2px solid ${selectedImages().length >= 5 ? '#f59e0b' : '#10b981'}; border-radius: 12px; padding: 8px 12px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);`}>
            <div style="font-size: 12px; color: #666; margin-bottom: 2px;">Selected</div>
            <div style={`font-size: 18px; font-weight: bold; color: ${selectedImages().length >= 5 ? '#f59e0b' : '#10b981'};`}>
              {selectedImages().length}/5
            </div>
            <Show when={selectedImages().length >= 5}>
              <div style="font-size: 10px; color: #f59e0b; margin-top: 2px;">MAX</div>
            </Show>
          </div>
          
          {/* SMS Button */}
          <Show when={selectedEvent()?.smsEnabled ?? true}>
            <button
              onClick={() => setSmsModalOpen(true)}
              style="width: 60px; height: 60px; background: black; color: white; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: pointer; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4); transition: all 0.2s;"
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M21 15.46l-5.27-.61-2.52 2.52c-2.83-1.44-5.15-3.75-6.59-6.59l2.53-2.52L8.54 3H3.03C2.45 13.18 10.82 21.55 21 20.97v-5.51z" fill="white"/>
              </svg>
            </button>
          </Show>
          
          {/* Email Button */}
          <Show when={selectedEvent()?.emailEnabled ?? true}>
            <button
              onClick={() => setEmailModalOpen(true)}
              style="width: 60px; height: 60px; background: black; color: white; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: pointer; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4); transition: all 0.2s;"
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="22,6 12,13 2,6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </Show>
          
          {/* Clear Selection Button */}
          <button
            onClick={clearSelection}
            style="width: 60px; height: 60px; background: black; color: white; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: pointer; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4); transition: all 0.2s;"
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            ✕
          </button>
        </div>
      </Show>

      {/* Batch SMS Modal */}
      <SmsModal
        isOpen={smsModalOpen()}
        imagePath=""
        onClose={() => {
          console.log('🚪 Batch SMS modal close clicked');
          setSmsModalOpen(false);
        }}
        onSendSms={(_, phoneNumber, message) => handleBatchSms(phoneNumber, message || "Here's your image!")}
      />

      {/* Batch Email Modal */}
      <EmailModal
        isOpen={emailModalOpen()}
        imagePath=""
        onClose={() => {
          console.log('🚪 Batch email modal close clicked');
          setEmailModalOpen(false);
        }}
        onSendEmail={(_, emailAddress, subject, message) => handleBatchEmail(emailAddress, subject, message)}
      />
      
      {/* Notification Banner */}
      <Show when={notification()}>
        <NotificationBanner
          message={notification()!.message}
          type={notification()!.type}
          onClose={() => setNotification(null)}
        />
      </Show>

    </div>
  );
}