import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL || "https://adept-bullfrog-440.convex.cloud");

export { convex };