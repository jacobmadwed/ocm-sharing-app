import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Log SMS delivery status
export const logSmsDelivery = mutation({
  args: {
    recipient: v.string(),
    status: v.string(),
    providerId: v.optional(v.string()),
    providerResponse: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    imageCount: v.optional(v.number()),
    eventName: v.optional(v.string()),
    disclaimerEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("deliveryLogs", {
      type: "sms",
      recipient: args.recipient,
      status: args.status,
      providerId: args.providerId,
      providerResponse: args.providerResponse,
      errorMessage: args.errorMessage,
      imageCount: args.imageCount,
      eventName: args.eventName,
      disclaimerEnabled: args.disclaimerEnabled,
      createdAt: Date.now(),
    });
  },
});

// Log email delivery status
export const logEmailDelivery = mutation({
  args: {
    recipient: v.string(),
    status: v.string(),
    providerId: v.optional(v.string()),
    providerResponse: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    imageCount: v.optional(v.number()),
    eventName: v.optional(v.string()),
    disclaimerEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("deliveryLogs", {
      type: "email",
      recipient: args.recipient,
      status: args.status,
      providerId: args.providerId,
      providerResponse: args.providerResponse,
      errorMessage: args.errorMessage,
      imageCount: args.imageCount,
      eventName: args.eventName,
      disclaimerEnabled: args.disclaimerEnabled,
      createdAt: Date.now(),
    });
  },
});

// Get all delivery logs (most recent first)
export const getDeliveryLogs = query({
  args: {
    limit: v.optional(v.number()),
    type: v.optional(v.union(v.literal("sms"), v.literal("email"))),
    eventName: v.optional(v.string()),
  },
  handler: async (ctx, { limit = 50, type, eventName }) => {
    let logs;
    
    if (type) {
      logs = await ctx.db.query("deliveryLogs")
        .withIndex("by_type", (q) => q.eq("type", type))
        .order("desc")
        .take(limit * 2); // Get more to filter
    } else {
      logs = await ctx.db.query("deliveryLogs")
        .order("desc")
        .take(limit * 2); // Get more to filter
    }
    
    // Filter by event name if specified
    if (eventName) {
      logs = logs.filter(log => log.eventName === eventName);
      logs = logs.slice(0, limit); // Apply limit after filtering
    }
    
    return logs;
  },
});

// Get delivery logs for a specific recipient
export const getDeliveryLogsByRecipient = query({
  args: {
    recipient: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { recipient, limit = 20 }) => {
    return await ctx.db
      .query("deliveryLogs")
      .withIndex("by_recipient", (q) => q.eq("recipient", recipient))
      .order("desc")
      .take(limit);
  },
});

// Get delivery statistics
export const getDeliveryStats = query({
  args: {
    days: v.optional(v.number()), // How many days back to look
    eventName: v.optional(v.string()), // Filter by specific event
  },
  handler: async (ctx, { days = 7, eventName }) => {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    let logs = await ctx.db
      .query("deliveryLogs")
      .withIndex("by_created_at", (q) => q.gte("createdAt", cutoffTime))
      .collect();
    
    // Filter by event name if specified
    if (eventName) {
      logs = logs.filter(log => log.eventName === eventName);
    }
    
    const stats = {
      total: logs.length,
      sms: {
        total: 0,
        delivered: 0,
        failed: 0,
        pending: 0,
      },
      email: {
        total: 0,
        delivered: 0,
        failed: 0,
        pending: 0,
      },
    };
    
    logs.forEach(log => {
      const category = log.type === "sms" ? stats.sms : stats.email;
      category.total++;
      
      const status = log.status.toLowerCase();
      if (status.includes("delivered") || status.includes("sent") || status === "accepted") {
        category.delivered++;
      } else if (status.includes("failed") || status.includes("error")) {
        category.failed++;
      } else {
        category.pending++;
      }
    });
    
    return stats;
  },
});

