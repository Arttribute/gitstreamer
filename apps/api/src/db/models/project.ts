import { ObjectId } from "mongodb";

export interface TierDefinition {
  name: string;
  revenueShare: number;
  splitMethod: "equal" | "weighted";
}

export interface TierConfig {
  tiers: TierDefinition[];
  treasuryShare: number;
}

export interface ProjectSettings {
  minDistributionAmount: string;
  escrowExpiryDays: number;
}

export interface Project {
  _id?: ObjectId;
  repoUrl: string;
  repoOwner: string;
  repoName: string;
  branch: string;
  ownerAddress: string;
  receiverContract?: string;
  projectIdBytes32?: string;
  yellowSessionId?: string;
  tierConfig: TierConfig;
  settings: ProjectSettings;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  minDistributionAmount: "10000000", // 10 USDC (6 decimals)
  escrowExpiryDays: 180,
};

export function parseRepoUrl(url: string): { owner: string; name: string } | null {
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
