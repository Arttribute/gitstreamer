import { randomBytes } from "crypto";
import { config } from "../../config.js";
import { getDatabase } from "../../db/client.js";
const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
export async function createOAuthState(walletAddress, returnUrl) {
    const state = randomBytes(32).toString("hex");
    const db = await getDatabase();
    const session = {
        state,
        walletAddress,
        returnUrl,
        createdAt: new Date(),
    };
    await db.collection("githubSessions").insertOne(session);
    return state;
}
export async function getOAuthSession(state) {
    const db = await getDatabase();
    return db.collection("githubSessions").findOne({ state });
}
export async function deleteOAuthSession(state) {
    const db = await getDatabase();
    await db.collection("githubSessions").deleteOne({ state });
}
export function getOAuthUrl(state) {
    const params = new URLSearchParams({
        client_id: config.github.clientId,
        redirect_uri: config.github.callbackUrl,
        scope: "read:user repo",
        state,
    });
    return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
}
export async function exchangeCodeForToken(code) {
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
    const data = await response.json();
    if (data.error) {
        throw new Error(`GitHub OAuth error: ${data.error}`);
    }
    return data;
}
export async function getGitHubUser(accessToken) {
    const response = await fetch(GITHUB_USER_URL, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch GitHub user: ${response.statusText}`);
    }
    return response.json();
}
