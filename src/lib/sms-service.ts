import { readFile } from '@tauri-apps/plugin-fs';
import { convex } from './convex';
import { uploadImageToConvex } from './upload-service';
import { messageQueue } from './message-queue';
import { networkStatus } from './network-status';
import { SurveyResponse } from './survey-types';

export async function sendMultipleImagesViaSms(imagePaths: string[], phoneNumber: string, message?: string, eventName?: string, disclaimerEnabled?: boolean, surveyResponses?: SurveyResponse[], useQueue: boolean = true): Promise<string | void> {
  // If network is offline or useQueue is true, add to queue
  if (useQueue || !networkStatus.isOnline()) {
    console.log(`📱 Adding batch SMS to queue (${imagePaths.length} images to ${phoneNumber})`);
    
    // Convert images to base64 for storage
    const mediaUrls: string[] = [];
    
    for (const imagePath of imagePaths) {
      const fileData = await readFile(imagePath);
      const fileName = imagePath.split('/').pop() || 'image.jpg';
      const contentType = getImageMimeType(fileName);
      
      // Convert to base64 data URL
      const base64Content = btoa(String.fromCharCode(...new Uint8Array(fileData)));
      const dataUrl = `data:${contentType};base64,${base64Content}`;
      mediaUrls.push(dataUrl);
    }
    
    const messageId = messageQueue.addMessage('mms', {
      to: [formatPhoneNumber(phoneNumber)],
      message: message || "Here's your image!",
      mediaUrls,
      eventName,
      disclaimerEnabled,
      surveyResponses
    }, 'high');
    
    if (!networkStatus.isOnline()) {
      console.log('📱 SMS queued - will send when network is restored');
    }
    
    return messageId;
  }
  
  // Send immediately if online and not using queue
  return await sendMultipleImagesViaSmsDirect(imagePaths, phoneNumber, message, eventName, disclaimerEnabled, surveyResponses);
}

async function sendMultipleImagesViaSmsDirect(imagePaths: string[], phoneNumber: string, message?: string, eventName?: string, disclaimerEnabled?: boolean, surveyResponses?: SurveyResponse[]): Promise<void> {
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
    console.log(`📋 Survey responses being sent:`, surveyResponses);
    console.log(`📝 Event name being sent to Convex:`, eventName);
    console.log(`📝 Disclaimer enabled being sent to Convex:`, disclaimerEnabled);
    
    // Send SMS via Convex action with multiple images
    const smsResult = await convex.action("sms:sendBatchImageSms" as any, {
      phoneNumber: formatPhoneNumber(phoneNumber),
      storageIds,
      filenames,
      message: message || "Here's your image!",
      eventName,
      disclaimerEnabled,
      surveyResponses,
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

// Simple SMS sending function for queue processor
export async function sendSMS(
  phoneNumber: string, 
  message: string, 
  mediaUrls?: string[], 
  eventName?: string, 
  disclaimerEnabled?: boolean, 
  surveyResponses?: SurveyResponse[]
): Promise<void> {
  try {
    console.log(`📱 Sending queued ${mediaUrls ? 'MMS' : 'SMS'} to ${phoneNumber}`);
    
    if (mediaUrls && mediaUrls.length > 0) {
      // Handle MMS with media attachments
      const storageIds: string[] = [];
      const filenames: string[] = [];
      
      for (let i = 0; i < mediaUrls.length; i++) {
        const dataUrl = mediaUrls[i];
        
        // Parse data URL
        const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
        if (!matches) {
          throw new Error(`Invalid data URL format for media ${i}`);
        }
        
        const contentType = matches[1];
        const base64Data = matches[2];
        
        // Convert base64 back to binary
        const binaryData = atob(base64Data);
        const uint8Array = new Uint8Array(binaryData.length);
        for (let j = 0; j < binaryData.length; j++) {
          uint8Array[j] = binaryData.charCodeAt(j);
        }
        
        const fileName = `image_${i + 1}.${contentType.split('/')[1] || 'jpg'}`;
        const file = new File([uint8Array], fileName, { type: contentType });
        
        // Upload to Convex
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
      
      // Send MMS via Convex
      const smsResult = await convex.action("sms:sendBatchImageSms" as any, {
        phoneNumber: formatPhoneNumber(phoneNumber),
        storageIds,
        filenames,
        message,
        eventName,
        disclaimerEnabled,
        surveyResponses,
      });
      
      if (!smsResult.success) {
        throw new Error('MMS sending failed');
      }
    } else {
      // Send simple SMS via Convex
      const smsResult = await convex.action("sms:sendSimpleSms" as any, {
        phoneNumber: formatPhoneNumber(phoneNumber),
        message,
      });
      
      if (!smsResult.success) {
        throw new Error('SMS sending failed');
      }
    }
    
    console.log(`✅ Queued ${mediaUrls ? 'MMS' : 'SMS'} sent successfully to ${phoneNumber}`);
  } catch (error) {
    console.error('❌ Queued SMS/MMS sending failed:', error);
    throw error;
  }
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