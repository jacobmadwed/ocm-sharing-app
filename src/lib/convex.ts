import { ConvexHttpClient } from "convex/browser";

// Always use the production Convex deployment
const convexUrl = "https://adept-bullfrog-440.convex.cloud";
console.log("🔗 Connecting to production Convex:", convexUrl);

const convex = new ConvexHttpClient(convexUrl);

export { convex };