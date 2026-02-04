export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    id: number;
  };
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface BlameRange {
  author: string;
  authorEmail: string;
  startLine: number;
  endLine: number;
  lineCount: number;
}

export interface ContributorActivity {
  githubUsername: string;
  email?: string;
  metrics: {
    linesOfCode: number;
    commits: number;
    filesModified: number;
    firstContribution: Date;
    lastContribution: Date;
  };
  suggestedTier: "core" | "active" | "community" | "new";
}

export interface GitHubOAuthTokens {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface GitHubSession {
  state: string;
  walletAddress?: string;
  returnUrl?: string;
  createdAt: Date;
}
