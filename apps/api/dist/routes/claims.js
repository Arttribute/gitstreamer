import { Hono } from "hono";
import { getDatabase } from "../db/client.js";
import { githubAuthMiddleware } from "../middleware/auth.js";
import { NotFoundError, ConflictError } from "../lib/errors.js";
import { claimContributorSchema } from "../lib/validation.js";
import { getGitHubUser } from "../services/github/oauth.js";
const claims = new Hono();
// Claim contribution - link GitHub account to wallet
// Requires GitHub OAuth token
claims.post("/", githubAuthMiddleware, async (c) => {
    const githubToken = c.get("githubToken");
    const body = await c.req.json();
    const parsed = claimContributorSchema.parse(body);
    // Get GitHub user from token
    const githubUser = await getGitHubUser(githubToken);
    const db = await getDatabase();
    // Find all contributor records for this GitHub user
    const contributors = await db
        .collection("contributors")
        .find({ githubUsername: githubUser.login })
        .toArray();
    if (contributors.length === 0) {
        throw new NotFoundError(`No contributions found for GitHub user: ${githubUser.login}`);
    }
    // Check if any already claimed with a different wallet
    const alreadyClaimed = contributors.find((c) => c.walletAddress && c.walletAddress !== parsed.walletAddress.toLowerCase());
    if (alreadyClaimed) {
        throw new ConflictError("This GitHub account is already linked to a different wallet");
    }
    // TODO: In production, verify the signature matches the wallet address
    // This would use viem to recover the signer from the signature
    const now = new Date();
    // Update all contributor records with wallet address
    await db.collection("contributors").updateMany({ githubUsername: githubUser.login }, {
        $set: {
            walletAddress: parsed.walletAddress.toLowerCase(),
            githubId: githubUser.id,
            githubEmail: githubUser.email || undefined,
            claimedAt: now,
        },
    });
    return c.json({
        success: true,
        message: "Wallet linked successfully",
        claim: {
            githubUsername: githubUser.login,
            githubId: githubUser.id,
            walletAddress: parsed.walletAddress.toLowerCase(),
            claimedAt: now,
            projectsCount: contributors.length,
        },
    });
});
// Get current user's tier assignments across all projects
claims.get("/me", githubAuthMiddleware, async (c) => {
    const githubToken = c.get("githubToken");
    const githubUser = await getGitHubUser(githubToken);
    const db = await getDatabase();
    // Find all contributor records for this GitHub user
    const contributors = await db
        .collection("contributors")
        .aggregate([
        { $match: { githubUsername: githubUser.login } },
        {
            $lookup: {
                from: "projects",
                localField: "projectId",
                foreignField: "_id",
                as: "project",
            },
        },
        { $unwind: "$project" },
    ])
        .toArray();
    return c.json({
        githubUsername: githubUser.login,
        githubId: githubUser.id,
        walletAddress: contributors[0]?.walletAddress || null,
        claimed: !!contributors[0]?.walletAddress,
        projects: contributors.map((c) => ({
            projectId: c.projectId.toString(),
            repoUrl: c.project.repoUrl,
            repoOwner: c.project.repoOwner,
            repoName: c.project.repoName,
            tier: c.tier || null,
            tierAssignedAt: c.tierAssignedAt || null,
        })),
    });
});
// Check if a GitHub user has claimable contributions
claims.get("/check/:username", async (c) => {
    const username = c.req.param("username");
    const db = await getDatabase();
    const contributors = await db
        .collection("contributors")
        .aggregate([
        { $match: { githubUsername: username } },
        {
            $lookup: {
                from: "projects",
                localField: "projectId",
                foreignField: "_id",
                as: "project",
            },
        },
        { $unwind: "$project" },
    ])
        .toArray();
    return c.json({
        githubUsername: username,
        hasContributions: contributors.length > 0,
        claimed: contributors.some((c) => c.walletAddress),
        projectCount: contributors.length,
        projects: contributors.map((c) => ({
            repoUrl: c.project.repoUrl,
            tier: c.tier || null,
            claimed: !!c.walletAddress,
        })),
    });
});
export { claims as claimRoutes };
