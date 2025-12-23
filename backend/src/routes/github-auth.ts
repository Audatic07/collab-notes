// GitHub OAuth routes
// GET /api/auth/github - Redirect to GitHub login
// GET /api/auth/github/callback - Handle OAuth callback

import { Router } from 'express';
import { env, isGitHubOAuthEnabled } from '../lib/env';
import { generateToken } from '../lib/auth';
import { BadRequestError } from '../lib/errors';
import prisma from '../lib/prisma';

const router = Router();

// GitHub OAuth URLs
const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';

// Type definitions for GitHub API responses
interface GitHubTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

// GET /api/auth/github
// Redirects user to GitHub for authorization
router.get('/github', (req, res, next) => {
  try {
    if (!isGitHubOAuthEnabled()) {
      throw new BadRequestError('GitHub OAuth is not configured');
    }

    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID!,
      redirect_uri: `${getBackendUrl(req)}/api/auth/github/callback`,
      scope: 'user:email',
      state: generateState(), // CSRF protection
    });

    res.redirect(`${GITHUB_AUTH_URL}?${params}`);
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/github/callback
// Handles the OAuth callback from GitHub
router.get('/github/callback', async (req, res, next) => {
  try {
    if (!isGitHubOAuthEnabled()) {
      throw new BadRequestError('GitHub OAuth is not configured');
    }

    const { code, error: oauthError } = req.query;

    if (oauthError) {
      // User denied access or error occurred
      return res.redirect(`${env.FRONTEND_URL}/login?error=oauth_denied`);
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(`${env.FRONTEND_URL}/login?error=no_code`);
    }

    // Exchange code for access token
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${getBackendUrl(req)}/api/auth/github/callback`,
      }),
    });

    const tokenData = await tokenResponse.json() as GitHubTokenResponse;

    if (tokenData.error || !tokenData.access_token) {
      console.error('GitHub token error:', tokenData);
      return res.redirect(`${env.FRONTEND_URL}/login?error=token_failed`);
    }

    const accessToken = tokenData.access_token;

    // Get user info from GitHub
    const userResponse = await fetch(GITHUB_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    const githubUser = await userResponse.json() as GitHubUser;

    if (!githubUser.id) {
      return res.redirect(`${env.FRONTEND_URL}/login?error=user_fetch_failed`);
    }

    // Find or create user in our database
    let user = await prisma.user.findFirst({
      where: {
        provider: 'github',
        providerId: String(githubUser.id),
      },
    });

    if (!user) {
      // Check if email already exists (from local signup)
      const existingEmail = githubUser.email
        ? await prisma.user.findUnique({ where: { email: githubUser.email } })
        : null;

      if (existingEmail) {
        // Link GitHub to existing account
        user = await prisma.user.update({
          where: { id: existingEmail.id },
          data: {
            provider: 'github',
            providerId: String(githubUser.id),
            avatarUrl: githubUser.avatar_url,
          },
        });
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: githubUser.email || `github-${githubUser.id}@noemail.local`,
            name: githubUser.name || githubUser.login,
            avatarUrl: githubUser.avatar_url,
            provider: 'github',
            providerId: String(githubUser.id),
          },
        });
      }
    } else {
      // Update avatar on each login
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: githubUser.avatar_url },
      });
    }

    // Generate JWT token
    const token = generateToken({ userId: user.id, email: user.email });

    // Redirect to frontend with token
    res.redirect(`${env.FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
  }
});

// GET /api/auth/github/status
// Check if GitHub OAuth is configured (for frontend to show/hide button)
router.get('/github/status', (req, res) => {
  res.json({ enabled: isGitHubOAuthEnabled() });
});

// Helper to get backend URL from request (handles proxies)
function getBackendUrl(req: any): string {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}`;
}

// Simple state generator for CSRF protection
function generateState(): string {
  return Math.random().toString(36).substring(2, 15);
}

export default router;
