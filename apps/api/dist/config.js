import "dotenv/config";
export const config = {
    port: parseInt(process.env.PORT || "3001", 10),
    // MongoDB
    mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/gitstream",
    // GitHub OAuth
    github: {
        clientId: process.env.GITHUB_CLIENT_ID || "",
        clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
        callbackUrl: process.env.GITHUB_CALLBACK_URL || "http://localhost:3000/api/auth/github/callback",
    },
    // Yellow Network
    yellow: {
        apiKey: process.env.YELLOW_API_KEY || "",
        networkUrl: process.env.YELLOW_NETWORK_URL || "https://testnet.yellow.org",
    },
    // Contract addresses
    contracts: {
        gitStreamReceiver: process.env.GITSTREAM_RECEIVER_ADDRESS || "",
        usdc: process.env.USDC_ADDRESS || "",
    },
    // Chain config
    chain: {
        id: parseInt(process.env.CHAIN_ID || "84532", 10), // Base Sepolia
        rpcUrl: process.env.RPC_URL || "",
    },
    // JWT secret for session tokens
    jwtSecret: process.env.JWT_SECRET || "dev-secret-change-in-production",
    // Frontend URL for CORS
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
};
