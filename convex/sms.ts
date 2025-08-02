import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const sendImageSms = action({
  args: {
    phoneNumber: v.string(),
    storageId: v.string(),
    filename: v.string(),
    message: v.optional(v.string()),
    eventName: v.optional(v.string()),
  },
  handler: async (ctx, { phoneNumber, storageId, filename, message, eventName }) => {
    try {
      console.log("Starting SMS send process...");
      
      // Get the file URL from storage
      const fileUrl = await ctx.storage.getUrl(storageId);
      console.log("File URL:", fileUrl);
      
      if (!fileUrl) {
        throw new Error("File not found");
      }

      // Twilio configuration
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

      console.log("Twilio config check:", {
        accountSid: accountSid ? "SET" : "MISSING",
        authToken: authToken ? "SET" : "MISSING", 
        twilioPhoneNumber: twilioPhoneNumber ? "SET" : "MISSING"
      });

      if (!accountSid || !authToken || !twilioPhoneNumber) {
        throw new Error(`Twilio configuration missing: SID=${!!accountSid}, Token=${!!authToken}, Phone=${!!twilioPhoneNumber}`);
      }

      // Send SMS with image using Twilio REST API
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      
      const formData = new URLSearchParams();
      formData.append('From', twilioPhoneNumber);
      formData.append('To', phoneNumber);
      formData.append('Body', message || `Image: ${filename}`);
      formData.append('MediaUrl', fileUrl);

      console.log("Sending to Twilio:", {
        url: twilioUrl,
        from: twilioPhoneNumber,
        to: phoneNumber,
        mediaUrl: fileUrl
      });

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      console.log("Twilio response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Twilio error response:", errorText);
        throw new Error(`Twilio error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log("Twilio success:", result);
      
      // Log SMS delivery status to Convex
      try {
        await ctx.runMutation(internal.deliveryLogs.logSmsDelivery, {
          recipient: phoneNumber,
          status: result.status || "sent",
          providerId: result.sid,
          providerResponse: JSON.stringify(result),
          imageCount: 1,
          eventName: eventName,
        });
        console.log("SMS delivery logged successfully");
      } catch (logError) {
        console.error("Failed to log SMS delivery:", logError);
        // Don't fail the main operation if logging fails
      }
      
      return {
        success: true,
        messageSid: result.sid,
        status: result.status,
      };
      
    } catch (error) {
      console.error("SMS action error:", error);
      
      // Log SMS failure to Convex
      try {
        await ctx.runMutation(internal.deliveryLogs.logSmsDelivery, {
          recipient: phoneNumber,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
          imageCount: 1,
          eventName: eventName,
        });
        console.log("SMS failure logged successfully");
      } catch (logError) {
        console.error("Failed to log SMS failure:", logError);
      }
      
      throw error;
    }
  },
});

export const sendBatchImageSms = action({
  args: {
    phoneNumber: v.string(),
    storageIds: v.array(v.string()),
    filenames: v.array(v.string()),
    message: v.optional(v.string()),
    eventName: v.optional(v.string()),
    disclaimerEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, { phoneNumber, storageIds, filenames, message, eventName, disclaimerEnabled }) => {
    try {
      console.log(`Starting batch SMS send process for ${storageIds.length} images...`);
      
      // Get all file URLs from storage
      const fileUrls: string[] = [];
      for (const storageId of storageIds) {
        const fileUrl = await ctx.storage.getUrl(storageId);
        if (!fileUrl) {
          throw new Error(`File not found for storage ID: ${storageId}`);
        }
        fileUrls.push(fileUrl);
      }

      // Twilio configuration
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

      console.log("Twilio batch config check:", {
        accountSid: accountSid ? "SET" : "MISSING",
        authToken: authToken ? "SET" : "MISSING", 
        twilioPhoneNumber: twilioPhoneNumber ? "SET" : "MISSING",
        imageCount: fileUrls.length
      });

      if (!accountSid || !authToken || !twilioPhoneNumber) {
        throw new Error(`Twilio configuration missing: SID=${!!accountSid}, Token=${!!authToken}, Phone=${!!twilioPhoneNumber}`);
      }

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const results = [];
      
      // Send each image as a separate message
      for (let i = 0; i < fileUrls.length; i++) {
        const isFirstMessage = i === 0;
        const messageNumber = i + 1;
        
        console.log(`Sending message ${messageNumber}/${fileUrls.length} with 1 image`);
        
        const formData = new URLSearchParams();
        formData.append('From', twilioPhoneNumber);
        formData.append('To', phoneNumber);
        
        // Only include message body in the first message
        if (isFirstMessage) {
          formData.append('Body', message || `${fileUrls.length} images from One Chance Media`);
        } else {
          // Subsequent messages have no body text, just the image
          formData.append('Body', '');
        }
        
        // Add single image to this message
        formData.append('MediaUrl', fileUrls[i]);

        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });

        console.log(`Twilio message ${messageNumber} response status:`, response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Twilio message ${messageNumber} error response:`, errorText);
          throw new Error(`Twilio error on message ${messageNumber}: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log(`Message ${messageNumber} SMS success:`, result.sid);
        results.push(result);
        
        // Log each SMS delivery status to Convex
        try {
          await ctx.runMutation(internal.deliveryLogs.logSmsDelivery, {
            recipient: phoneNumber,
            status: result.status || "sent",
            providerId: result.sid,
            providerResponse: JSON.stringify(result),
            imageCount: 1,
            eventName: eventName,
            disclaimerEnabled: disclaimerEnabled,
          });
          console.log(`Message ${messageNumber} SMS delivery logged successfully`);
        } catch (logError) {
          console.error(`Failed to log message ${messageNumber} SMS delivery:`, logError);
          // Don't fail the main operation if logging fails
        }
        
        // Add small delay between messages to avoid rate limiting
        if (i < fileUrls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return {
        success: true,
        messageSids: results.map(r => r.sid),
        status: "sent",
        imageCount: fileUrls.length,
        messageCount: results.length
      };
      
    } catch (error) {
      console.error("Batch SMS action error:", error);
      
      // Log batch SMS failure to Convex
      try {
        await ctx.runMutation(internal.deliveryLogs.logSmsDelivery, {
          recipient: phoneNumber,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
          imageCount: storageIds.length,
          eventName: eventName,
          disclaimerEnabled: disclaimerEnabled,
        });
        console.log("Batch SMS failure logged successfully");
      } catch (logError) {
        console.error("Failed to log SMS failure:", logError);
      }
      
      throw error;
    }
  },
});