import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const sendImageEmail = action({
  args: {
    toEmail: v.string(),
    subject: v.string(),
    message: v.string(),
    storageId: v.string(),
    filename: v.string(),
    eventName: v.optional(v.string()),
  },
  handler: async (ctx, { toEmail, subject, message, storageId, filename, eventName }) => {
    try {
      console.log("Starting email send process...");
      
      // Get the file URL from storage
      const fileUrl = await ctx.storage.getUrl(storageId);
      console.log("File URL:", fileUrl);
      
      if (!fileUrl) {
        throw new Error("File not found");
      }

      // Download the file to get base64 content for attachment
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error("Failed to download file");
      }
      
      const fileBuffer = await fileResponse.arrayBuffer();
      console.log("File size:", fileBuffer.byteLength, "bytes");
      
      // Check file size limit (SendGrid has ~30MB limit but we'll keep it reasonable)
      if (fileBuffer.byteLength > 25 * 1024 * 1024) { // 25MB limit
        throw new Error("File too large for email attachment (max 25MB)");
      }
      
      // Convert ArrayBuffer to base64 without using Buffer (not available in Convex)
      const uint8Array = new Uint8Array(fileBuffer);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64Content = btoa(binary);
      console.log("Base64 content length:", base64Content.length);
      
      // Determine MIME type from filename
      const getMimeType = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        switch (ext) {
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
      };

      // SendGrid configuration
      const sendGridApiKey = process.env.SENDGRID_API_KEY || "YOUR_SENDGRID_API_KEY";
      const fromEmail = "sharing@onechancemedia.com";

      console.log("SendGrid config check:", {
        apiKey: sendGridApiKey ? "SET" : "MISSING",
        fromEmail: fromEmail
      });

      if (!sendGridApiKey) {
        throw new Error("SendGrid API key missing");
      }

      // Send email using SendGrid API
      const emailData = {
        personalizations: [{
          to: [{ email: toEmail }],
          subject: subject
        }],
        from: { email: fromEmail, name: "One Chance Media" },
        content: [
          {
            type: "text/html",
            value: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <p style="color: #666; line-height: 1.6;">${message}</p>
              </div>
            `
          }
        ],
        attachments: [{
          content: base64Content,
          filename: filename,
          type: getMimeType(filename),
          disposition: "attachment"
        }]
      };

      console.log("Sending to SendGrid:", {
        to: toEmail,
        from: fromEmail,
        subject: subject,
        attachmentSize: base64Content.length
      });

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendGridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      console.log("SendGrid response status:", response.status);
      console.log("SendGrid response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error("SendGrid error response:", errorText);
        throw new Error(`SendGrid error: ${response.status} ${errorText}`);
      }

      // For 202 Accepted (SendGrid's success response), there might be no body
      let responseData = null;
      try {
        const responseText = await response.text();
        if (responseText) {
          responseData = JSON.parse(responseText);
        }
      } catch (e) {
        // No JSON response body is normal for SendGrid success
        console.log("No JSON response body (this is normal for SendGrid success)");
      }

      console.log("Email sent successfully", responseData);
      
      // Log email delivery status to Convex
      try {
        await ctx.runMutation(internal.deliveryLogs.logEmailDelivery, {
          recipient: toEmail,
          status: "accepted", // SendGrid uses "accepted" for successful submissions
          providerResponse: responseData ? JSON.stringify(responseData) : undefined,
          imageCount: 1,
          eventName: eventName,
        });
        console.log("Email delivery logged successfully");
      } catch (logError) {
        console.error("Failed to log email delivery:", logError);
        // Don't fail the main operation if logging fails
      }
      
      return {
        success: true,
        status: "sent",
      };
      
    } catch (error) {
      console.error("Email action error:", error);
      
      // Log email failure to Convex
      try {
        await ctx.runMutation(internal.deliveryLogs.logEmailDelivery, {
          recipient: toEmail,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
          imageCount: 1,
          eventName: eventName,
        });
        console.log("Email failure logged successfully");
      } catch (logError) {
        console.error("Failed to log email failure:", logError);
      }
      
      throw error;
    }
  },
});

export const sendBatchImageEmail = action({
  args: {
    toEmail: v.string(),
    subject: v.string(),
    message: v.string(),
    storageIds: v.array(v.string()),
    filenames: v.array(v.string()),
    eventName: v.optional(v.string()),
    disclaimerEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, { toEmail, subject, message, storageIds, filenames, eventName, disclaimerEnabled }) => {
    try {
      console.log(`Starting batch email send process for ${storageIds.length} images...`);
      
      // Get all files and convert to base64 attachments
      const attachments: any[] = [];
      
      for (let i = 0; i < storageIds.length; i++) {
        const storageId = storageIds[i];
        const filename = filenames[i];
        
        // Get the file URL from storage
        const fileUrl = await ctx.storage.getUrl(storageId);
        if (!fileUrl) {
          throw new Error(`File not found for storage ID: ${storageId}`);
        }

        // Download the file to get base64 content for attachment
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
          throw new Error(`Failed to download file: ${filename}`);
        }
        
        const fileBuffer = await fileResponse.arrayBuffer();
        console.log(`File ${filename} size:`, fileBuffer.byteLength, "bytes");
        
        // Check file size limit per attachment
        if (fileBuffer.byteLength > 25 * 1024 * 1024) { // 25MB limit per file
          console.warn(`Skipping ${filename} - too large (${fileBuffer.byteLength} bytes)`);
          continue;
        }
        
        // Convert ArrayBuffer to base64
        const uint8Array = new Uint8Array(fileBuffer);
        let binary = '';
        for (let j = 0; j < uint8Array.length; j++) {
          binary += String.fromCharCode(uint8Array[j]);
        }
        const base64Content = btoa(binary);
        
        // Determine MIME type from filename
        const getMimeType = (filename: string) => {
          const ext = filename.split('.').pop()?.toLowerCase();
          switch (ext) {
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
        };

        attachments.push({
          content: base64Content,
          filename: filename,
          type: getMimeType(filename),
          disposition: "attachment"
        });
      }

      // SendGrid configuration
      const sendGridApiKey = process.env.SENDGRID_API_KEY || "YOUR_SENDGRID_API_KEY";
      const fromEmail = "sharing@onechancemedia.com";

      console.log("SendGrid batch config check:", {
        apiKey: sendGridApiKey ? "SET" : "MISSING",
        fromEmail: fromEmail,
        attachmentCount: attachments.length
      });

      if (!sendGridApiKey) {
        throw new Error("SendGrid API key missing");
      }

      // Send email using SendGrid API
      const emailData = {
        personalizations: [{
          to: [{ email: toEmail }],
          subject: subject
        }],
        from: { email: fromEmail, name: "One Chance Media" },
        content: [
          {
            type: "text/html",
            value: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <p style="color: #666; line-height: 1.6;">${message}</p>
              </div>
            `
          }
        ],
        attachments: attachments
      };

      console.log("Sending batch email to SendGrid:", {
        to: toEmail,
        from: fromEmail,
        subject: subject,
        attachmentCount: attachments.length,
        totalSize: attachments.reduce((sum, att) => sum + att.content.length, 0)
      });

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendGridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      console.log("SendGrid batch response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("SendGrid batch error response:", errorText);
        throw new Error(`SendGrid error: ${response.status} ${errorText}`);
      }

      console.log("Batch email sent successfully");
      
      // Log batch email delivery status to Convex
      try {
        await ctx.runMutation(internal.deliveryLogs.logEmailDelivery, {
          recipient: toEmail,
          status: "accepted", // SendGrid uses "accepted" for successful submissions
          imageCount: attachments.length,
          eventName: eventName,
          disclaimerEnabled: disclaimerEnabled,
        });
        console.log("Batch email delivery logged successfully");
      } catch (logError) {
        console.error("Failed to log batch email delivery:", logError);
        // Don't fail the main operation if logging fails
      }
      
      return {
        success: true,
        status: "sent",
        attachmentCount: attachments.length
      };
      
    } catch (error) {
      console.error("Batch email action error:", error);
      
      // Log batch email failure to Convex
      try {
        await ctx.runMutation(internal.deliveryLogs.logEmailDelivery, {
          recipient: toEmail,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
          imageCount: storageIds.length,
          eventName: eventName,
          disclaimerEnabled: disclaimerEnabled,
        });
        console.log("Batch email failure logged successfully");
      } catch (logError) {
        console.error("Failed to log batch email failure:", logError);
      }
      
      throw error;
    }
  },
});