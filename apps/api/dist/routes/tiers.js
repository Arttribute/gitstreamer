import { Hono } from "hono";
import { ObjectId } from "mongodb";
import { getDatabase } from "../db/client.js";
import { authMiddleware } from "../middleware/auth.js";
import { projectOwnerMiddleware } from "../middleware/project-owner.js";
import { NotFoundError, ValidationError } from "../lib/errors.js";
import { assignTierSchema } from "../lib/validation.js";
const tiers = new Hono();
// All tier routes require authentication
tiers.use("/*", authMiddleware);
// Get tier configuration for a project
tiers.get("/project/:id", async (c) => {
    const projectId = c.req.param("id");
    if (!ObjectId.isValid(projectId)) {
        throw new NotFoundError("Invalid project ID");
    }
    const db = await getDatabase();
    const project = await db.collection("projects").findOne({
        _id: new ObjectId(projectId),
    });
    if (!project) {
        throw new NotFoundError("Project not found");
    }
    return c.json({
        projectId,
        tierConfig: project.tierConfig,
    });
});
// Get members of a specific tier
tiers.get("/project/:id/:tierName/members", async (c) => {
    const projectId = c.req.param("id");
    const tierName = c.req.param("tierName");
    if (!ObjectId.isValid(projectId)) {
        throw new NotFoundError("Invalid project ID");
    }
    const db = await getDatabase();
    // Verify project exists
    const project = await db.collection("projects").findOne({
        _id: new ObjectId(projectId),
    });
    if (!project) {
        throw new NotFoundError("Project not found");
    }
    // Check if tier exists in config
    const tierExists = project.tierConfig.tiers.some((t) => t.name === tierName);
    if (!tierExists) {
        throw new NotFoundError("Tier not found");
    }
    // Get members of this tier
    const members = await db
        .collection("contributors")
        .find({
        projectId: new ObjectId(projectId),
        tier: tierName,
    })
        .toArray();
    return c.json({
        tierName,
        members: members.map((m) => ({
            id: m._id?.toString(),
            githubUsername: m.githubUsername,
            walletAddress: m.walletAddress,
            tierAssignedAt: m.tierAssignedAt,
            tierAssignedBy: m.tierAssignedBy,
            claimed: !!m.walletAddress,
        })),
    });
});
// Assign contributor to tier (owner only)
tiers.post("/project/:id/assign", projectOwnerMiddleware, async (c) => {
    const project = c.get("project");
    const walletAddress = c.get("walletAddress");
    const body = await c.req.json();
    const parsed = assignTierSchema.parse(body);
    const db = await getDatabase();
    // Verify tier exists in project config
    const tierExists = project.tierConfig.tiers.some((t) => t.name === parsed.tier);
    if (!tierExists) {
        throw new ValidationError(`Tier "${parsed.tier}" does not exist in project configuration`);
    }
    // Find or create contributor
    const contributor = await db.collection("contributors").findOne({
        projectId: project._id,
        githubUsername: parsed.githubUsername,
    });
    if (!contributor) {
        // Create new contributor with tier assignment
        await db.collection("contributors").insertOne({
            projectId: project._id,
            githubUsername: parsed.githubUsername,
            tier: parsed.tier,
            tierAssignedAt: new Date(),
            tierAssignedBy: walletAddress,
            createdAt: new Date(),
        });
    }
    else {
        // Update existing contributor's tier
        await db.collection("contributors").updateOne({ _id: contributor._id }, {
            $set: {
                tier: parsed.tier,
                tierAssignedAt: new Date(),
                tierAssignedBy: walletAddress,
            },
        });
    }
    return c.json({
        success: true,
        message: `Assigned ${parsed.githubUsername} to tier "${parsed.tier}"`,
        assignment: {
            githubUsername: parsed.githubUsername,
            tier: parsed.tier,
            assignedAt: new Date(),
            assignedBy: walletAddress,
        },
    });
});
// Remove contributor from tier (owner only)
tiers.delete("/project/:id/assign/:username", projectOwnerMiddleware, async (c) => {
    const project = c.get("project");
    const username = c.req.param("username");
    const db = await getDatabase();
    const result = await db.collection("contributors").updateOne({
        projectId: project._id,
        githubUsername: username,
    }, {
        $unset: {
            tier: "",
            tierAssignedAt: "",
            tierAssignedBy: "",
        },
    });
    if (result.matchedCount === 0) {
        throw new NotFoundError("Contributor not found");
    }
    return c.json({
        success: true,
        message: `Removed ${username} from their tier`,
    });
});
// Get tier summary (counts and wallet status)
tiers.get("/project/:id/summary", async (c) => {
    const projectId = c.req.param("id");
    if (!ObjectId.isValid(projectId)) {
        throw new NotFoundError("Invalid project ID");
    }
    const db = await getDatabase();
    const project = await db.collection("projects").findOne({
        _id: new ObjectId(projectId),
    });
    if (!project) {
        throw new NotFoundError("Project not found");
    }
    // Aggregate tier membership stats
    const tierStats = await db
        .collection("contributors")
        .aggregate([
        { $match: { projectId: new ObjectId(projectId), tier: { $exists: true } } },
        {
            $group: {
                _id: "$tier",
                count: { $sum: 1 },
                claimedCount: {
                    $sum: { $cond: [{ $ne: ["$walletAddress", null] }, 1, 0] },
                },
            },
        },
    ])
        .toArray();
    const summary = project.tierConfig.tiers.map((tier) => {
        const stats = tierStats.find((s) => s._id === tier.name);
        return {
            name: tier.name,
            revenueShare: tier.revenueShare,
            splitMethod: tier.splitMethod,
            memberCount: stats?.count || 0,
            claimedCount: stats?.claimedCount || 0,
        };
    });
    return c.json({
        projectId,
        tiers: summary,
        treasuryShare: project.tierConfig.treasuryShare,
    });
});
export { tiers as tierRoutes };
