import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // OCR (tesseract.js), image processing (sharp) and the Salesforce SDK run
  // in Node API routes only. Keep them out of the client/edge bundles.
  serverExternalPackages: ["tesseract.js", "sharp", "jsforce"],
};

export default nextConfig;
