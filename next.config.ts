import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables the `'use cache'` directive + cacheTag/cacheLife used throughout
  // lib/data, so Postgres never sits on the critical path of the boot sequence.
  // Admin server actions call revalidateTag() to push content live without a deploy.
  cacheComponents: true,

  // postgres.js is server-only; keep it out of any client/edge bundle.
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
