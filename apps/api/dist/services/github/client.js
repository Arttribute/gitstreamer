import { Octokit } from "@octokit/rest";
export function createOctokitClient(accessToken) {
    return new Octokit({
        auth: accessToken,
    });
}
export async function listUserRepos(octokit) {
    const repos = [];
    for await (const response of octokit.paginate.iterator(octokit.repos.listForAuthenticatedUser, {
        per_page: 100,
        sort: "updated",
        direction: "desc",
    })) {
        repos.push(...response.data);
    }
    return repos;
}
export async function getRepository(octokit, owner, repo) {
    const { data } = await octokit.repos.get({ owner, repo });
    return data;
}
export async function listBranches(octokit, owner, repo) {
    const branches = [];
    for await (const response of octokit.paginate.iterator(octokit.repos.listBranches, {
        owner,
        repo,
        per_page: 100,
    })) {
        branches.push(...response.data);
    }
    return branches;
}
export async function getContributorStats(octokit, owner, repo) {
    // Get contributor stats from GitHub API
    const { data: stats } = await octokit.repos.getContributorsStats({ owner, repo });
    if (!stats || !Array.isArray(stats)) {
        return [];
    }
    const activities = stats.map((stat) => {
        const weeks = stat.weeks || [];
        let totalAdditions = 0;
        let totalDeletions = 0;
        let firstWeek = null;
        let lastWeek = null;
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
        let suggestedTier;
        if (commits >= 100 || linesOfCode >= 10000) {
            suggestedTier = "core";
        }
        else if (commits >= 20 || linesOfCode >= 2000) {
            suggestedTier = "active";
        }
        else if (commits >= 5 || linesOfCode >= 500) {
            suggestedTier = "community";
        }
        else {
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
export async function getLatestCommitSha(octokit, owner, repo, branch) {
    const { data } = await octokit.repos.getBranch({ owner, repo, branch });
    return data.commit.sha;
}
