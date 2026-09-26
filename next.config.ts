import type { NextConfig } from "next";

/*
 * Names this build. The page carries it, and /api/version reports the one that
 * is live, so an app left open can tell it has been replaced. Vercel supplies
 * the commit; anywhere else the build time is as good as unique.
 */
const buildId = process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now());

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
};

export default nextConfig;
