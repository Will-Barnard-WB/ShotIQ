import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't auto-generate AGENTS.md / CLAUDE.md into the repo.
  agentRules: false,
};

export default nextConfig;
