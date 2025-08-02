import { readFile } from '@tauri-apps/plugin-fs';
import { convex } from './convex';

export async function sendMultipleImagesViaEmail(
  imagePaths: string[], 
  emailAddress: string, 
  subject: string, 
  message: string,
  eventName?: string,
  disclaimerEnabled?: boolean
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
    
    // Send email via Convex action with multiple images
    const emailResult = await convex.action("email:sendBatchImageEmail" as any, {
      toEmail: emailAddress,
      subject: subject,
      message: message,
      storageIds,
      filenames,
      eventName,
      disclaimerEnabled,
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