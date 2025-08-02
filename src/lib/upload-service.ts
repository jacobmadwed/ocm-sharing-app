import { readFile } from '@tauri-apps/plugin-fs';
import { convex } from './convex';

export async function uploadImageToConvex(imagePath: string): Promise<string> {
  try {
    // Read the file as binary data
    const fileData = await readFile(imagePath);
    const fileName = imagePath.split('/').pop() || 'image.jpg';
    
    // Create a File object from the binary data (Uint8Array)
    const file = new File([new Uint8Array(fileData)], fileName, {
      type: getImageMimeType(fileName)
    });

    // Step 1: Get upload URL from Convex
    const uploadUrl = await convex.mutation("files:generateUploadUrl" as any);
    
    // Step 2: Upload file to Convex
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    
    if (!result.ok) {
      throw new Error(`Upload failed: ${result.statusText}`);
    }
    
    const { storageId } = await result.json();
    
    // Step 3: Save file metadata to database
    await convex.mutation("images:create" as any, {
      storageId,
      filename: fileName,
      contentType: file.type,
      size: file.size,
      uploadedAt: Date.now(),
    });
    
    // Step 4: Get the public URL
    const fileUrl = await convex.query("files:getUrl" as any, { storageId });
    
    return fileUrl;
    
  } catch (error) {
    console.error('Upload error:', error);
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