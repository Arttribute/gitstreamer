import { Hono } from "hono";
import type { ContextVariables } from "../types.js";
import { config } from "../config.js";
import {
  createOAuthState,
  getOAuthSession,
  deleteOAuthSession,
  getOAuthUrl,
  exchangeCodeForToken,
  getGitHubUser,
} from "../services/github/oauth.js";
import {
  createOctokitClient,
  listUserRepos,
  listBranches,
} from "../services/github/client.js";
import { githubAuthMiddleware } from "../middleware/auth.js";

const github = new Hono<{ Variables: ContextVariables }>();

// Initiate GitHub OAuth flow
github.get("/auth", async (c) => {
  const walletAddress = c.req.query("wallet");
  const returnUrl = c.req.query("returnUrl");

  const state = await createOAuthState(walletAddress, returnUrl);
  const authUrl = getOAuthUrl(state);

  // Redirect directly to GitHub OAuth page
  return c.redirect(authUrl);
});

// Handle GitHub OAuth callback
github.get("/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");

  if (error) {
    const returnUrl = c.req.query("error_uri") || config.frontendUrl;
    return c.redirect(`${returnUrl}?error=${error}`);
  }

  if (!code || !state) {
    return c.json({ error: "Missing code or state" }, 400);
  }

  // Verify state
  const session = await getOAuthSession(state);
  if (!session) {
    return c.json({ error: "Invalid or expired state" }, 400);
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForToken(code);

    // Get user info
    const user = await getGitHubUser(tokens.access_token);

    // Clean up session
    await deleteOAuthSession(state);

    // Redirect back to frontend with token
    const returnUrl = session.returnUrl || config.frontendUrl;
    const params = new URLSearchParams({
      github_token: tokens.access_token,
      github_user: user.login,
      github_id: user.id.toString(),
    });

    if (session.walletAddress) {
      params.set("wallet", session.walletAddress);
    }

    return c.redirect(`${returnUrl}?${params.toString()}`);
  } catch (err) {
    console.error("OAuth error:", err);
    const returnUrl = session.returnUrl || config.frontendUrl;
    return c.redirect(`${returnUrl}?error=oauth_failed`);
  }
});

// List user's repositories (requires GitHub token)
github.get("/repos", githubAuthMiddleware, async (c) => {
  const accessToken = c.get("githubToken");
  const octokit = createOctokitClient(accessToken);

  const repos = await listUserRepos(octokit);

  return c.json({
    repos: repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: { login: repo.owner.login },
      private: repo.private,
      html_url: repo.html_url,
      description: repo.description,
      default_branch: repo.default_branch,
    })),
  });
});

// List branches for a repository
github.get("/repos/:owner/:repo/branches", githubAuthMiddleware, async (c) => {
  const accessToken = c.get("githubToken");
  const owner = c.req.param("owner");
  const repo = c.req.param("repo");

  const octokit = createOctokitClient(accessToken);
  const branches = await listBranches(octokit, owner, repo);

  return c.json({
    branches: branches.map((branch) => ({
      name: branch.name,
      sha: branch.commit.sha,
      protected: branch.protected,
    })),
  });
});

// Get current authenticated GitHub user
github.get("/user", githubAuthMiddleware, async (c) => {
  const accessToken = c.get("githubToken");
  const user = await getGitHubUser(accessToken);

  return c.json({
    id: user.id,
    login: user.login,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatar_url,
  });
});

export { github as githubRoutes };
