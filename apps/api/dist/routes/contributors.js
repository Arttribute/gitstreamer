import { Hono } from "hono";
import { ObjectId } from "mongodb";
import { getDatabase } from "../db/client.js";
import { authMiddleware, githubAuthMiddleware } from "../middleware/auth.js";
import { projectOwnerMiddleware } from "../middleware/project-owner.js";
import { NotFoundError } from "../lib/errors.js";
import { createOctokitClient, getContributorStats, getLatestCommitSha } from "../services/github/client.js";
const contributors = new Hono();
// List contributors for a project
contributors.get("/project/:id", authMiddleware, async (c) => {
    const projectId = c.req.param("id");
    if (!ObjectId.isValid(projectId)) {
        throw new NotFoundError("Invalid project ID");
    }
    const db = await getDatabase();
    // Get project
    const project = await db.collection("projects").findOne({
        _id: new ObjectId(projectId),
    });
    if (!project) {
        throw new NotFoundError("Project not found");
    }
    // Get contributors with their metrics
    const contributorsList = await db
        .collection("contributors")
        .find({ projectId: new ObjectId(projectId) })
        .toArray();
    // Get latest metrics for each contributor
    const contributorsWithMetrics = await Promise.all(contributorsList.map(async (contributor) => {
        const metrics = await db
            .collection("contributorMetrics")
            .findOne({ projectId: new ObjectId(projectId), githubUsername: contributor.githubUsername }, { sort: { calculatedAt: -1 } });
        return {
            id: contributor._id?.toString(),
            githubUsername: contributor.githubUsername,
            githubId: contributor.githubId,
            walletAddress: contributor.walletAddress,
            tier: contributor.tier,
            tierAssignedAt: contributor.tierAssignedAt,
            claimed: !!contributor.walletAddress,
            claimedAt: contributor.claimedAt,
            metrics: metrics?.metrics || null,
            suggestedTier: metrics?.suggestedTier || null,
        };
    }));
    return c.json({
        projectId,
        contributors: contributorsWithMetrics,
    });
});
// Refresh contributors from GitHub (requires both auth and GitHub token)
contributors.post("/project/:id/refresh", authMiddleware, projectOwnerMiddleware, githubAuthMiddleware, async (c) => {
    const project = c.get("project");
    const githubToken = c.get("githubToken");
    const octokit = createOctokitClient(githubToken);
    const db = await getDatabase();
    // Get contributor stats from GitHub
    const stats = await getContributorStats(octokit, project.repoOwner, project.repoName);
    // Get latest commit SHA
    const commitSha = await getLatestCommitSha(octokit, project.repoOwner, project.repoName, project.branch);
    const now = new Date();
    // Update contributors and metrics
    for (const stat of stats) {
        // Upsert contributor
        await db.collection("contributors").updateOne({
            projectId: project._id,
            githubUsername: stat.githubUsername,
        }, {
            $setOnInsert: {
                projectId: project._id,
                githubUsername: stat.githubUsername,
                createdAt: now,
            },
        }, { upsert: true });
        // Insert new metrics record
        const metricsRecord = {
            projectId: project._id,
            githubUsername: stat.githubUsername,
            calculatedAt: now,
            commitHash: commitSha,
            metrics: stat.metrics,
            suggestedTier: stat.suggestedTier,
        };
        await db.collection("contributorMetrics").insertOne(metricsRecord);
    }
    return c.json({
        success: true,
        message: "Contributors refreshed",
        count: stats.length,
        commitHash: commitSha,
    });
});
// Get specific contributor details
contributors.get("/project/:id/:username", authMiddleware, async (c) => {
    const projectId = c.req.param("id");
    const username = c.req.param("username");
    if (!ObjectId.isValid(projectId)) {
        throw new NotFoundError("Invalid project ID");
    }
    const db = await getDatabase();
    const contributor = await db.collection("contributors").findOne({
        projectId: new ObjectId(projectId),
        githubUsername: username,
    });
    if (!contributor) {
        throw new NotFoundError("Contributor not found");
    }
    // Get metrics history
    const metricsHistory = await db
        .collection("contributorMetrics")
        .find({
        projectId: new ObjectId(projectId),
        githubUsername: username,
    })
        .sort({ calculatedAt: -1 })
        .limit(10)
        .toArray();
    return c.json({
        id: contributor._id?.toString(),
        githubUsername: contributor.githubUsername,
        githubId: contributor.githubId,
        walletAddress: contributor.walletAddress,
        tier: contributor.tier,
        tierAssignedAt: contributor.tierAssignedAt,
        tierAssignedBy: contributor.tierAssignedBy,
        claimed: !!contributor.walletAddress,
        claimedAt: contributor.claimedAt,
        metricsHistory: metricsHistory.map((m) => ({
            calculatedAt: m.calculatedAt,
            commitHash: m.commitHash,
            metrics: m.metrics,
            suggestedTier: m.suggestedTier,
        })),
    });
});
export { contributors as contributorRoutes };
