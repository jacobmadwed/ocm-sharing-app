import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createEvent = mutation({
  args: {
    name: v.string(),
    emailSubject: v.string(),
    emailBody: v.string(),
    smsMessage: v.string(),
    emailEnabled: v.optional(v.boolean()),
    smsEnabled: v.optional(v.boolean()),
    watchPath: v.optional(v.string()),
  },
  handler: async (ctx, { name, emailSubject, emailBody, smsMessage, emailEnabled = true, smsEnabled = true, watchPath }) => {
    const now = Date.now();
    
    // Check if event with this name already exists
    const existing = await ctx.db
      .query("events")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
    
    if (existing) {
      throw new Error(`Event with name "${name}" already exists`);
    }
    
    return await ctx.db.insert("events", {
      name,
      emailSubject,
      emailBody,
      smsMessage,
      emailEnabled,
      smsEnabled,
      watchPath,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateEvent = mutation({
  args: {
    name: v.string(),
    emailSubject: v.string(),
    emailBody: v.string(),
    smsMessage: v.string(),
    emailEnabled: v.optional(v.boolean()),
    smsEnabled: v.optional(v.boolean()),
    watchPath: v.optional(v.string()),
  },
  handler: async (ctx, { name, emailSubject, emailBody, smsMessage, emailEnabled = true, smsEnabled = true, watchPath }) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
    
    if (!event) {
      throw new Error(`Event "${name}" not found`);
    }
    
    return await ctx.db.patch(event._id, {
      emailSubject,
      emailBody,
      smsMessage,
      emailEnabled,
      smsEnabled,
      watchPath,
      updatedAt: Date.now(),
    });
  },
});

export const getEvents = query({
  handler: async (ctx) => {
    return await ctx.db.query("events").collect();
  },
});

export const getEventByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    return await ctx.db
      .query("events")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
  },
});

export const deleteEvent = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
    
    if (!event) {
      throw new Error(`Event "${name}" not found`);
    }
    
    return await ctx.db.delete(event._id);
  },
});