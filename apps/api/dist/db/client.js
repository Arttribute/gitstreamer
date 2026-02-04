import { MongoClient, Db } from "mongodb";
import { config } from "../config.js";
let client = null;
let db = null;
export async function connectToDatabase() {
    if (db) {
        return db;
    }
    client = new MongoClient(config.mongodbUri);
    await client.connect();
    db = client.db();
    console.log("Connected to MongoDB");
    return db;
}
export async function getDatabase() {
    if (!db) {
        return connectToDatabase();
    }
    return db;
}
export async function closeDatabaseConnection() {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log("Disconnected from MongoDB");
    }
}
// Graceful shutdown
process.on("SIGINT", async () => {
    await closeDatabaseConnection();
    process.exit(0);
});
process.on("SIGTERM", async () => {
    await closeDatabaseConnection();
    process.exit(0);
});
