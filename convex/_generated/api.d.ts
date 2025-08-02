/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as crons from "../crons.js";
import type * as deliveryLogs from "../deliveryLogs.js";
import type * as email from "../email.js";
import type * as events from "../events.js";
import type * as files from "../files.js";
import type * as images from "../images.js";
import type * as sms from "../sms.js";
import type * as statusChecker from "../statusChecker.js";
import type * as webhooks from "../webhooks.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  deliveryLogs: typeof deliveryLogs;
  email: typeof email;
  events: typeof events;
  files: typeof files;
  images: typeof images;
  sms: typeof sms;
  statusChecker: typeof statusChecker;
  webhooks: typeof webhooks;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
