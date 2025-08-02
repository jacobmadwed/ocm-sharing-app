import { readFile } from '@tauri-apps/plugin-fs';
import { convex } from './convex';
import { uploadImageToConvex } from './upload-service';

export async function sendMultipleImagesViaSms(imagePaths: string[], phoneNumber: string, message?: string, eventName?: string): Promise<void> {
  try {
    console.log(`📱 Preparing to send ${imagePaths.length} images via SMS to ${phoneNumber}`);
    
    // Upload all images and collect their storageIds
    const storageIds: string[] = [];
    const filenames: string[] = [];
    
    for (const imagePath of imagePaths) {
      const fileData = await readFile(imagePath);
      const fileName = imagePath.split('/').pop() || 'image.jpg';
      
      // Create a File object from the binary data (Uint8Array)
      const file = new File([new Uint8Array(fileData)], fileName, {
        type: getImageMimeType(fileName)
      });

      // Upload to get storageId
      const uploadUrl = await convex.mutation("files:generateUploadUrl" as any);
      
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!result.ok) {
        throw new Error(`Upload failed for ${fileName}: ${result.statusText}`);
      }
      
      const { storageId } = await result.json();
      storageIds.push(storageId);
      filenames.push(fileName);
    }
    
    console.log(`📤 Sending batch SMS with ${storageIds.length} images`);
    
    // Send SMS via Convex action with multiple images
    const smsResult = await convex.action("sms:sendBatchImageSms" as any, {
      phoneNumber: formatPhoneNumber(phoneNumber),
      storageIds,
      filenames,
      message: message || "Here's your image!",
      eventName,
    });
    
    if (smsResult.success) {
      console.log(`✅ Batch SMS sent successfully! Sent ${smsResult.messageCount} separate messages with ${smsResult.imageCount} total images`);
      console.log(`Message SIDs: ${smsResult.messageSids.join(', ')}`);
    } else {
      throw new Error('Batch SMS sending failed');
    }
    
  } catch (error) {
    console.error('❌ Batch SMS sending failed:', error);
    throw error;
  }
}

export async function sendImageViaSms(imagePath: string, phoneNumber: string, message?: string, eventName?: string): Promise<void> {
  try {
    console.log(`📱 Preparing to send SMS to ${phoneNumber}`);
    
    // First upload the image to Convex if not already uploaded
    // We'll need to get the storageId for the image
    const fileData = await readFile(imagePath);
    const fileName = imagePath.split('/').pop() || 'image.jpg';
    
    // Create a File object from the binary data (Uint8Array)
    const file = new File([new Uint8Array(fileData)], fileName, {
      type: getImageMimeType(fileName)
    });

    // Upload to get storageId
    const uploadUrl = await convex.mutation("files:generateUploadUrl" as any);
    
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    
    if (!result.ok) {
      throw new Error(`Upload failed: ${result.statusText}`);
    }
    
    const { storageId } = await result.json();
    
    console.log(`📤 Sending SMS with storageId: ${storageId}`);
    
    // Send SMS via Convex action
    const smsResult = await convex.action("sms:sendImageSms" as any, {
      phoneNumber: formatPhoneNumber(phoneNumber),
      storageId,
      filename: fileName,
      message: message || "Here's your image!",
      eventName,
    });
    
    if (smsResult.success) {
      console.log(`✅ SMS sent successfully! Message SID: ${smsResult.messageSid}`);
    } else {
      throw new Error('SMS sending failed');
    }
    
  } catch (error) {
    console.error('❌ SMS sending failed:', error);
    throw error;
  }
}

function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // If it doesn't start with +, add +1 for US numbers
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      cleaned = '+1' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      cleaned = '+' + cleaned;
    }
  }
  
  return cleaned;
}

function getImageMimeType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'bmp':
      return 'image/bmp';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'image/jpeg';
  }
}