import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Twilio webhook to receive SMS delivery status updates
export const twilioStatusWebhook = httpAction(async (ctx, request) => {
  try {
    console.log("📞 Twilio webhook received");
    
    // Parse form data from Twilio
    const formData = await request.formData();
    const data: Record<string, string> = {};
    
    for (const [key, value] of formData.entries()) {
      data[key] = value as string;
    }
    
    console.log("Twilio webhook data:", data);
    
    // Extract key fields from Twilio webhook
    const messageSid = data.MessageSid || data.SmsSid;
    const messageStatus = data.MessageStatus || data.SmsStatus;
    const to = data.To;
    const errorCode = data.ErrorCode;
    const errorMessage = data.ErrorMessage;
    
    console.log(`📱 SMS ${messageSid}: ${messageStatus} to ${to}`);
    
    if (!messageSid || !messageStatus) {
      console.error("Missing required fields in Twilio webhook");
      return new Response("Missing required fields", { status: 400 });
    }
    
    // Update the delivery log with the new status
    await ctx.runMutation(internal.deliveryLogs.updateSmsDeliveryStatus, {
      providerId: messageSid,
      status: messageStatus,
      errorMessage: errorCode ? `Error ${errorCode}: ${errorMessage}` : undefined,
      webhookData: JSON.stringify(data),
    });
    
    console.log(`✅ Updated SMS delivery status: ${messageSid} -> ${messageStatus}`);
    
    return new Response("OK", { status: 200 });
    
  } catch (error) {
    console.error("❌ Error processing Twilio webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});

// SendGrid webhook to receive email delivery status updates
export const sendGridWebhook = httpAction(async (ctx, request) => {
  try {
    console.log("📧 SendGrid webhook received");
    
    // Parse JSON data from SendGrid
    const events = await request.json();
    console.log("SendGrid webhook events:", events);
    
    // SendGrid sends an array of events
    for (const event of events) {
      const {
        email,
        event: eventType,
        sg_message_id,
        reason,
        timestamp
      } = event;
      
      console.log(`📧 Email to ${email}: ${eventType}`);
      
      if (!email || !eventType) {
        console.warn("Missing required fields in SendGrid event:", event);
        continue;
      }
      
      // Map SendGrid events to our status format
      let status = eventType;
      let errorMessage = undefined;
      
      if (eventType === "bounce" || eventType === "dropped") {
        status = "failed";
        errorMessage = reason || "Email bounced or dropped";
      } else if (eventType === "delivered") {
        status = "delivered";
      }
      
      // Update the delivery log with the new status
      await ctx.runMutation(internal.deliveryLogs.updateEmailDeliveryStatus, {
        recipient: email,
        status: status,
        providerId: sg_message_id,
        errorMessage: errorMessage,
        webhookData: JSON.stringify(event),
      });
      
      console.log(`✅ Updated email delivery status: ${email} -> ${status}`);
    }
    
    return new Response("OK", { status: 200 });
    
  } catch (error) {
    console.error("❌ Error processing SendGrid webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});