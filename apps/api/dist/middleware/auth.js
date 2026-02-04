import { UnauthorizedError } from "../lib/errors.js";
// Simple auth middleware that extracts wallet address from header
// In production, this should verify a signed message or JWT
export async function authMiddleware(c, next) {
    const walletAddress = c.req.header("x-wallet-address");
    if (!walletAddress) {
        throw new UnauthorizedError("Wallet address required");
    }
    // Validate ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        throw new UnauthorizedError("Invalid wallet address format");
    }
    // Store wallet address in context
    c.set("walletAddress", walletAddress.toLowerCase());
    await next();
}
// Optional auth - doesn't throw if not authenticated
export async function optionalAuthMiddleware(c, next) {
    const walletAddress = c.req.header("x-wallet-address");
    if (walletAddress && /^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        c.set("walletAddress", walletAddress.toLowerCase());
    }
    await next();
}
// GitHub auth middleware - requires GitHub access token
export async function githubAuthMiddleware(c, next) {
    const accessToken = c.req.header("x-github-token");
    if (!accessToken) {
        throw new UnauthorizedError("GitHub access token required");
    }
    c.set("githubToken", accessToken);
    await next();
}
