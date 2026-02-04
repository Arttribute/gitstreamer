export interface YellowChannel {
  channel_id: string;
  participant: string;
  status: "open" | "closed" | "settling";
  token: string;
  amount: string;
  chain_id: number;
  adjudicator: string;
  challenge: number;
  nonce: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface YellowBalance {
  asset: string;
  amount: string;
}

export interface AppDefinition {
  protocol: string;
  participants: string[];
  weights: number[];
  quorum: number;
  challenge: number;
  nonce: number;
}

export interface Allocation {
  participant: string;
  asset: string;
  amount: string;
}

export interface AppSession {
  definition: AppDefinition;
  allocations: Allocation[];
}

export interface YellowSessionConfig {
  projectId: string;
  participants: string[];
  allocations: Allocation[];
}

export interface TierAllocationInput {
  tier: string;
  amount: bigint;
  members: Array<{
    walletAddress: string;
    share: bigint;
  }>;
}

export interface YellowConnectionStatus {
  connected: boolean;
  authenticated: boolean;
  channelCount: number;
}
