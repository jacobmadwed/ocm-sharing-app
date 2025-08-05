import { readFile } from '@tauri-apps/plugin-fs';
import { convex } from './convex';
import { messageQueue } from './message-queue';
import { networkStatus } from './network-status';
import { SurveyResponse } from './survey-types';

export async function sendMultipleImagesViaEmail(
  imagePaths: string[], 
  emailAddress: string, 
  subject: string, 
  message: string,
  eventName?: string,
  disclaimerEnabled?: boolean,
  surveyResponses?: SurveyResponse[],
  useQueue: boolean = true
): Promise<string | void> {
  // If network is offline or useQueue is true, add to queue
  if (useQueue || !networkStatus.isOnline()) {
    console.log(`📧 Adding batch email to queue (${imagePaths.length} images to ${emailAddress})`);
    
    // Prepare attachments data for queue
    const attachments: Array<{filename: string, content: string, contentType: string}> = [];
    
    for (const imagePath of imagePaths) {
      const fileData = await readFile(imagePath);
      const fileName = imagePath.split('/').pop() || 'image.jpg';
      const contentType = getImageMimeType(fileName);
      
      // Convert to base64 for storage
      const base64Content = btoa(String.fromCharCode(...new Uint8Array(fileData)));
      
      attachments.push({
        filename: fileName,
        content: base64Content,
        contentType
      });
    }
    
    const messageId = messageQueue.addMessage('email', {
      to: [emailAddress],
      subject: `${subject}${eventName ? ` - ${eventName}` : ''}`,
      text: message,
      html: `<p>${message.replace(/\n/g, '<br>')}</p>${disclaimerEnabled ? '<p><small>This email was sent via OCM Sharing App</small></p>' : ''}`,
      attachments,
      eventName,
      disclaimerEnabled,
      surveyResponses
    }, 'high');
    
    if (!networkStatus.isOnline()) {
      console.log('📧 Email queued - will send when network is restored');
    }
    
    return messageId;
  }
  
  // Send immediately if online and not using queue
  return await sendMultipleImagesViaEmailDirect(imagePaths, emailAddress, subject, message, eventName, disclaimerEnabled, surveyResponses);
}

async function sendMultipleImagesViaEmailDirect(
  imagePaths: string[], 
  emailAddress: string, 
  subject: string, 
  message: string,
  eventName?: string,
  disclaimerEnabled?: boolean,
  surveyResponses?: SurveyResponse[]
): Promise<void> {
  try {
    console.log(`📧 Preparing to send ${imagePaths.length} images via email to ${emailAddress}`);
    
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
    
    console.log(`📤 Sending batch email with ${storageIds.length} images`);
    console.log(`📋 Survey responses being sent:`, surveyResponses);
    console.log(`📝 Event name being sent to Convex:`, eventName);
    console.log(`📝 Disclaimer enabled being sent to Convex:`, disclaimerEnabled);
    
    // Send email via Convex action with multiple images
    const emailResult = await convex.action("email:sendBatchImageEmail" as any, {
      toEmail: emailAddress,
      subject: subject,
      message: message,
      storageIds,
      filenames,
      eventName,
      disclaimerEnabled,
      surveyResponses,
    });
    
    if (emailResult.success) {
      console.log(`✅ Batch email sent successfully!`);
    } else {
      throw new Error('Batch email sending failed');
    }
    
  } catch (error) {
    console.error('❌ Batch email sending failed:', error);
    throw error;
  }
}

export async function sendImageViaEmail(
  imagePath: string, 
  emailAddress: string, 
  subject: string, 
  message: string,
  eventName?: string
): Promise<void> {
  try {
    console.log(`📧 Preparing to send email to ${emailAddress}`);
    
    // Read and upload the image to get storageId
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
    
    console.log(`📤 Sending email with storageId: ${storageId}`);
    
    // Send email via Convex action
    const emailResult = await convex.action("email:sendImageEmail" as any, {
      toEmail: emailAddress,
      subject: subject,
      message: message,
      storageId,
      filename: fileName,
      eventName,
    });
    
    if (emailResult.success) {
      console.log(`✅ Email sent successfully!`);
    } else {
      throw new Error('Email sending failed');
    }
    
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
}

// Simple email sending function for queue processor
export async function sendEmail(emailData: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{filename: string, content: string, contentType: string}>;
  eventName?: string;
  disclaimerEnabled?: boolean;
  surveyResponses?: SurveyResponse[];
}): Promise<void> {
  try {
    console.log(`📧 Sending queued email to ${emailData.to}`);
    
    if (emailData.attachments && emailData.attachments.length > 0) {
      // Handle email with attachments - upload to Convex first
      const storageIds: string[] = [];
      const filenames: string[] = [];
      
      for (const attachment of emailData.attachments) {
        // Convert base64 back to binary
        const binaryData = atob(attachment.content);
        const uint8Array = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          uint8Array[i] = binaryData.charCodeAt(i);
        }
        
        const file = new File([uint8Array], attachment.filename, {
          type: attachment.contentType
        });
        
        const uploadUrl = await convex.mutation("files:generateUploadUrl" as any);
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        
        if (!result.ok) {
          throw new Error(`Upload failed for ${attachment.filename}: ${result.statusText}`);
        }
        
        const { storageId } = await result.json();
        storageIds.push(storageId);
        filenames.push(attachment.filename);
      }
      
      // Send batch email
      const emailResult = await convex.action("email:sendBatchImageEmail" as any, {
        toEmail: emailData.to,
        subject: emailData.subject,
        message: emailData.text,
        storageIds,
        filenames,
        eventName: emailData.eventName,
        disclaimerEnabled: emailData.disclaimerEnabled,
        surveyResponses: emailData.surveyResponses,
      });
      
      if (!emailResult.success) {
        throw new Error('Batch email sending failed');
      }
    } else {
      // Send simple text email via Convex
      const emailResult = await convex.action("email:sendSimpleEmail" as any, {
        toEmail: emailData.to,
        subject: emailData.subject,
        message: emailData.text,
        html: emailData.html,
      });
      
      if (!emailResult.success) {
        throw new Error('Simple email sending failed');
      }
    }
    
    console.log(`✅ Queued email sent successfully to ${emailData.to}`);
  } catch (error) {
    console.error('❌ Queued email sending failed:', error);
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