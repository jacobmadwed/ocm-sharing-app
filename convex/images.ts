import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    storageId: v.string(),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
    uploadedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("images", args);
  },
});

export const list = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("images")
      .withIndex("by_upload_time")
      .order("desc")
      .collect();
  },
});

export const getWithUrl = query({
  args: { imageId: v.id("images") },
  handler: async (ctx, { imageId }) => {
    const image = await ctx.db.get(imageId);
    if (!image) return null;
    
    const url = await ctx.storage.getUrl(image.storageId);
    return { ...image, url };
  },
});