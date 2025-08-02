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
      createdAt: Date.now(),
    });
  },
});

// Get all delivery logs (most recent first)
export const getDeliveryLogs = query({
  args: {
    limit: v.optional(v.number()),
    type: v.optional(v.union(v.literal("sms"), v.literal("email"))),
  },
  handler: async (ctx, { limit = 50, type }) => {
    let query = ctx.db.query("deliveryLogs");
    
    if (type) {
      query = query.withIndex("by_type", (q) => q.eq("type", type));
    }
    
    return await query
      .order("desc")
      .take(limit);
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
  },
  handler: async (ctx, { days = 7 }) => {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    const logs = await ctx.db
      .query("deliveryLogs")
      .withIndex("by_created_at", (q) => q.gte("createdAt", cutoffTime))
      .collect();
    
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