// Get delivery logs grouped by event
export const getDeliveryLogsByEvent = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, { days = 7 }) => {
    try {
      const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
      
      const logs = await ctx.db
        .query("deliveryLogs")
        .withIndex("by_created_at", (q) => q.gte("createdAt", cutoffTime))
        .collect();
      
      // Group logs by event
      const eventGroups: Record<string, any[]> = {};
      
      logs.forEach((log) => {
        const eventName = log.eventName || "No Event";
        if (!eventGroups[eventName]) {
          eventGroups[eventName] = [];
        }
        eventGroups[eventName].push(log);
      });
      
      // Calculate stats for each event
      const eventStats = Object.entries(eventGroups).map(([eventName, eventLogs]) => {
        const stats = {
          eventName,
          total: eventLogs.length,
          sms: { total: 0, delivered: 0, failed: 0, pending: 0 },
          email: { total: 0, delivered: 0, failed: 0, pending: 0 },
          recentLogs: eventLogs
            .sort((a: any, b: any) => b.createdAt - a.createdAt)
            .slice(0, 10)
        };
        
        eventLogs.forEach((log: any) => {
          const category = log.type === "sms" ? stats.sms : stats.email;
          category.total++;
          
          const status = log.status.toLowerCase();
          if (status.includes("delivered") || status.includes("sent") || status === "accepted") {
            category.delivered++;
          } else if (status.includes("failed") || status.includes("error")) {
            category.failed++;
          } else {
            category.pending++;
          }
        });
        
        return stats;
      });
      
      return eventStats.sort((a, b) => b.total - a.total);
    } catch (error) {
      console.error("Error in getDeliveryLogsByEvent:", error);
      return [];
    }
  },
});

// Update SMS delivery status from webhook
export const updateSmsDeliveryStatus = mutation({
  args: {
    providerId: v.string(),
    status: v.string(),
    errorMessage: v.optional(v.string()),
    webhookData: v.optional(v.string()),
  },
  handler: async (ctx, { providerId, status, errorMessage, webhookData }) => {
    // Find the delivery log by providerId (Twilio MessageSid)
    const existingLog = await ctx.db
      .query("deliveryLogs")
      .filter((q) => q.and(
        q.eq(q.field("type"), "sms"),
        q.eq(q.field("providerId"), providerId)
      ))
      .first();
    
    if (!existingLog) {
      console.warn(`No SMS delivery log found for providerId: ${providerId}`);
      return null;
    }
    
    // Update the status
    await ctx.db.patch(existingLog._id, {
      status: status,
      errorMessage: errorMessage,
      providerResponse: webhookData || existingLog.providerResponse,
    });
    
    console.log(`Updated SMS delivery log ${existingLog._id}: ${status}`);
    return existingLog._id;
  },
});

// Update email delivery status from webhook
export const updateEmailDeliveryStatus = mutation({
  args: {
    recipient: v.string(),
    status: v.string(),
    providerId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    webhookData: v.optional(v.string()),
  },
  handler: async (ctx, { recipient, status, providerId, errorMessage, webhookData }) => {
    // Find the most recent delivery log for this recipient
    // (since SendGrid doesn't always provide a reliable message ID)
    const existingLog = await ctx.db
      .query("deliveryLogs")
      .filter((q) => q.and(
        q.eq(q.field("type"), "email"),
        q.eq(q.field("recipient"), recipient)
      ))
      .order("desc")
      .first();
    
    if (!existingLog) {
      console.warn(`No email delivery log found for recipient: ${recipient}`);
      return null;
    }
    
    // Update the status
    await ctx.db.patch(existingLog._id, {
      status: status,
      errorMessage: errorMessage,
      providerId: providerId || existingLog.providerId,
      providerResponse: webhookData || existingLog.providerResponse,
    });
    
    console.log(`Updated email delivery log ${existingLog._id}: ${status}`);
    return existingLog._id;
  },
});

// Get pending SMS deliveries for status checking
export const getPendingDeliveries = query({
  args: {
    type: v.union(v.literal("sms"), v.literal("email")),
    since: v.number(),
  },
  handler: async (ctx, { type, since }) => {
    return await ctx.db
      .query("deliveryLogs")
      .filter((q) => q.and(
        q.eq(q.field("type"), type),
        q.gte(q.field("createdAt"), since),
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "queued"),
          q.eq(q.field("status"), "sent")
        )
      ))
      .collect();
  },
});

// Get accepted emails for status updating
export const getAcceptedEmails = query({
  args: {
    before: v.number(),
  },
  handler: async (ctx, { before }) => {
    return await ctx.db
      .query("deliveryLogs")
      .filter((q) => q.and(
        q.eq(q.field("type"), "email"),
        q.eq(q.field("status"), "accepted"),
        q.lt(q.field("createdAt"), before)
      ))
      .collect();
  },
});