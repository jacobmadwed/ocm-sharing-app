import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check SMS delivery status every 5 minutes
crons.interval(
  "check sms delivery status",
  { minutes: 5 },
  internal.statusChecker.checkSmsDeliveryStatus
);

// Check email delivery status every 10 minutes
crons.interval(
  "check email delivery status", 
  { minutes: 10 },
  internal.statusChecker.checkEmailDeliveryStatus
);

export default crons;