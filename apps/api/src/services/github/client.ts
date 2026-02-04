import { Octokit } from "@octokit/rest";
import type { GitHubRepository, GitHubBranch, ContributorActivity } from "./types.js";

export function createOctokitClient(accessToken: string): Octokit {
  return new Octokit({
    auth: accessToken,
  });
}

export async function listUserRepos(octokit: Octokit): Promise<GitHubRepository[]> {
  const repos: GitHubRepository[] = [];

  for await (const response of octokit.paginate.iterator(octokit.repos.listForAuthenticatedUser, {
    per_page: 100,
    sort: "updated",
    direction: "desc",
  })) {
    repos.push(...(response.data as GitHubRepository[]));
  }

  return repos;
}

export async function getRepository(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<GitHubRepository> {
  const { data } = await octokit.repos.get({ owner, repo });
  return data as GitHubRepository;
}

export async function listBranches(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<GitHubBranch[]> {
  const branches: GitHubBranch[] = [];

  for await (const response of octokit.paginate.iterator(octokit.repos.listBranches, {
    owner,
    repo,
    per_page: 100,
  })) {
    branches.push(...(response.data as GitHubBranch[]));
  }

  return branches;
}

export async function getContributorStats(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<ContributorActivity[]> {
  // Get contributor stats from GitHub API
  const { data: stats } = await octokit.repos.getContributorsStats({ owner, repo });

  if (!stats || !Array.isArray(stats)) {
    return [];
  }

  const activities: ContributorActivity[] = stats.map((stat) => {
    const weeks = stat.weeks || [];
    let totalAdditions = 0;
    let totalDeletions = 0;
    let firstWeek: number | null = null;
    let lastWeek: number | null = null;

    for (const week of weeks) {
      totalAdditions += week.a || 0;
      totalDeletions += week.d || 0;

      if ((week.a || 0) > 0 || (week.d || 0) > 0 || (week.c || 0) > 0) {
        if (firstWeek === null) {
          firstWeek = week.w || 0;
        }
        lastWeek = week.w || 0;
      }
    }

    const linesOfCode = totalAdditions + totalDeletions;
    const commits = stat.total || 0;

    // Determine suggested tier based on activity
    let suggestedTier: "core" | "active" | "community" | "new";
    if (commits >= 100 || linesOfCode >= 10000) {
      suggestedTier = "core";
    } else if (commits >= 20 || linesOfCode >= 2000) {
      suggestedTier = "active";
    } else if (commits >= 5 || linesOfCode >= 500) {
      suggestedTier = "community";
    } else {
      suggestedTier = "new";
    }

    return {
      githubUsername: stat.author?.login || "unknown",
      metrics: {
        linesOfCode,
        commits,
        filesModified: 0, // Not available from this endpoint
        firstContribution: firstWeek ? new Date(firstWeek * 1000) : new Date(),
        lastContribution: lastWeek ? new Date(lastWeek * 1000) : new Date(),
      },
      suggestedTier,
    };
  });

  // Sort by lines of code (descending)
  activities.sort((a, b) => b.metrics.linesOfCode - a.metrics.linesOfCode);

  return activities;
}

export async function getLatestCommitSha(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string
): Promise<string> {
  const { data } = await octokit.repos.getBranch({ owner, repo, branch });
  return data.commit.sha;
}
