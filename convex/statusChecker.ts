import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// Check SMS delivery status by querying Twilio API
export const checkSmsDeliveryStatus = action({
  args: {},
  handler: async (ctx) => {
    try {
      console.log("🔍 Checking SMS delivery statuses...");
      
      // Get all pending SMS deliveries from the last 24 hours
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const pendingLogs = await ctx.runQuery(internal.deliveryLogs.getPendingDeliveries, {
        type: "sms",
        since: oneDayAgo
      });
      
      console.log(`Found ${pendingLogs.length} pending SMS deliveries to check`);
      
      // Twilio configuration
      const accountSid = process.env.TWILIO_ACCOUNT_SID || "YOUR_TWILIO_ACCOUNT_SID";
      const authToken = process.env.TWILIO_AUTH_TOKEN || "YOUR_TWILIO_AUTH_TOKEN";
      
      if (!accountSid || !authToken) {
        throw new Error("Twilio credentials missing");
      }
      
      let updatedCount = 0;
      
      // Check each pending message
      for (const log of pendingLogs) {
        if (!log.providerId) continue;
        
        try {
          // Query Twilio API for message status
          const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${log.providerId}.json`,
            {
              headers: {
                'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`
              }
            }
          );
          
          if (!response.ok) {
            console.error(`Failed to fetch status for ${log.providerId}: ${response.status}`);
            continue;
          }
          
          const messageData = await response.json();
          console.log(`📱 ${log.providerId}: ${log.status} -> ${messageData.status}`);
          
          // Update if status changed
          if (messageData.status !== log.status) {
            await ctx.runMutation(internal.deliveryLogs.updateSmsDeliveryStatus, {
              providerId: log.providerId,
              status: messageData.status,
              errorMessage: messageData.error_message || undefined,
              webhookData: JSON.stringify(messageData)
            });
            updatedCount++;
            console.log(`✅ Updated ${log.providerId}: ${log.status} -> ${messageData.status}`);
          }
          
          // Rate limiting - don't overwhelm Twilio API
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Error checking ${log.providerId}:`, error);
        }
      }
      
      console.log(`🔄 Status check complete: ${updatedCount} messages updated`);
      return { checked: pendingLogs.length, updated: updatedCount };
      
    } catch (error) {
      console.error("❌ Error in SMS status checker:", error);
      throw error;
    }
  }
});

// Check email delivery status (SendGrid doesn't have a simple status API like Twilio)
export const checkEmailDeliveryStatus = action({
  args: {},
  handler: async (ctx) => {
    // SendGrid doesn't provide a simple "check message status" API
    // They recommend using webhooks or their Activity Feed API (complex)
    // For now, we'll just mark old "accepted" emails as "delivered" after some time
    
    try {
      console.log("📧 Checking email delivery statuses...");
      
      // Get emails that have been "accepted" for more than 10 minutes
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
      const acceptedLogs = await ctx.runQuery(internal.deliveryLogs.getAcceptedEmails, {
        before: tenMinutesAgo
      });
      
      console.log(`Found ${acceptedLogs.length} accepted emails to mark as delivered`);
      
      let updatedCount = 0;
      
      // Mark old "accepted" emails as "delivered" (reasonable assumption)
      for (const log of acceptedLogs) {
        await ctx.runMutation(internal.deliveryLogs.updateEmailDeliveryStatus, {
          recipient: log.recipient,
          status: "delivered",
          providerId: log.providerId,
        });
        updatedCount++;
      }
      
      console.log(`✅ Marked ${updatedCount} emails as delivered`);
      return { updated: updatedCount };
      
    } catch (error) {
      console.error("❌ Error in email status checker:", error);
      throw error;
    }
  }
});