import { Db } from "mongodb";
export async function createIndexes(db) {
    console.log("Creating database indexes...");
    // Projects indexes
    await db.collection("projects").createIndex({ repoUrl: 1 }, { unique: true });
    await db.collection("projects").createIndex({ ownerAddress: 1 });
    await db.collection("projects").createIndex({ "repoOwner": 1, "repoName": 1 });
    // Contributors indexes
    await db.collection("contributors").createIndex({ projectId: 1 });
    await db.collection("contributors").createIndex({ githubUsername: 1 });
    await db
        .collection("contributors")
        .createIndex({ projectId: 1, githubUsername: 1 }, { unique: true });
    await db
        .collection("contributors")
        .createIndex({ walletAddress: 1 }, { sparse: true });
    // Contributor metrics indexes
    await db.collection("contributorMetrics").createIndex({ projectId: 1 });
    await db.collection("contributorMetrics").createIndex({ calculatedAt: -1 });
    await db
        .collection("contributorMetrics")
        .createIndex({ projectId: 1, githubUsername: 1 });
    // Revenue indexes
    await db.collection("revenue").createIndex({ projectId: 1 });
    await db.collection("revenue").createIndex({ txHash: 1 }, { unique: true });
    await db.collection("revenue").createIndex({ distributed: 1 });
    await db.collection("revenue").createIndex({ createdAt: -1 });
    // Escrow indexes
    await db.collection("escrow").createIndex({ projectId: 1 });
    await db.collection("escrow").createIndex({ githubUsername: 1 });
    await db.collection("escrow").createIndex({ expiresAt: 1 });
    // GitHub sessions (for OAuth state)
    await db.collection("githubSessions").createIndex({ state: 1 }, { unique: true });
    await db.collection("githubSessions").createIndex({ createdAt: 1 }, { expireAfterSeconds: 600 } // 10 min TTL
    );
    console.log("Database indexes created successfully");
}
