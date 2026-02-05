import type { Context, Next } from "hono";
import { PrivyClient } from "@privy-io/server-auth";
import { ethers } from "ethers";
import { UnauthorizedError } from "../lib/errors.js";
import { config } from "../config.js";

// Initialize Privy client lazily
let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient | null {
  if (!privyClient && config.privy.appId && config.privy.appSecret) {
    privyClient = new PrivyClient(config.privy.appId, config.privy.appSecret);
  }
  return privyClient;
}

/**
 * Authentication result with user info
 */
interface AuthResult {
  walletAddress: string;
  userId?: string;
  authMethod: "privy" | "signature" | "api-key" | "wallet-header";
}

/**
 * Verify Privy JWT token
 */
async function verifyPrivyToken(token: string): Promise<AuthResult | null> {
  const client = getPrivyClient();
  if (!client) return null;

  try {
    const verifiedClaims = await client.verifyAuthToken(token);
    const user = await client.getUser(verifiedClaims.userId);

    const walletAccount = user.linkedAccounts?.find(
      (account) => account.type === "wallet"
    );

    if (!walletAccount || !("address" in walletAccount)) {
      return null;
    }

    return {
      walletAddress: walletAccount.address.toLowerCase(),
      userId: verifiedClaims.userId,
      authMethod: "privy",
    };
  } catch {
    return null;
  }
}

/**
 * Verify signature-based authentication
 * Expects header: x-signature with signed message
 * Expects header: x-message with original message containing wallet address and timestamp
 */
async function verifySignature(
  signature: string,
  message: string
): Promise<AuthResult | null> {
  try {
    // Message format: "GitStream Auth: {walletAddress} at {timestamp}"
    const match = message.match(/GitStream Auth: (0x[a-fA-F0-9]{40}) at (\d+)/);
    if (!match) return null;

    const [, claimedAddress, timestampStr] = match;
    const timestamp = parseInt(timestampStr, 10);

    // Check timestamp is within 5 minutes
    const now = Date.now();
    if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
      return null;
    }

    // Recover signer address from signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== claimedAddress.toLowerCase()) {
      return null;
    }

    return {
      walletAddress: recoveredAddress.toLowerCase(),
      authMethod: "signature",
    };
  } catch {
    return null;
  }
}

/**
 * Verify API key authentication for server-to-server communication
 */
async function verifyApiKey(apiKey: string): Promise<AuthResult | null> {
  // API keys are formatted as: {walletAddress}:{secret}
  // In production, these would be stored in database
  if (!config.apiKeys || config.apiKeys.length === 0) return null;

  const keyConfig = config.apiKeys.find((k) => k.key === apiKey);
  if (!keyConfig) return null;

  return {
    walletAddress: keyConfig.walletAddress.toLowerCase(),
    authMethod: "api-key",
  };
}

/**
 * Verify wallet address header (legacy/development mode)
 */
function verifyWalletHeader(walletAddress: string): AuthResult | null {
  // Only allow in development or when explicitly enabled
  if (process.env.NODE_ENV === "production" && !config.allowWalletHeader) {
    return null;
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return null;
  }

  return {
    walletAddress: walletAddress.toLowerCase(),
    authMethod: "wallet-header",
  };
}

/**
 * Main auth middleware - supports multiple authentication methods:
 * 1. Bearer token (Privy JWT)
 * 2. Signature-based auth (x-signature + x-message headers)
 * 3. API key (x-api-key header)
 * 4. Wallet header (x-wallet-address, dev mode only)
 */
export async function authMiddleware(c: Context, next: Next) {
  let authResult: AuthResult | null = null;

  // Try Bearer token (Privy)
  const authHeader = c.req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    authResult = await verifyPrivyToken(token);
  }

  // Try signature-based auth
  if (!authResult) {
    const signature = c.req.header("x-signature");
    const message = c.req.header("x-message");
    if (signature && message) {
      authResult = await verifySignature(signature, message);
    }
  }

  // Try API key
  if (!authResult) {
    const apiKey = c.req.header("x-api-key");
    if (apiKey) {
      authResult = await verifyApiKey(apiKey);
    }
  }

  // Try wallet header (legacy/dev)
  if (!authResult) {
    const walletAddress = c.req.header("x-wallet-address");
    if (walletAddress) {
      authResult = verifyWalletHeader(walletAddress);
    }
  }

  if (!authResult) {
    throw new UnauthorizedError("Authentication required");
  }

  // Store auth info in context
  c.set("walletAddress", authResult.walletAddress);
  if (authResult.userId) {
    c.set("userId", authResult.userId);
  }
  c.set("authMethod", authResult.authMethod);

  await next();
}

/**
 * Optional auth - doesn't throw if not authenticated
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  let authResult: AuthResult | null = null;

  // Try Bearer token (Privy)
  const authHeader = c.req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    authResult = await verifyPrivyToken(token);
  }

  // Try signature-based auth
  if (!authResult) {
    const signature = c.req.header("x-signature");
    const message = c.req.header("x-message");
    if (signature && message) {
      authResult = await verifySignature(signature, message);
    }
  }

  // Try API key
  if (!authResult) {
    const apiKey = c.req.header("x-api-key");
    if (apiKey) {
      authResult = await verifyApiKey(apiKey);
    }
  }

  // Try wallet header (legacy/dev)
  if (!authResult) {
    const walletAddress = c.req.header("x-wallet-address");
    if (walletAddress) {
      authResult = verifyWalletHeader(walletAddress);
    }
  }

  // Store auth info if authenticated
  if (authResult) {
    c.set("walletAddress", authResult.walletAddress);
    if (authResult.userId) {
      c.set("userId", authResult.userId);
    }
    c.set("authMethod", authResult.authMethod);
  }

  await next();
}

/**
 * GitHub auth middleware - requires GitHub access token
 */
export async function githubAuthMiddleware(c: Context, next: Next) {
  const accessToken = c.req.header("x-github-token");

  if (!accessToken) {
    throw new UnauthorizedError("GitHub access token required");
  }

  c.set("githubToken", accessToken);

  await next();
}
