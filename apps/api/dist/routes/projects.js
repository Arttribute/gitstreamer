import { Hono } from "hono";
import { ObjectId } from "mongodb";
import { getDatabase } from "../db/client.js";
import { parseRepoUrl, DEFAULT_PROJECT_SETTINGS } from "../db/models/project.js";
import { authMiddleware } from "../middleware/auth.js";
import { projectOwnerMiddleware } from "../middleware/project-owner.js";
import { NotFoundError, ConflictError, ValidationError } from "../lib/errors.js";
import { createProjectSchema, updateProjectSchema, tierConfigSchema, DEFAULT_TIER_CONFIG, } from "../lib/validation.js";
const projects = new Hono();
// All project routes require authentication
projects.use("/*", authMiddleware);
// Create a new project
projects.post("/", async (c) => {
    const walletAddress = c.get("walletAddress");
    const body = await c.req.json();
    const parsed = createProjectSchema.parse(body);
    const repoInfo = parseRepoUrl(parsed.repoUrl);
    if (!repoInfo) {
        throw new ValidationError("Invalid repository URL format");
    }
    const db = await getDatabase();
    // Check if project already exists
    const existing = await db.collection("projects").findOne({
        repoUrl: parsed.repoUrl,
    });
    if (existing) {
        throw new ConflictError("Project already exists for this repository");
    }
    const now = new Date();
    const project = {
        repoUrl: parsed.repoUrl,
        repoOwner: repoInfo.owner,
        repoName: repoInfo.name,
        branch: parsed.branch,
        ownerAddress: walletAddress,
        tierConfig: parsed.tierConfig || DEFAULT_TIER_CONFIG,
        settings: DEFAULT_PROJECT_SETTINGS,
        createdAt: now,
        updatedAt: now,
    };
    const result = await db.collection("projects").insertOne(project);
    return c.json({
        project: {
            id: result.insertedId.toString(),
            _id: result.insertedId.toString(),
            ...project,
        },
    }, 201);
});
// List user's projects
projects.get("/", async (c) => {
    const walletAddress = c.get("walletAddress");
    const db = await getDatabase();
    const userProjects = await db
        .collection("projects")
        .find({ ownerAddress: walletAddress })
        .sort({ updatedAt: -1 })
        .toArray();
    return c.json({
        projects: userProjects.map((p) => ({
            id: p._id?.toString(),
            repoUrl: p.repoUrl,
            repoOwner: p.repoOwner,
            repoName: p.repoName,
            branch: p.branch,
            tierConfig: p.tierConfig,
            yellowSessionId: p.yellowSessionId,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        })),
    });
});
// Get project by ID
projects.get("/:id", async (c) => {
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
        project: {
            id: project._id?.toString(),
            _id: project._id?.toString(),
            repoUrl: project.repoUrl,
            repoOwner: project.repoOwner,
            repoName: project.repoName,
            branch: project.branch,
            ownerAddress: project.ownerAddress,
            tierConfig: project.tierConfig,
            settings: project.settings,
            receiverContract: project.receiverContract,
            yellowSessionId: project.yellowSessionId,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        },
    });
});
// Update project (owner only)
projects.put("/:id", projectOwnerMiddleware, async (c) => {
    const project = c.get("project");
    const body = await c.req.json();
    const parsed = updateProjectSchema.parse(body);
    const db = await getDatabase();
    const updateData = {
        updatedAt: new Date(),
    };
    if (parsed.branch) {
        updateData.branch = parsed.branch;
    }
    if (parsed.tierConfig) {
        updateData.tierConfig = parsed.tierConfig;
    }
    if (parsed.settings) {
        updateData.settings = {
            ...project.settings,
            ...parsed.settings,
        };
    }
    await db.collection("projects").updateOne({ _id: project._id }, { $set: updateData });
    const updatedProject = await db.collection("projects").findOne({
        _id: project._id,
    });
    return c.json({
        project: {
            id: updatedProject._id?.toString(),
            _id: updatedProject._id?.toString(),
            repoUrl: updatedProject.repoUrl,
            repoOwner: updatedProject.repoOwner,
            repoName: updatedProject.repoName,
            branch: updatedProject.branch,
            ownerAddress: updatedProject.ownerAddress,
            tierConfig: updatedProject.tierConfig,
            settings: updatedProject.settings,
            receiverContract: updatedProject.receiverContract,
            yellowSessionId: updatedProject.yellowSessionId,
            createdAt: updatedProject.createdAt,
            updatedAt: updatedProject.updatedAt,
        },
    });
});
// Update tier configuration (owner only)
projects.put("/:id/tiers", projectOwnerMiddleware, async (c) => {
    const project = c.get("project");
    const body = await c.req.json();
    const tierConfig = tierConfigSchema.parse(body);
    // Validate total percentages
    const totalTierShare = tierConfig.tiers.reduce((sum, t) => sum + t.revenueShare, 0);
    if (totalTierShare + tierConfig.treasuryShare !== 100) {
        throw new ValidationError("Total tier shares plus treasury must equal 100%");
    }
    const db = await getDatabase();
    await db.collection("projects").updateOne({ _id: project._id }, {
        $set: {
            tierConfig,
            updatedAt: new Date(),
        },
    });
    const updatedProject = await db.collection("projects").findOne({
        _id: project._id,
    });
    return c.json({
        project: {
            id: updatedProject._id?.toString(),
            _id: updatedProject._id?.toString(),
            repoUrl: updatedProject.repoUrl,
            repoOwner: updatedProject.repoOwner,
            repoName: updatedProject.repoName,
            branch: updatedProject.branch,
            ownerAddress: updatedProject.ownerAddress,
            tierConfig: updatedProject.tierConfig,
            settings: updatedProject.settings,
            receiverContract: updatedProject.receiverContract,
            yellowSessionId: updatedProject.yellowSessionId,
            createdAt: updatedProject.createdAt,
            updatedAt: updatedProject.updatedAt,
        },
    });
});
// Delete project (owner only)
projects.delete("/:id", projectOwnerMiddleware, async (c) => {
    const project = c.get("project");
    const db = await getDatabase();
    await db.collection("projects").deleteOne({ _id: project._id });
    // Also delete related data
    await db.collection("contributors").deleteMany({ projectId: project._id });
    await db.collection("contributorMetrics").deleteMany({ projectId: project._id });
    return c.json({
        success: true,
        message: "Project deleted",
    });
});
export { projects as projectRoutes };
