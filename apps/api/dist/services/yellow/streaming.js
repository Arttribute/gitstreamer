import { YellowClient } from "./client.js";
import { config } from "../../config.js";
// Singleton Yellow client instance
let yellowClient = null;
/**
 * Get or create the Yellow client instance
 */
export async function getYellowClient() {
    if (!yellowClient) {
        if (!config.yellow.privateKey) {
            throw new Error("YELLOW_PRIVATE_KEY not configured. This wallet private key is required to manage Yellow Network state channels.");
        }
        yellowClient = new YellowClient(config.yellow.privateKey);
        await yellowClient.connect(config.yellow.useSandbox);
    }
    return yellowClient;
}
/**
 * Create a payment streaming session for a project
 */
export async function createStreamingSession(projectId, tierAllocations, totalAmount) {
    const client = await getYellowClient();
    // Collect all unique participants from tier allocations
    const participants = new Set();
    participants.add(client.getWalletAddress()); // Add GitStream as first participant
    for (const tier of tierAllocations) {
        for (const member of tier.members) {
            participants.add(member.walletAddress);
        }
    }
    const participantList = Array.from(participants);
    // Build allocations array
    const allocations = [];
    // GitStream's initial allocation (the full amount)
    allocations.push({
        participant: client.getWalletAddress(),
        asset: "usdc",
        amount: totalAmount.toString(),
    });
    // Add zero allocations for all other participants (they receive via state updates)
    for (const participant of participantList.slice(1)) {
        allocations.push({
            participant,
            asset: "usdc",
            amount: "0",
        });
    }
    // Create the app session
    const session = {
        definition: {
            protocol: "gitstream-payment-v1",
            participants: participantList,
            weights: participantList.map((_, i) => (i === 0 ? 100 : 0)), // GitStream controls
            quorum: 100,
            challenge: 86400, // 24 hour challenge period
            nonce: Date.now(),
        },
        allocations,
    };
    const sessionId = await client.createAppSession([session]);
    console.log(`Created Yellow session ${sessionId} for project ${projectId}`);
    return sessionId;
}
/**
 * Calculate allocations based on tier configuration
 */
export function calculateTierAllocations(totalAmount, tierConfig, tierMembers) {
    const allocations = [];
    for (const tier of tierConfig.tiers) {
        const tierAmount = (totalAmount * BigInt(tier.revenueShare)) / 100n;
        const members = tierMembers.get(tier.name) || [];
        if (members.length === 0) {
            // No members in this tier, add to treasury or skip
            continue;
        }
        const memberAllocations = [];
        if (tier.splitMethod === "equal") {
            // Equal split among all members
            const perMember = tierAmount / BigInt(members.length);
            const remainder = tierAmount % BigInt(members.length);
            members.forEach((member, index) => {
                // Give any remainder to the first member
                const share = index === 0 ? perMember + remainder : perMember;
                memberAllocations.push({
                    walletAddress: member.walletAddress,
                    share,
                });
            });
        }
        else {
            // Weighted split based on contribution metrics
            const totalWeight = members.reduce((sum, m) => sum + (m.weight || 1), 0);
            for (const member of members) {
                const weight = member.weight || 1;
                const share = (tierAmount * BigInt(weight)) / BigInt(totalWeight);
                memberAllocations.push({
                    walletAddress: member.walletAddress,
                    share,
                });
            }
        }
        allocations.push({
            tier: tier.name,
            amount: tierAmount,
            members: memberAllocations,
        });
    }
    return allocations;
}
/**
 * Get the current balance in the Yellow session
 */
export async function getSessionBalance(address) {
    const client = await getYellowClient();
    const balances = await client.getLedgerBalances(address);
    const usdcBalance = balances.find((b) => b.asset.toLowerCase() === "usdc");
    return usdcBalance?.amount || "0";
}
/**
 * Disconnect the Yellow client
 */
export function disconnectYellow() {
    if (yellowClient) {
        yellowClient.disconnect();
        yellowClient = null;
    }
}
