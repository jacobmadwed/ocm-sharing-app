import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  images: defineTable({
    storageId: v.string(),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
    uploadedAt: v.number(),
  }).index("by_upload_time", ["uploadedAt"]),
  
  events: defineTable({
    name: v.string(),
    emailSubject: v.string(),
    emailBody: v.string(),
    smsMessage: v.string(),
    emailEnabled: v.optional(v.boolean()),
    smsEnabled: v.optional(v.boolean()),
    disclaimerEnabled: v.optional(v.boolean()),
    disclaimerMessage: v.optional(v.string()),
    disclaimerMandatory: v.optional(v.boolean()),
    surveyEnabled: v.optional(v.boolean()),
    surveyQuestions: v.optional(v.array(v.object({
      id: v.string(),
      type: v.union(v.literal("dropdown"), v.literal("text")),
      question: v.string(),
      required: v.boolean(),
      options: v.optional(v.array(v.string())), // for dropdown questions
      placeholder: v.optional(v.string()), // for text questions
      maxLength: v.optional(v.number()), // for text questions
      defaultValue: v.optional(v.string()), // for dropdown questions
    }))),
    watchPath: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),

  deliveryLogs: defineTable({
    type: v.union(v.literal("sms"), v.literal("email")), // sms or email
    recipient: v.string(), // phone number or email address
    status: v.string(), // delivery status from provider
    providerId: v.optional(v.string()), // Twilio MessageSid or SendGrid message ID
    providerResponse: v.optional(v.string()), // JSON string of full response
    errorMessage: v.optional(v.string()), // error details if failed
    imageCount: v.optional(v.number()), // number of images sent
    eventName: v.optional(v.string()), // which event triggered this
    disclaimerEnabled: v.optional(v.boolean()), // whether disclaimer was enabled at send time
    surveyResponses: v.optional(v.array(v.object({
      questionId: v.string(),
      answer: v.string(),
    }))), // survey responses if survey was completed
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_recipient", ["recipient"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),

  surveyResponses: defineTable({
    eventName: v.string(),
    recipient: v.optional(v.string()), // phone/email if associated with delivery
    responses: v.array(v.object({
      questionId: v.string(),
      answer: v.string(),
    })),
    completedAt: v.number(),
  })
    .index("by_event", ["eventName"])
    .index("by_completed_at", ["completedAt"]),
});