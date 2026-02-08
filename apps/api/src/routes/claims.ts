import { Hono } from "hono";
import type { ContextVariables } from "../types.js";
import { getDatabase } from "../db/client.js";
import type { Contributor } from "../db/models/contributor.js";
import type { Project } from "../db/models/project.js";
import { authMiddleware, githubAuthMiddleware } from "../middleware/auth.js";
import { NotFoundError, ConflictError } from "../lib/errors.js";
import { claimContributorSchema } from "../lib/validation.js";
import { getGitHubUser } from "../services/github/oauth.js";

const claims = new Hono<{ Variables: ContextVariables }>();

// Claim contribution - link GitHub account to wallet
// Requires both Privy auth (for wallet) and GitHub token
claims.post("/", authMiddleware, githubAuthMiddleware, async (c) => {
  const walletAddress = c.get("walletAddress");
  const githubToken = c.get("githubToken");
  const body = await c.req.json();

  const parsed = claimContributorSchema.parse(body);

  // Verify wallet address matches authenticated user
  if (parsed.walletAddress.toLowerCase() !== walletAddress) {
    throw new ConflictError("Wallet address mismatch");
  }

  // Get GitHub user from token
  const githubUser = await getGitHubUser(githubToken);

  const db = await getDatabase();

  // Find all contributor records for this GitHub user
  const contributors = await db
    .collection<Contributor>("contributors")
    .find({ githubUsername: githubUser.login })
    .toArray();

  if (contributors.length === 0) {
    throw new NotFoundError(
      `No contributions found for GitHub user: ${githubUser.login}`
    );
  }

  // Check if any already claimed with a different wallet
  const alreadyClaimed = contributors.find(
    (c) => c.walletAddress && c.walletAddress !== parsed.walletAddress.toLowerCase()
  );

  if (alreadyClaimed) {
    throw new ConflictError(
      "This GitHub account is already linked to a different wallet"
    );
  }

  // TODO: In production, verify the signature matches the wallet address
  // This would use viem to recover the signer from the signature

  const now = new Date();

  // Update all contributor records with wallet address
  await db.collection<Contributor>("contributors").updateMany(
    { githubUsername: githubUser.login },
    {
      $set: {
        walletAddress: parsed.walletAddress.toLowerCase(),
        githubId: githubUser.id,
        githubEmail: githubUser.email || undefined,
        claimedAt: now,
      },
    }
  );

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
// Uses Privy auth to identify user by wallet address
claims.get("/me", authMiddleware, async (c) => {
  const walletAddress = c.get("walletAddress");

  const db = await getDatabase();

  // Find all contributor records for this wallet address
  const contributors = await db
    .collection<Contributor>("contributors")
    .aggregate([
      { $match: { walletAddress: walletAddress.toLowerCase() } },
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
    walletAddress,
    claimed: contributors.length > 0,
    githubUsername: contributors[0]?.githubUsername || null,
    githubId: contributors[0]?.githubId || null,
    assignments: contributors
      .filter((c: any) => c.tier)
      .map((c: any) => ({
        project: {
          _id: c.projectId.toString(),
          repoUrl: c.project.repoUrl,
          repoOwner: c.project.repoOwner,
          repoName: c.project.repoName,
          branch: c.project.branch,
          ownerAddress: c.project.ownerAddress,
          tierConfig: c.project.tierConfig,
          createdAt: c.project.createdAt,
          updatedAt: c.project.updatedAt,
        } as Project,
        tier: c.tier,
        tierAssignedAt: c.tierAssignedAt,
      })),
  });
});

// Check if a GitHub user has claimable contributions
claims.get("/check/:username", async (c) => {
  const username = c.req.param("username");

  const db = await getDatabase();

  const contributors = await db
    .collection<Contributor>("contributors")
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
    claimed: contributors.some((c: any) => c.walletAddress),
    projectCount: contributors.length,
    projects: contributors.map((c: any) => ({
      repoUrl: c.project.repoUrl,
      tier: c.tier || null,
      claimed: !!c.walletAddress,
    })),
  });
});

export { claims as claimRoutes };
