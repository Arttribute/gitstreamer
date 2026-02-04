import { ObjectId } from "mongodb";

export interface RevenueEvent {
  _id?: ObjectId;
  projectId: ObjectId;
  amount: string;
  tokenAddress: string;
  txHash: string;
  blockNumber: number;
  chainId: number;
  distributed: boolean;
  distributedAt?: Date;
  createdAt: Date;
}

export interface Escrow {
  _id?: ObjectId;
  projectId: ObjectId;
  githubUsername: string;
  amount: string;
  tokenAddress: string;
  expiresAt: Date;
  claimedAt?: Date;
  claimedTxHash?: string;
  createdAt: Date;
  updatedAt: Date;
}
