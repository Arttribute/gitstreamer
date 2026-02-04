import { Hono } from "hono";
import { ObjectId } from "mongodb";
import type { ContextVariables } from "../types.js";
import { getDatabase } from "../db/client.js";
import type { Project } from "../db/models/project.js";
import type { Contributor } from "../db/models/contributor.js";
import type { RevenueEvent } from "../db/models/revenue.js";
import { authMiddleware } from "../middleware/auth.js";
import { projectOwnerMiddleware } from "../middleware/project-owner.js";
import { NotFoundError, ValidationError } from "../lib/errors.js";
import {
  getYellowClient,
  createStreamingSession,
  calculateTierAllocations,
  getSessionBalance,
} from "../services/yellow/streaming.js";

const streams = new Hono<{ Variables: ContextVariables }>();

// All stream routes require authentication
streams.use("/*", authMiddleware);

// Get stream status for a project
streams.get("/project/:id", async (c) => {
  const projectId = c.req.param("id");

  if (!ObjectId.isValid(projectId)) {
    throw new NotFoundError("Invalid project ID");
  }

  const db = await getDatabase();

  const project = await db.collection<Project>("projects").findOne({
    _id: new ObjectId(projectId),
  });

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  // Get total revenue
  const totalRevenue = await db
    .collection<RevenueEvent>("revenue")
    .aggregate([
      { $match: { projectId: new ObjectId(projectId) } },
      { $group: { _id: null, total: { $sum: { $toLong: "$amount" } } } },
    ])
    .toArray();

  // Get distributed revenue
  const distributedRevenue = await db
    .collection<RevenueEvent>("revenue")
    .aggregate([
      { $match: { projectId: new ObjectId(projectId), distributed: true } },
      { $group: { _id: null, total: { $sum: { $toLong: "$amount" } } } },
    ])
    .toArray();

  // Get tier member counts with claimed wallets
  const tierStats = await db
    .collection<Contributor>("contributors")
    .aggregate([
      {
        $match: {
          projectId: new ObjectId(projectId),
          tier: { $exists: true },
          walletAddress: { $exists: true },
        },
      },
      {
        $group: {
          _id: "$tier",
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  return c.json({
    projectId,
    yellowSessionId: project.yellowSessionId || null,
    hasActiveSession: !!project.yellowSessionId,
    totalRevenue: totalRevenue[0]?.total?.toString() || "0",
    distributedRevenue: distributedRevenue[0]?.total?.toString() || "0",
    pendingRevenue: (
      BigInt(totalRevenue[0]?.total || 0) - BigInt(distributedRevenue[0]?.total || 0)
    ).toString(),
    tierConfig: project.tierConfig,
    tierStats: tierStats.map((s) => ({
      tier: s._id,
      claimedMemberCount: s.count,
    })),
  });
});

// Get revenue history for a project
streams.get("/project/:id/revenue", async (c) => {
  const projectId = c.req.param("id");
  const limit = parseInt(c.req.query("limit") || "50", 10);

  if (!ObjectId.isValid(projectId)) {
    throw new NotFoundError("Invalid project ID");
  }

  const db = await getDatabase();

  const revenue = await db
    .collection<RevenueEvent>("revenue")
    .find({ projectId: new ObjectId(projectId) })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 100))
    .toArray();

  return c.json({
    projectId,
    revenue: revenue.map((r) => ({
      id: r._id?.toString(),
      amount: r.amount,
      tokenAddress: r.tokenAddress,
      txHash: r.txHash,
      blockNumber: r.blockNumber,
      chainId: r.chainId,
      distributed: r.distributed,
      distributedAt: r.distributedAt,
      createdAt: r.createdAt,
    })),
  });
});

// Create or update a streaming session for a project
streams.post("/project/:id/create", projectOwnerMiddleware, async (c) => {
  const project = c.get("project") as Project;
  const db = await getDatabase();

  // Check if there's already an active session
  if (project.yellowSessionId) {
    throw new ValidationError("Project already has an active streaming session");
  }

  // Get all tier members with claimed wallets
  const contributors = await db
    .collection<Contributor>("contributors")
    .find({
      projectId: project._id,
      tier: { $exists: true },
      walletAddress: { $exists: true },
    })
    .toArray();

  if (contributors.length === 0) {
    throw new ValidationError(
      "No contributors with claimed wallets. Contributors must claim their wallets before creating a streaming session."
    );
  }

  // Group contributors by tier
  const tierMembers = new Map<string, Array<{ walletAddress: string }>>();
  for (const contributor of contributors) {
    const tier = contributor.tier!;
    if (!tierMembers.has(tier)) {
      tierMembers.set(tier, []);
    }
    tierMembers.get(tier)!.push({
      walletAddress: contributor.walletAddress!,
    });
  }

  // Calculate pending revenue
  const pendingRevenue = await db
    .collection<RevenueEvent>("revenue")
    .aggregate([
      { $match: { projectId: project._id, distributed: false } },
      { $group: { _id: null, total: { $sum: { $toLong: "$amount" } } } },
    ])
    .toArray();

  const totalAmount = BigInt(pendingRevenue[0]?.total || 0);

  if (totalAmount === 0n) {
    throw new ValidationError("No pending revenue to distribute");
  }

  // Calculate tier allocations
  const allocations = calculateTierAllocations(totalAmount, project.tierConfig, tierMembers);

  // Create Yellow session
  const sessionId = await createStreamingSession(
    project._id!.toString(),
    allocations,
    totalAmount
  );

  // Update project with session ID
  await db.collection<Project>("projects").updateOne(
    { _id: project._id },
    {
      $set: {
        yellowSessionId: sessionId,
        updatedAt: new Date(),
      },
    }
  );

  // Mark revenue as distributed
  await db.collection<RevenueEvent>("revenue").updateMany(
    { projectId: project._id, distributed: false },
    {
      $set: {
        distributed: true,
        distributedAt: new Date(),
      },
    }
  );

  return c.json({
    success: true,
    sessionId,
    allocations: allocations.map((a) => ({
      tier: a.tier,
      amount: a.amount.toString(),
      memberCount: a.members.length,
    })),
  });
});

// Get Yellow connection status
streams.get("/status", async (c) => {
  try {
    const client = await getYellowClient();
    const status = client.getStatus();
    const balances = await client.getLedgerBalances();

    return c.json({
      status: "connected",
      ...status,
      balances,
    });
  } catch (error) {
    return c.json({
      status: "disconnected",
      connected: false,
      authenticated: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get current session balance
streams.get("/balance", async (c) => {
  const address = c.req.query("address");

  try {
    const balance = await getSessionBalance(address);
    return c.json({ balance });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : "Failed to get balance",
      },
      500
    );
  }
});

export { streams as streamRoutes };
