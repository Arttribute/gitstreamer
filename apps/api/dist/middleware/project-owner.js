import { ObjectId } from "mongodb";
import { getDatabase } from "../db/client.js";
import { ForbiddenError, NotFoundError } from "../lib/errors.js";
// Middleware to verify the authenticated user owns the project
export async function projectOwnerMiddleware(c, next) {
    const projectId = c.req.param("id");
    const walletAddress = c.get("walletAddress");
    if (!projectId) {
        throw new NotFoundError("Project ID required");
    }
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
    if (project.ownerAddress.toLowerCase() !== walletAddress) {
        throw new ForbiddenError("You do not own this project");
    }
    // Store project in context for route handlers
    c.set("project", project);
    await next();
}
