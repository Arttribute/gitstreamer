import { z } from "zod";
// Tier schemas
export const tierSchema = z.object({
    name: z.string().min(1).max(100),
    revenueShare: z.number().min(0).max(100),
    splitMethod: z.enum(["equal", "weighted"]),
});
export const tierConfigSchema = z.object({
    tiers: z.array(tierSchema).min(1).max(10),
    treasuryShare: z.number().min(0).max(100),
});
// Project schemas
export const createProjectSchema = z.object({
    repoUrl: z.string().min(1),
    branch: z.string().default("main"),
    tierConfig: tierConfigSchema.optional(),
});
export const updateProjectSchema = z.object({
    branch: z.string().optional(),
    tierConfig: tierConfigSchema.optional(),
    settings: z
        .object({
        minDistributionAmount: z.string().optional(),
        escrowExpiryDays: z.number().min(1).max(365).optional(),
    })
        .optional(),
});
// Tier assignment schemas
export const assignTierSchema = z.object({
    githubUsername: z.string().min(1),
    tier: z.string().min(1),
});
// Claim schemas
export const claimContributorSchema = z.object({
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    signature: z.string(),
    message: z.string(),
});
// Ethereum address validation
export const ethereumAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
// Pagination schemas
export const paginationSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
});
// Default tier configuration
export const DEFAULT_TIER_CONFIG = {
    tiers: [
        { name: "Core Maintainers", revenueShare: 40, splitMethod: "equal" },
        { name: "Active Contributors", revenueShare: 35, splitMethod: "equal" },
        { name: "Community", revenueShare: 15, splitMethod: "weighted" },
    ],
    treasuryShare: 10,
};
