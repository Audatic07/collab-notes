// Environment configuration with validation
// Using Zod to ensure all required env vars are present at startup

import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3001'),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters'),
  DATABASE_URL: z.string(),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
});

// Parse and validate - throws if invalid
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

// Helper to check if GitHub OAuth is configured
export const isGitHubOAuthEnabled = () => 
  !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
