import { ObjectId } from "mongodb";

export interface Contributor {
  _id?: ObjectId;
  projectId: ObjectId;
  githubUsername: string;
  githubId?: number;
  githubEmail?: string;
  walletAddress?: string;
  tier?: string;
  tierAssignedAt?: Date;
  tierAssignedBy?: string;
  claimedAt?: Date;
  createdAt: Date;
}

export interface ContributorMetrics {
  _id?: ObjectId;
  projectId: ObjectId;
  githubUsername: string;
  calculatedAt: Date;
  commitHash: string;
  metrics: {
    linesOfCode: number;
    commits: number;
    filesModified: number;
    firstContribution: Date;
    lastContribution: Date;
  };
  suggestedTier: string;
}
