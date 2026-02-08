const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type RequestOptions = {
  accessToken?: string; // Privy auth token
  githubToken?: string;
};

async function request<T>(
  endpoint: string,
  options: RequestInit & RequestOptions = {}
): Promise<T> {
  const { accessToken, githubToken, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Use Privy auth token as Bearer token
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  if (githubToken) {
    headers["x-github-token"] = githubToken;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Project types
export interface TierConfig {
  name: string;
  revenueShare: number;
  splitMethod: "equal" | "weighted";
}

export interface Project {
  _id: string;
  repoUrl: string;
  repoOwner: string;
  repoName: string;
  branch: string;
  ownerAddress: string;
  receiverContract?: string;
  projectIdBytes32?: string;
  yellowSessionId?: string;
  tierConfig: {
    tiers: TierConfig[];
    treasuryShare: number;
  };
  settings: {
    minDistributionAmount: string;
    escrowExpiryDays: number;
  };
  onchainRegistered?: boolean;
  onchainTxHash?: string;
  onchainRegisteredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contributor {
  _id: string;
  projectId: string;
  githubUsername: string;
  githubId?: number;
  githubEmail?: string;
  walletAddress?: string;
  tier?: string;
  tierAssignedAt?: string;
  tierAssignedBy?: string;
  claimedAt?: string;
  createdAt: string;
}

export interface ContributorMetrics {
  _id: string;
  projectId: string;
  githubUsername: string;
  calculatedAt: string;
  commitHash: string;
  metrics: {
    linesOfCode: number;
    commits: number;
    filesModified: number;
    firstContribution: string;
    lastContribution: string;
  };
  suggestedTier: "core" | "active" | "community" | "new";
}

export interface ContributorWithMetrics extends Contributor {
  latestMetrics?: ContributorMetrics;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  private: boolean;
  html_url: string;
  description?: string;
  default_branch: string;
}

export interface RevenueEvent {
  _id: string;
  projectId: string;
  amount: string;
  tokenAddress: string;
  txHash: string;
  blockNumber: number;
  chainId: number;
  distributed: boolean;
  distributedAt?: string;
  createdAt: string;
}

export interface StreamStatus {
  project: Project;
  sessionId?: string;
  totalRevenue: string;
  distributedRevenue: string;
  pendingRevenue: string;
  tierAllocations: {
    tier: string;
    amount: string;
    members: number;
  }[];
}

// API methods
export const api = {
  // Projects
  projects: {
    list: (accessToken: string) =>
      request<{ projects: Project[] }>("/api/projects", { accessToken }),

    get: (id: string, accessToken?: string) =>
      request<{ project: Project }>(`/api/projects/${id}`, { accessToken }),

    create: (
      data: {
        repoUrl: string;
        branch?: string;
        tierConfig?: Project["tierConfig"];
      },
      accessToken: string
    ) =>
      request<{ project: Project }>("/api/projects", {
        method: "POST",
        body: JSON.stringify(data),
        accessToken,
      }),

    update: (
      id: string,
      data: Partial<Pick<Project, "branch" | "settings">>,
      accessToken: string
    ) =>
      request<{ project: Project }>(`/api/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        accessToken,
      }),

    updateTiers: (
      id: string,
      tierConfig: Project["tierConfig"],
      accessToken: string
    ) =>
      request<{ project: Project }>(`/api/projects/${id}/tiers`, {
        method: "PUT",
        body: JSON.stringify({ tierConfig }),
        accessToken,
      }),

    markRegistered: (id: string, txHash: string, accessToken: string) =>
      request<{ project: Project }>(`/api/projects/${id}/register`, {
        method: "POST",
        body: JSON.stringify({ txHash }),
        accessToken,
      }),

    delete: (id: string, accessToken: string) =>
      request<{ success: boolean }>(`/api/projects/${id}`, {
        method: "DELETE",
        accessToken,
      }),
  },

  // Contributors
  contributors: {
    list: (projectId: string, accessToken?: string) =>
      request<{ contributors: ContributorWithMetrics[] }>(
        `/api/contributors/project/${projectId}`,
        { accessToken }
      ),

    refresh: (projectId: string, accessToken: string, githubToken: string) =>
      request<{ contributors: ContributorWithMetrics[] }>(
        `/api/contributors/project/${projectId}/refresh`,
        {
          method: "POST",
          accessToken,
          githubToken,
        }
      ),

    get: (projectId: string, username: string, accessToken?: string) =>
      request<{ contributor: Contributor; metricsHistory: ContributorMetrics[] }>(
        `/api/contributors/project/${projectId}/${username}`,
        { accessToken }
      ),
  },

  // Tiers
  tiers: {
    get: (projectId: string, accessToken?: string) =>
      request<{ tierConfig: Project["tierConfig"] }>(
        `/api/tiers/project/${projectId}`,
        { accessToken }
      ),

    getMembers: (projectId: string, tierName: string, accessToken?: string) =>
      request<{ members: Contributor[] }>(
        `/api/tiers/project/${projectId}/${encodeURIComponent(tierName)}/members`,
        { accessToken }
      ),

    assign: (
      projectId: string,
      githubUsername: string,
      tier: string,
      accessToken: string
    ) =>
      request<{ contributor: Contributor }>(
        `/api/tiers/project/${projectId}/assign`,
        {
          method: "POST",
          body: JSON.stringify({ githubUsername, tier }),
          accessToken,
        }
      ),

    remove: (projectId: string, username: string, accessToken: string) =>
      request<{ success: boolean }>(
        `/api/tiers/project/${projectId}/assign/${username}`,
        {
          method: "DELETE",
          accessToken,
        }
      ),

    summary: (projectId: string, accessToken?: string) =>
      request<{
        projectId: string;
        tiers: {
          name: string;
          revenueShare: number;
          splitMethod: string;
          memberCount: number;
          claimedCount: number;
        }[];
        treasuryShare: number;
      }>(`/api/tiers/project/${projectId}/summary`, { accessToken }),
  },

  // Claims
  claims: {
    claim: (accessToken: string, githubToken: string, walletAddress: string) =>
      request<{ success: boolean; message: string; claim: { githubUsername: string; githubId: number; walletAddress: string; claimedAt: string; projectsCount: number } }>("/api/claims", {
        method: "POST",
        accessToken,
        githubToken,
        body: JSON.stringify({ walletAddress }),
      }),

    me: (accessToken: string) =>
      request<{ assignments: { project: Project; tier: string }[] }>(
        "/api/claims/me",
        { accessToken }
      ),

    check: (username: string) =>
      request<{ hasContributions: boolean; projects: string[] }>(
        `/api/claims/check/${username}`
      ),
  },

  // Streams
  streams: {
    status: (projectId: string, accessToken: string) =>
      request<StreamStatus>(`/api/streams/project/${projectId}`, {
        accessToken,
      }),

    revenue: (projectId: string) =>
      request<{ revenueEvents: RevenueEvent[] }>(
        `/api/streams/project/${projectId}/revenue`
      ),

    create: (projectId: string, accessToken: string) =>
      request<{ sessionId: string }>(`/api/streams/project/${projectId}/create`, {
        method: "POST",
        accessToken,
      }),

    connectionStatus: () =>
      request<{ connected: boolean; sessionId?: string }>("/api/streams/status"),
  },

  // GitHub
  github: {
    authUrl: (returnUrl?: string) => {
      const params = new URLSearchParams();
      if (returnUrl) params.set("returnUrl", returnUrl);
      return `${API_BASE_URL}/api/github/auth?${params.toString()}`;
    },

    repos: (githubToken: string) =>
      request<{ repos: GitHubRepo[] }>("/api/github/repos", { githubToken }),

    branches: (owner: string, repo: string, githubToken: string) =>
      request<{ branches: { name: string; protected: boolean }[] }>(
        `/api/github/repos/${owner}/${repo}/branches`,
        { githubToken }
      ),

    user: (githubToken: string) =>
      request<{ user: { login: string; id: number; avatar_url: string; name?: string } }>(
        "/api/github/user",
        { githubToken }
      ),
  },
};
