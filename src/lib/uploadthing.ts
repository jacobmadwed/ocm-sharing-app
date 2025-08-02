import { generateSolidHelpers } from "uploadthing/solid";

export const { createUploadThing, useUploadThing } = generateSolidHelpers({
  url: "https://api.uploadthing.com/api/uploadFiles"
});