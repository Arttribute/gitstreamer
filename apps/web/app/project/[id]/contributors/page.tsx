"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import {
  ArrowLeft,
  RefreshCw,
  Users,
  GitCommit,
  FileCode,
  Calendar,
  CheckCircle,
  Loader2,
  GitBranch,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api, Project, ContributorWithMetrics, TierConfig } from "@/lib/api";

export default function ContributorsPage() {
  const params = useParams();
  const { getAccessToken } = usePrivy();
  const { address } = useAccount();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [contributors, setContributors] = useState<ContributorWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assigningTier, setAssigningTier] = useState<string | null>(null);
  const [autoFetching, setAutoFetching] = useState(false);
  const [githubUser, setGithubUser] = useState<{ login: string; avatar_url: string } | null>(null);
  const [loadingGithubUser, setLoadingGithubUser] = useState(true);

  const isOwner = project?.ownerAddress.toLowerCase() === address?.toLowerCase();

  // Get GitHub token from localStorage or URL params
  const getGithubToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("github_token") || "";
    }
    return "";
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const accessToken = await getAccessToken();
        const [projectRes, contributorsRes] = await Promise.all([
          api.projects.get(projectId, accessToken || undefined),
          api.contributors.list(projectId, accessToken || undefined),
        ]);
        setProject(projectRes.project);
        setContributors(contributorsRes.contributors);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Handle GitHub OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("github_token");
    if (token) {
      // Save immediately to localStorage
      localStorage.setItem("github_token", token);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      // Reload to fetch contributors
      window.location.reload();
    }
  }, []);

  // Fetch GitHub user info if token exists
  useEffect(() => {
    async function fetchGithubUser() {
      setLoadingGithubUser(true);
      const token = localStorage.getItem("github_token");
      if (!token) {
        setGithubUser(null);
        setLoadingGithubUser(false);
        return;
      }

      try {
        const data = await api.github.user(token);
        setGithubUser(data.user);
      } catch (err) {
        // Token might be expired
        console.warn("GitHub token expired or invalid");
        localStorage.removeItem("github_token");
        setGithubUser(null);
      } finally {
        setLoadingGithubUser(false);
      }
    }

    fetchGithubUser();
  }, []);

  // Auto-fetch contributors if empty (only for project owners)
  useEffect(() => {
    async function autoFetchContributors() {
      if (!isOwner || !project || contributors.length > 0 || autoFetching || refreshing) {
        return;
      }

      const githubToken = localStorage.getItem("github_token");
      if (!githubToken) {
        return;
      }

      setAutoFetching(true);
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) return;

        const result = await api.contributors.refresh(projectId, accessToken, githubToken);
        setContributors(result.contributors);
      } catch (err) {
        console.warn("Auto-fetch contributors failed:", err);
        // Don't show error to user, let them manually refresh if needed
      } finally {
        setAutoFetching(false);
      }
    }

    autoFetchContributors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, project, contributors.length, autoFetching, refreshing, projectId]);

  const handleRefresh = async () => {
    if (!isOwner) return;

    const githubToken = getGithubToken();
    if (!githubToken) {
      // Don't show error, the banner will guide them to connect
      return;
    }

    setRefreshing(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const result = await api.contributors.refresh(projectId, accessToken, githubToken);
      setContributors(result.contributors);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh contributors");
    } finally {
      setRefreshing(false);
    }
  };

  const handleAssignTier = async (username: string, tier: string) => {
    if (!isOwner) return;

    setAssigningTier(username);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      if (tier === "") {
        await api.tiers.remove(projectId, username, accessToken);
      } else {
        await api.tiers.assign(projectId, username, tier, accessToken);
      }

      // Update local state
      setContributors((prev) =>
        prev.map((c) =>
          c.githubUsername === username
            ? { ...c, tier: tier || undefined }
            : c
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign tier");
    } finally {
      setAssigningTier(null);
    }
  };

  const handleConnectGitHub = () => {
    const authUrl = api.github.authUrl(`${window.location.origin}/project/${projectId}/contributors`);
    window.location.href = authUrl;
  };

  const handleDisconnectGitHub = () => {
    localStorage.removeItem("github_token");
    setGithubUser(null);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-8 h-8 w-64" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-500">{error || "Project not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tierOptions = [
    { value: "", label: "Unassigned" },
    ...project.tierConfig.tiers.map((t) => ({
      value: t.name,
      label: `${t.name} (${t.revenueShare}%)`,
    })),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/project/${projectId}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Contributors</h1>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              {project.repoOwner}/{project.repoName}
            </p>
          </div>
          {isOwner && (
            <Button onClick={handleRefresh} disabled={refreshing} className="gap-2">
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh from GitHub
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* GitHub Connection Status */}
      {isOwner && !loadingGithubUser && (
        <div className="mb-6">
          {githubUser ? (
            <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex items-center gap-3">
                    <img
                      src={githubUser.avatar_url}
                      alt={githubUser.login}
                      className="h-8 w-8 rounded-full"
                    />
                    <div>
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">
                        GitHub Connected
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        @{githubUser.login}
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnectGitHub}
                  className="text-green-700 hover:text-green-900 dark:text-green-400 dark:hover:text-green-100"
                >
                  Disconnect
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/20">
              <CardContent className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-medium text-yellow-900 dark:text-yellow-100">
                      GitHub Not Connected
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                      Connect GitHub to fetch and refresh contributors
                    </p>
                  </div>
                </div>
                <Button onClick={handleConnectGitHub} className="ml-4 gap-2">
                  <GitBranch className="h-4 w-4" />
                  Connect GitHub
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tier summary */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {project.tierConfig.tiers.map((tier) => {
          const count = contributors.filter((c) => c.tier === tier.name).length;
          return (
            <Card key={tier.name}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{tier.name}</span>
                  <Badge>{tier.revenueShare}%</Badge>
                </div>
                <p className="mt-2 text-2xl font-bold">{count}</p>
                <p className="text-sm text-zinc-500">contributors</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Contributors list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Contributors ({contributors.length})
          </CardTitle>
          <CardDescription>
            Git metrics are advisory. Assign tiers based on role and commitment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contributors.length === 0 ? (
            <div className="py-8 text-center">
              {autoFetching ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-zinc-300" />
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      Analyzing repository...
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Fetching contributor data from GitHub
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Users className="mx-auto h-12 w-12 text-zinc-300" />
                  <p className="mt-4 text-zinc-500">No contributors found</p>
                  {isOwner && (
                    <Button onClick={handleRefresh} className="mt-4 gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Analyze Repository
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {contributors.map((contributor) => (
                <div
                  key={contributor._id}
                  className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <img
                        src={`https://github.com/${contributor.githubUsername}.png`}
                        alt={contributor.githubUsername}
                        className="h-12 w-12 rounded-full"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{contributor.githubUsername}</p>
                          {contributor.walletAddress && (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Claimed
                            </Badge>
                          )}
                        </div>
                        {contributor.latestMetrics && (
                          <div className="mt-1 flex flex-wrap gap-3 text-sm text-zinc-500">
                            <span className="flex items-center gap-1">
                              <GitCommit className="h-3 w-3" />
                              {contributor.latestMetrics.metrics.commits} commits
                            </span>
                            <span className="flex items-center gap-1">
                              <FileCode className="h-3 w-3" />
                              {contributor.latestMetrics.metrics.linesOfCode.toLocaleString()} lines
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Last:{" "}
                              {new Date(
                                contributor.latestMetrics.metrics.lastContribution
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {contributor.latestMetrics?.suggestedTier && (
                          <p className="mt-1 text-sm text-zinc-400">
                            Suggested: {contributor.latestMetrics.suggestedTier}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isOwner ? (
                        <div className="w-48">
                          <Select
                            options={tierOptions}
                            value={contributor.tier || ""}
                            onChange={(e) =>
                              handleAssignTier(contributor.githubUsername, e.target.value)
                            }
                            disabled={assigningTier === contributor.githubUsername}
                          />
                        </div>
                      ) : (
                        <Badge variant={contributor.tier ? "default" : "outline"}>
                          {contributor.tier || "Unassigned"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
