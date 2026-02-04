import { randomBytes } from "crypto";
import { config } from "../../config.js";
import { getDatabase } from "../../db/client.js";
import type { GitHubOAuthTokens, GitHubSession, GitHubUser } from "./types.js";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

export async function createOAuthState(walletAddress?: string, returnUrl?: string): Promise<string> {
  const state = randomBytes(32).toString("hex");
  const db = await getDatabase();

  const session: GitHubSession = {
    state,
    walletAddress,
    returnUrl,
    createdAt: new Date(),
  };

  await db.collection<GitHubSession>("githubSessions").insertOne(session);

  return state;
}

export async function getOAuthSession(state: string): Promise<GitHubSession | null> {
  const db = await getDatabase();
  return db.collection<GitHubSession>("githubSessions").findOne({ state });
}

export async function deleteOAuthSession(state: string): Promise<void> {
  const db = await getDatabase();
  await db.collection("githubSessions").deleteOne({ state });
}

export function getOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.github.clientId,
    redirect_uri: config.github.callbackUrl,
    scope: "read:user repo",
    state,
  });

  return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<GitHubOAuthTokens> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: config.github.clientId,
      client_secret: config.github.clientSecret,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed: ${response.statusText}`);
  }

  const data = await response.json() as GitHubOAuthTokens & { error?: string };

  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error}`);
  }

  return data;
}

export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub user: ${response.statusText}`);
  }

  return response.json() as Promise<GitHubUser>;
}
