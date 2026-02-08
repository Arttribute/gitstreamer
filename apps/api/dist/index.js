import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { config } from "./config.js";
import { connectToDatabase } from "./db/client.js";
import { createIndexes } from "./db/indexes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { githubRoutes, projectRoutes, contributorRoutes, tierRoutes, claimRoutes, streamRoutes, } from "./routes/index.js";
import { authMiddleware } from "./middleware/auth.js";
const app = new Hono();
// Global middleware
app.use("*", logger());
app.use("*", prettyJSON());
app.use("*", cors({
    origin: (origin) => {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin)
            return config.frontendUrl;
        // Check if origin is in allowed list
        if (config.allowedOrigins.includes(origin))
            return origin;
        // Allow Vercel preview deployments (e.g., https://gitstreamer-*.vercel.app)
        if (origin.match(/^https:\/\/.*\.vercel\.app$/))
            return origin;
        // Default to first allowed origin
        return config.frontendUrl;
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-wallet-address", "x-github-token"],
}));
// Health check
app.get("/health", (c) => {
    return c.json({
        status: "ok",
        timestamp: new Date().toISOString(),
    });
});
// Debug auth endpoint (for testing Privy authentication)
app.get("/api/auth/debug", authMiddleware, (c) => {
    return c.json({
        authenticated: true,
        walletAddress: c.get("walletAddress"),
        userId: c.get("userId"),
        authMethod: c.get("authMethod"),
    });
});
// API routes
app.route("/api/github", githubRoutes);
app.route("/api/projects", projectRoutes);
app.route("/api/contributors", contributorRoutes);
app.route("/api/tiers", tierRoutes);
app.route("/api/claims", claimRoutes);
app.route("/api/streams", streamRoutes);
// Error handling
app.onError(errorHandler);
// 404 handler
app.notFound((c) => {
    return c.json({
        error: {
            message: "Not found",
            code: "NOT_FOUND",
        },
    }, 404);
});
// Start server
async function main() {
    try {
        // Connect to database
        const db = await connectToDatabase();
        // Create indexes
        await createIndexes(db);
        // Start server
        serve({
            fetch: app.fetch,
            port: config.port,
        }, (info) => {
            console.log(`GitStream API running on http://localhost:${info.port}`);
            console.log(`Frontend URL: ${config.frontendUrl}`);
        });
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}
main();
