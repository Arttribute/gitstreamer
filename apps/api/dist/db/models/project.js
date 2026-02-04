import { ObjectId } from "mongodb";
export const DEFAULT_PROJECT_SETTINGS = {
    minDistributionAmount: "10000000", // 10 USDC (6 decimals)
    escrowExpiryDays: 180,
};
export function parseRepoUrl(url) {
    // Handle various GitHub URL formats
    const patterns = [
        /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/,
        /^([^/]+)\/([^/]+)$/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return { owner: match[1], name: match[2] };
        }
    }
    return null;
}
